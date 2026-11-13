"""Energy and cost sensors per selected label: today, this week, this month and this year.

The sensors are created for the labels that are selected in the settings (one set of four per label)
and removed when a label is deselected, without reloading the entry. The energy is the power of the
sensors that carry the label (like the Labels card of the panel), integrated over time. The cost is
added up step by step with the price of Tariffy that is valid at that moment, so a change of the unit
price never changes what was already counted. The periods follow the time zone of Home Assistant.
"""

from __future__ import annotations

import math
from collections.abc import Callable
from datetime import datetime, time, timedelta
from fnmatch import fnmatchcase
from typing import Any

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorStateClass,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import STATE_UNAVAILABLE, STATE_UNKNOWN, UnitOfEnergy
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import label_registry as lr
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.event import (
    async_track_state_change_event,
    async_track_time_interval,
)
from homeassistant.helpers.restore_state import RestoreEntity
from homeassistant.util import dt as dt_util

from .const import (
    CONF_DEVICE_EXCLUDE,
    CONF_DEVICE_EXCLUDE_PATTERNS,
    DOMAIN,
    SYSTEM_KEYS,
)
from .providers import tariffy
from .settings import as_list, clean_ids, clean_label_tariffs

PERIODS = ("day", "week", "month", "year")
COST = "cost_"  # prefix of the period in the unique id of a cost sensor
# Unit of a power sensor -> factor to kW. Other units are ignored.
_TO_KW = {"W": 0.001, "kW": 1.0}
_TICK = timedelta(minutes=1)

# Protection against bad values. The counters only ever grow within a period, so one wrong value
# would stay in the sum until the period ends; implausible input is therefore not taken over.
MAX_SENSOR_KW = 100.0  # a single power sensor above this is a glitch, not a load
MAX_GAP = timedelta(
    minutes=5
)  # a longer pause (restart, blocked loop, clock jump) is not integrated
MAX_PRICE = 10.0  # currency per kWh; above (or negative) the reading is ignored
MAX_RESTORED = (
    1_000_000.0  # a stored counter above this (kWh or currency) is not trusted
)


def _finite(value: float) -> bool:
    return not (math.isnan(value) or math.isinf(value))


def period_start(now: datetime, period: str) -> datetime:
    """Start of the running day, week (Monday), month or year in the time zone of `now`."""
    day = now.date()
    if period == "week":
        day -= timedelta(days=day.weekday())
    elif period == "month":
        day = day.replace(day=1)
    elif period == "year":
        day = day.replace(month=1, day=1)
    return datetime.combine(day, time.min, tzinfo=now.tzinfo)


def unique_id(entry_id: str, label_id: str, period: str) -> str:
    """Unique id of the sensor of a label and period."""
    return f"{entry_id}_label_{label_id}_{period}"


def _selected(entry: ConfigEntry) -> list[str]:
    return clean_ids({**entry.data, **entry.options}.get("label_ids"))


def _chosen_tariff(entry: ConfigEntry, label_id: str) -> str | None:
    """The Tariffy price sensor the user chose for the label, if any."""
    config = {**entry.data, **entry.options}
    return clean_label_tariffs(config.get("label_tariffs")).get(label_id)


def _excluded(entry: ConfigEntry) -> Callable[[str], bool]:
    """Sensors that never count for a label: balance sensors and the excluded ones."""
    config = {**entry.data, **entry.options}
    skip = {s for key in SYSTEM_KEYS for s in as_list(config.get(key))}
    skip |= set(as_list(config.get(CONF_DEVICE_EXCLUDE)))
    patterns = as_list(config.get(CONF_DEVICE_EXCLUDE_PATTERNS))

    def excluded(entity_id: str) -> bool:
        if entity_id in skip:
            return True
        short = entity_id.split(".", 1)[1]
        return any(fnmatchcase(entity_id if "." in p else short, p) for p in patterns)

    return excluded


class LabelEnergy:
    """Integrates the power of the sensors of one label into four period counters."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry, label_id: str) -> None:
        self.hass = hass
        self.entry = entry
        self.label_id = label_id
        self.members: set[str] = set()
        self.powers: dict[str, float] = {}  # kW per member
        self.last = dt_util.now()
        self.values = dict.fromkeys(PERIODS, 0.0)
        self.costs = dict.fromkeys(PERIODS, 0.0)
        self.price: float | None = None  # last known unit price per kWh
        self.currency: str | None = None
        self._price_entity: str | None = None
        self._unsub_price: Callable[[], None] | None = None
        self.starts = {p: period_start(self.last, p) for p in PERIODS}
        self._sensors: list[LabelEnergySensor] = []
        self._unsubs: list[Callable[[], None]] = []
        self._unsub_state: Callable[[], None] | None = None

    # -- members -----------------------------------------------------------------

    def _price_entity_id(self) -> str | None:
        """The price sensor of the label: the chosen contract, else the first electricity contract.

        A chosen contract is never replaced by another one: a heat pump tariff must not be costed
        with the household tariff.
        """
        if chosen := _chosen_tariff(self.entry, self.label_id):
            return chosen
        offer = tariffy(self.hass)
        return offer["price"] if offer else None

    def _read_price(self) -> tuple[float, str] | None:
        """Unit price and currency of Tariffy: the live price of a dynamic tariff, else the state."""
        entity_id = self._price_entity_id()
        state = self.hass.states.get(entity_id) if entity_id else None
        if state is None:
            return None
        for raw in (state.attributes.get("arbeitspreis_aktuell"), state.state):
            try:
                value = float(raw)
            except (TypeError, ValueError):
                continue
            if _finite(value) and 0 <= value <= MAX_PRICE:
                unit = str(state.attributes.get("unit_of_measurement") or "")
                return value, unit.split("/")[0] or self.hass.config.currency
        return None

    def _refresh_price(self) -> None:
        """Take the current price (keep the last one while the source has none) and watch it."""
        entity_id = self._price_entity_id()
        if entity_id != self._price_entity:
            if self._unsub_price:
                self._unsub_price()
                self._unsub_price = None
            self._price_entity = entity_id
            if entity_id:
                self._unsub_price = async_track_state_change_event(
                    self.hass, [entity_id], self._on_price
                )
        if (found := self._read_price()) is not None:
            self.price, self.currency = found
        elif (
            entity_id
            and _chosen_tariff(self.entry, self.label_id)
            and (self.hass.states.get(entity_id) is None)
        ):
            self.price = None  # the chosen contract is gone: no cost rather than the wrong tariff

    def _find_members(self) -> set[str]:
        """Power sensors (W or kW) of the entity registry that carry the label."""
        excluded = _excluded(self.entry)
        devices = dr.async_get(self.hass)
        found: set[str] = set()
        for reg in er.async_get(self.hass).entities.values():
            if reg.domain != "sensor" or reg.disabled:
                continue
            labels = set(reg.labels)
            if reg.device_id and (device := devices.async_get(reg.device_id)):
                labels |= set(device.labels)
            if self.label_id not in labels:
                continue
            state = self.hass.states.get(reg.entity_id)
            if (
                state is not None
                and state.attributes.get("device_class") == "power"
                and not excluded(reg.entity_id)
            ):
                found.add(reg.entity_id)
        return found

    def _power(self, entity_id: str, previous: float = 0.0) -> float:
        """Current power of a sensor in kW.

        A sensor that is gone, unavailable or unknown counts as 0 (the device is off or offline).
        A value that cannot be right (text, NaN, infinity, negative, above MAX_SENSOR_KW) is not
        taken over: the previous value stays until the sensor reports a sane one.
        """
        state = self.hass.states.get(entity_id)
        if state is None or state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
            return 0.0
        factor = _TO_KW.get(state.attributes.get("unit_of_measurement", ""))
        if factor is None:
            return 0.0
        try:
            value = float(state.state) * factor
        except ValueError:
            return previous
        if not _finite(value) or value < 0 or value > MAX_SENSOR_KW:
            return previous
        return value

    def _refresh_members(self) -> None:
        members = self._find_members()
        if members != self.members:
            self.members = members
            if self._unsub_state:
                self._unsub_state()
            self._unsub_state = (
                async_track_state_change_event(
                    self.hass, sorted(members), self._on_state
                )
                if members
                else None
            )
        self.powers = {m: self._power(m, self.powers.get(m, 0.0)) for m in self.members}

    # -- integration -------------------------------------------------------------

    def _integrate(self, now: datetime) -> None:
        """Add the energy since the last call with the power that was valid until now.

        Nothing is added when time stood still or went backwards, or when the pause was longer than
        MAX_GAP (Home Assistant was stopped or blocked): the power during a pause is unknown.
        """
        gap = now - self.last
        total_kw = sum(self.powers.values())
        if gap <= timedelta(0) or gap > MAX_GAP:
            total_kw = 0.0
        for period in PERIODS:
            start = period_start(now, period)
            if start > self.starts[period]:  # a new period began
                self.values[period] = 0.0
                self.costs[period] = 0.0
                self.starts[period] = start
            since = max(self.last, start)
            if now > since:
                kwh = total_kw * (now - since).total_seconds() / 3600
                self.values[period] += kwh
                if (
                    self.price is not None
                ):  # the price that was valid during the interval
                    self.costs[period] += kwh * self.price
        self.last = now

    @callback
    def _on_state(self, event: Event) -> None:
        """A member changed: close the interval with the old power, then take the new one."""
        self._integrate(dt_util.now())
        entity_id = event.data["entity_id"]
        self.powers[entity_id] = self._power(entity_id, self.powers.get(entity_id, 0.0))

    @callback
    def options_changed(self) -> None:
        """The settings changed (maybe the tariff of the label): close the interval, then switch."""
        self._integrate(dt_util.now())
        self._refresh_price()

    @callback
    def _on_price(self, _event: Event) -> None:
        """The price changes: close the interval with the old price first."""
        self._integrate(dt_util.now())
        self._refresh_price()

    @callback
    def _tick(self, _now: datetime) -> None:
        self._integrate(dt_util.now())
        self._refresh_members()
        self._refresh_price()
        for sensor in self._sensors:
            sensor.async_write_ha_state()

    # -- lifetime ----------------------------------------------------------------

    def restore(
        self, period: str, value: float, start: datetime, *, cost: bool = False
    ) -> None:
        """Take over a stored value when it belongs to the running period and is plausible."""
        if (
            start == self.starts[period]
            and _finite(value)
            and 0 <= value <= MAX_RESTORED
        ):
            target = self.costs if cost else self.values
            target[period] = max(target[period], value)

    def add_sensor(self, sensor: LabelEnergySensor) -> None:
        self._sensors.append(sensor)

    @callback
    def start(self) -> None:
        self.last = dt_util.now()
        self._refresh_members()
        self._refresh_price()
        self._unsubs.append(async_track_time_interval(self.hass, self._tick, _TICK))

    @callback
    def stop(self) -> None:
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()
        if self._unsub_state:
            self._unsub_state()
            self._unsub_state = None
        if self._unsub_price:
            self._unsub_price()
            self._unsub_price = None


class LabelEnergySensor(SensorEntity, RestoreEntity):
    """Energy of a label in kWh for one period."""

    _attr_has_entity_name = True
    _attr_device_class = SensorDeviceClass.ENERGY
    _attr_native_unit_of_measurement = UnitOfEnergy.KILO_WATT_HOUR
    _attr_state_class = SensorStateClass.TOTAL
    _attr_suggested_display_precision = 2
    _attr_should_poll = False
    _cost = False

    def __init__(
        self, entry: ConfigEntry, tracker: LabelEnergy, label_name: str, period: str
    ) -> None:
        self._tracker = tracker
        self._period = period
        prefix = COST if self._cost else ""
        self._attr_unique_id = unique_id(
            entry.entry_id, tracker.label_id, prefix + period
        )
        kind = "cost" if self._cost else "energy"
        self._attr_translation_key = f"label_{kind}_{period}"
        self._attr_translation_placeholders = {"label": label_name}
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name="Energy Assistant",
            entry_type=dr.DeviceEntryType.SERVICE,
        )
        tracker.add_sensor(self)

    @property
    def native_value(self) -> float:
        return round(self._tracker.values[self._period], 4)

    @property
    def last_reset(self) -> datetime:
        return self._tracker.starts[self._period]

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return {
            "label_id": self._tracker.label_id,
            "period_start": self._tracker.starts[self._period].isoformat(),
            "sensors": sorted(self._tracker.members),
        }

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        last = await self.async_get_last_state()
        if last is None:
            return
        try:
            value = float(last.state)
            start = datetime.fromisoformat(last.attributes["period_start"])
        except (KeyError, TypeError, ValueError):
            return
        self._tracker.restore(self._period, value, start, cost=self._cost)


class LabelCostSensor(LabelEnergySensor):
    """Cost of a label for one period: every step is priced with the unit price of that moment."""

    _attr_device_class = SensorDeviceClass.MONETARY
    _attr_suggested_display_precision = 2
    _cost = True

    def __init__(
        self, entry: ConfigEntry, tracker: LabelEnergy, label_name: str, period: str
    ) -> None:
        super().__init__(entry, tracker, label_name, period)
        self._attr_native_unit_of_measurement = (
            tracker.currency or tracker.hass.config.currency
        )

    @property
    def native_value(self) -> float:
        return round(self._tracker.costs[self._period], 4)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return {
            "label_id": self._tracker.label_id,
            "period_start": self._tracker.starts[self._period].isoformat(),
            "price": self._tracker.price,  # the unit price per kWh that is used now
        }


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    """Create the sensors of the selected labels and keep them in line with the selection."""
    trackers: dict[str, LabelEnergy] = {}
    with_cost: set[str] = set()  # labels that already have their cost sensors

    def label_name(label_id: str) -> str:
        label = lr.async_get(hass).async_get_label(label_id)
        return label.name if label else label_id

    @callback
    def sync(*_: Any) -> None:
        wanted = _selected(entry)
        # Only labels that exist; a deleted label would give a sensor without a name.
        wanted = [i for i in wanted if lr.async_get(hass).async_get_label(i)]
        for tracker in trackers.values():
            tracker.options_changed()
        entities: list[LabelEnergySensor] = []
        for label_id in wanted:
            if label_id not in trackers:
                tracker = LabelEnergy(hass, entry, label_id)
                trackers[label_id] = tracker
                name = label_name(label_id)
                entities += [
                    LabelEnergySensor(entry, tracker, name, period)
                    for period in PERIODS
                ]
                tracker.start()
            tracker = trackers[label_id]
            # Cost sensors need a price, so they appear once Tariffy offers one.
            if label_id not in with_cost and tracker.price is not None:
                with_cost.add(label_id)
                name = label_name(label_id)
                entities += [
                    LabelCostSensor(entry, tracker, name, period) for period in PERIODS
                ]
        if entities:
            async_add_entities(entities)
        registry = er.async_get(hass)
        for label_id in [i for i in trackers if i not in wanted]:
            trackers.pop(label_id).stop()
            with_cost.discard(label_id)
            for period in PERIODS:
                for prefix in ("", COST):
                    uid = unique_id(entry.entry_id, label_id, prefix + period)
                    if entity_id := registry.async_get_entity_id("sensor", DOMAIN, uid):
                        registry.async_remove(entity_id)

    async def _updated(hass_: HomeAssistant, entry_: ConfigEntry) -> None:
        sync()

    sync()
    entry.async_on_unload(entry.add_update_listener(_updated))
    # A price source (Tariffy) may be set up later: look again now and then.
    entry.async_on_unload(async_track_time_interval(hass, sync, timedelta(minutes=5)))
    entry.async_on_unload(lambda: [t.stop() for t in trackers.values()])
