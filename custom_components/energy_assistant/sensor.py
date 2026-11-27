"""Energy and cost sensors: one running total per selected label, area and device cost.

The sensors are created for what is selected in the settings and removed when it is deselected, without
reloading the entry: an energy total for each label and area, a cost total for each label, area and device. The
energy is the power of the sensors that carry the label or sit in the area (like the cards of the panel),
integrated over time. The cost is added up step by step with the price of Tariffy that is valid at that moment, so
a change of the unit price never changes what was already counted. Own solar power is not priced at the grid
price: the unit price of a moment is the price of the grid weighted with the share the grid delivers of the
consumption, plus the feed-in tariff (what is lost by using it) for the rest (see mix.py). The totals never go back
to 0: day, week, month and year are worked out by the panel from the long-term statistics. The sensors of the
earlier versions (one for each day, week, month and year, and the energy of the devices) are removed.
"""

from __future__ import annotations

import math
import re
from collections.abc import Callable
from datetime import datetime, timedelta
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
from homeassistant.helpers import area_registry as ar
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
    CONF_COST_GRID_ONLY,
    CONF_DEVICE_EXCLUDE,
    CONF_DEVICE_EXCLUDE_PATTERNS,
    DOMAIN,
    SYSTEM_KEYS,
)
from .mix import grid_share, watched
from .providers import tariffy
from .settings import (
    as_list,
    clean_device_tariffs,
    clean_ids,
    clean_label_tariffs,
    clean_names,
    normalize,
)

# The periods of the sensors of the earlier versions (their unique ids are looked up to remove them)
LEGACY_PERIODS = ("day", "week", "month", "year")
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


KINDS = ("label", "area", "device")


ENERGY_KINDS = (
    "label",
    "area",
)  # the kinds that get an energy total (a device only gets a cost total)
ENERGY = "energy_total"
COST = "cost_total"


def unique_id(entry_id: str, group_id: str, what: str, kind: str = "label") -> str:
    """Unique id of the energy total (`ENERGY`) or the cost total (`COST`) of a label, area or device."""
    return f"{entry_id}_{kind}_{group_id}_{what}"


def legacy_unique_ids(entry_id: str, group_id: str, kind: str = "label") -> list[str]:
    """The unique ids of the sensors of the earlier versions: energy and cost for each day, week, month and year."""
    return [
        f"{entry_id}_{kind}_{group_id}_{prefix}{period}"
        for prefix in ("", "cost_")
        for period in LEGACY_PERIODS
    ]


def _selected(entry: ConfigEntry, kind: str = "label") -> list[str]:
    return clean_ids({**entry.data, **entry.options}.get(f"{kind}_ids"))


def _chosen_tariff(
    entry: ConfigEntry, group_id: str, kind: str = "label"
) -> str | None:
    """The Tariffy price sensor the user chose for the label (or area), if any."""
    config = {**entry.data, **entry.options}
    clean = clean_device_tariffs if kind == "device" else clean_label_tariffs
    return clean(config.get(f"{kind}_tariffs")).get(group_id)


def strip_power(name: str) -> str:
    """A device name without the word that only says it is the power sensor ("Backofen Leistung" -> "Backofen")."""
    short = re.sub(
        r"[\s_-]*(wirkleistung|leistung|power)\s*$", "", name, flags=re.IGNORECASE
    ).strip()
    return short or name


def device_display_name(hass: HomeAssistant, entry: ConfigEntry, entity_id: str) -> str:
    """The one name of a device (panel and sensors): the display name, else the sensor's name without "Leistung"."""
    config = {**entry.data, **entry.options}
    if own := clean_names(config.get("device_names")).get(entity_id):
        return own
    state = hass.states.get(entity_id)
    friendly = state.attributes.get("friendly_name") if state else None
    return strip_power(str(friendly or entity_id.split(".", 1)[-1].replace("_", " ")))


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


class GroupEnergy:
    """Integrates the power of the sensors of one label, area or device into a running energy total and a cost total."""

    def __init__(
        self,
        hass: HomeAssistant,
        entry: ConfigEntry,
        group_id: str,
        kind: str = "label",
    ) -> None:
        self.hass = hass
        self.entry = entry
        self.kind = kind
        self.group_id = group_id
        self.members: set[str] = set()
        self.powers: dict[str, float] = {}  # kW per member
        self.last = dt_util.now()
        self.kwh = 0.0  # running total of the energy
        self.cost = 0.0  # running total of the cost
        self.price: float | None = None  # last known unit price per kWh
        self.currency: str | None = None
        # What the grid delivers of the consumption (0 to 1) and the feed-in tariff: together they make the unit
        # price of a moment. Unknown means the grid price, as before.
        self.share: float | None = None
        self.feed_in: float | None = None
        self.grid_only = False  # setting: price everything at the grid price
        self._mix_watched: tuple[str, ...] = ()
        self._unsub_mix: Callable[[], None] | None = None
        self._price_entity: str | None = None
        self._unsub_price: Callable[[], None] | None = None
        self._sensors: list[GroupEnergySensor] = []
        self._unsubs: list[Callable[[], None]] = []
        self._unsub_state: Callable[[], None] | None = None

    # -- members -----------------------------------------------------------------

    def _price_entity_id(self) -> str | None:
        """The price sensor of the label: the chosen contract, else the first electricity contract.

        A chosen contract is never replaced by another one: a heat pump tariff must not be costed
        with the household tariff.
        """
        if chosen := _chosen_tariff(self.entry, self.group_id, self.kind):
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
            and _chosen_tariff(self.entry, self.group_id, self.kind)
            and (self.hass.states.get(entity_id) is None)
        ):
            self.price = None  # the chosen contract is gone: no cost rather than the wrong tariff

    def _options(self) -> dict[str, Any]:
        return normalize({**self.entry.data, **self.entry.options})

    def _feed_in_entity(self) -> str | None:
        offer = tariffy(self.hass)
        return offer.get("feed_in") if offer else None

    def _read_feed_in(self) -> float | None:
        """The feed-in tariff of Tariffy per kWh; None when there is none or it cannot be read."""
        entity_id = self._feed_in_entity()
        state = self.hass.states.get(entity_id) if entity_id else None
        if state is None:
            return None
        try:
            value = float(state.state)
        except ValueError:
            return None
        return value if _finite(value) and 0 <= value <= MAX_PRICE else None

    def unit_price(self) -> float | None:
        """The price of a kWh now: the grid price for the share the grid delivers, the feed-in tariff (what is lost by
        using the own solar power instead of feeding it in) for the rest. Without a feed-in tariff the own power
        costs nothing. An unknown share (no usable sensors) never lowers the price: it stays the grid price,
        as does the setting that prices everything at the grid price."""
        if self.price is None:
            return None
        if self.share is None or self.grid_only:
            return self.price
        return self.price * self.share + (self.feed_in or 0.0) * (1.0 - self.share)

    def _refresh_mix(self) -> None:
        """Take the share the grid delivers and the feed-in tariff, and watch the sensors they depend on."""
        options = self._options()
        wanted = tuple(watched(options))
        feed_entity = self._feed_in_entity()
        if feed_entity:
            wanted = tuple(sorted({*wanted, feed_entity}))
        if wanted != self._mix_watched:
            if self._unsub_mix:
                self._unsub_mix()
                self._unsub_mix = None
            self._mix_watched = wanted
            if wanted:
                self._unsub_mix = async_track_state_change_event(
                    self.hass, list(wanted), self._on_mix
                )
        self.grid_only = bool(options.get(CONF_COST_GRID_ONLY))
        self.share = grid_share(self.hass, options)
        if feed_entity is None:
            self.feed_in = None  # no feed-in tariff: the own solar power costs nothing
        elif (found := self._read_feed_in()) is not None:
            self.feed_in = found  # a bad reading keeps the last good one

    def _find_members(self) -> set[str]:
        """Power sensors (W or kW) of the entity registry that carry the label or sit in the area."""
        if self.kind == "device":
            # one chosen sensor; it counts while it exists and is a power sensor, whatever the exclude
            # list says (that list only decides what the device list shows)
            state = self.hass.states.get(self.group_id)
            if state is not None and state.attributes.get("device_class") == "power":
                return {self.group_id}
            return set()
        excluded = _excluded(self.entry)
        devices = dr.async_get(self.hass)
        found: set[str] = set()
        for reg in er.async_get(self.hass).entities.values():
            if reg.domain != "sensor" or reg.disabled:
                continue
            device = devices.async_get(reg.device_id) if reg.device_id else None
            if self.kind == "area":
                # like the panel: the area of the entity, else the one of its device
                area = reg.area_id or (device.area_id if device else None)
                if area != self.group_id:
                    continue
            else:
                labels = set(reg.labels)
                if device:
                    labels |= set(device.labels)
                if self.group_id not in labels:
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
        unit = self.unit_price()  # the price that was valid during the interval
        total_kw = sum(self.powers.values())
        if gap <= timedelta(0) or gap > MAX_GAP:
            total_kw = 0.0
        if total_kw > 0:
            kwh = total_kw * gap.total_seconds() / 3600
            self.kwh += kwh
            if unit is not None:
                self.cost += kwh * unit
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
        self._refresh_mix()

    @callback
    def _on_mix(self, _event: Event) -> None:
        """The balance of the house changed: close the interval with the old share, then take the new one."""
        self._integrate(dt_util.now())
        self._refresh_mix()

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
        self._refresh_mix()
        for sensor in self._sensors:
            sensor.refresh_name()
            sensor.async_write_ha_state()

    # -- lifetime ----------------------------------------------------------------

    def restore(self, value: float, *, cost: bool = False) -> None:
        """Take over a stored total when it is plausible (finite, not negative, not absurdly big); it never shrinks."""
        if _finite(value) and 0 <= value <= MAX_RESTORED:
            if cost:
                self.cost = max(self.cost, value)
            else:
                self.kwh = max(self.kwh, value)

    def display_name(self) -> str:
        """The current name of the label, area or device (it follows renames)."""
        if self.kind == "device":
            return device_display_name(self.hass, self.entry, self.group_id)
        if self.kind == "area":
            area = ar.async_get(self.hass).async_get_area(self.group_id)
            return area.name if area else self.group_id
        label = lr.async_get(self.hass).async_get_label(self.group_id)
        return label.name if label else self.group_id

    def add_sensor(self, sensor: GroupEnergySensor) -> None:
        self._sensors.append(sensor)

    @callback
    def start(self) -> None:
        self.last = dt_util.now()
        self._refresh_members()
        self._refresh_price()
        self._refresh_mix()
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
        if self._unsub_mix:
            self._unsub_mix()
            self._unsub_mix = None
        self._mix_watched = ()


class GroupEnergySensor(SensorEntity, RestoreEntity):
    """The running energy total of a label or area in kWh. It never goes back to 0 (the panel works out the periods)."""

    _attr_has_entity_name = True
    _attr_device_class = SensorDeviceClass.ENERGY
    _attr_native_unit_of_measurement = UnitOfEnergy.KILO_WATT_HOUR
    _attr_state_class = SensorStateClass.TOTAL_INCREASING
    _attr_suggested_display_precision = 2
    _attr_should_poll = False
    _cost = False

    def __init__(
        self, entry: ConfigEntry, tracker: GroupEnergy, group_name: str
    ) -> None:
        self._tracker = tracker
        self._attr_unique_id = unique_id(
            entry.entry_id,
            tracker.group_id,
            COST if self._cost else ENERGY,
            tracker.kind,
        )
        what = "cost" if self._cost else "energy"
        self._attr_translation_key = f"{tracker.kind}_{what}_total"
        self._attr_translation_placeholders = self._placeholders(group_name)
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name="Energy Assistant",
            entry_type=dr.DeviceEntryType.SERVICE,
        )
        tracker.add_sensor(self)

    @staticmethod
    def _placeholders(name: str) -> dict[str, str]:
        return {"label": name, "area": name, "device": name}

    def refresh_name(self) -> None:
        """Take over a new name of the label, area or device (the entity id stays as it was created)."""
        self._attr_translation_placeholders = self._placeholders(
            self._tracker.display_name()
        )
        # Home Assistant caches the name; drop it (as its own _attr_ setters do) so it is built again
        self.__dict__.pop("name", None)
        self._cached_friendly_name = None

    @property
    def native_value(self) -> float:
        return round(self._tracker.kwh, 4)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return {
            f"{self._tracker.kind}_id": self._tracker.group_id,
            "sensors": sorted(self._tracker.members),
        }

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        last = await self.async_get_last_state()
        if last is None:
            return
        try:
            value = float(last.state)
        except (TypeError, ValueError):
            return
        self._tracker.restore(value, cost=self._cost)


class GroupCostSensor(GroupEnergySensor):
    """The running cost total of a label, area or device: every step is priced with the unit price of that moment."""

    _attr_device_class = SensorDeviceClass.MONETARY
    _attr_state_class = SensorStateClass.TOTAL
    _attr_suggested_display_precision = 2
    _cost = True

    def __init__(
        self, entry: ConfigEntry, tracker: GroupEnergy, group_name: str
    ) -> None:
        super().__init__(entry, tracker, group_name)
        self._attr_native_unit_of_measurement = (
            tracker.currency or tracker.hass.config.currency
        )

    @property
    def native_value(self) -> float:
        return round(self._tracker.cost, 4)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return {
            f"{self._tracker.kind}_id": self._tracker.group_id,
            "sensors": sorted(self._tracker.members),
            "price": self._tracker.price,  # the grid price per kWh now
            # what a kWh costs now: the grid price weighted with the share the grid delivers, the feed-in tariff
            # for the rest
            "unit_price": None
            if (unit := self._tracker.unit_price()) is None
            else round(unit, 4),
            "grid_share": None
            if self._tracker.share is None
            else round(self._tracker.share, 3),
        }


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    """Create the sensors of the selected labels, areas and devices and keep them in line with the selection."""
    trackers: dict[tuple[str, str], GroupEnergy] = {}
    with_cost: set[tuple[str, str]] = (
        set()
    )  # groups that already have their cost sensor
    registry = er.async_get(hass)

    def exists(kind: str, group_id: str) -> bool:
        if kind == "device":
            # a device whose source is gone keeps its sensors until it is deselected
            return True
        if kind == "area":
            return ar.async_get(hass).async_get_area(group_id) is not None
        return lr.async_get(hass).async_get_label(group_id) is not None

    def remove(uids: list[str]) -> None:
        for uid in uids:
            if entity_id := registry.async_get_entity_id("sensor", DOMAIN, uid):
                registry.async_remove(entity_id)

    @callback
    def sync(*_: Any) -> None:
        # Only labels and areas that exist; a deleted one would give a sensor without a name.
        wanted = [
            (kind, group_id)
            for kind in KINDS
            for group_id in _selected(entry, kind)
            if exists(kind, group_id)
        ]
        for tracker in trackers.values():
            tracker.options_changed()
        entities: list[GroupEnergySensor] = []
        for key in wanted:
            kind, group_id = key
            if key not in trackers:
                tracker = GroupEnergy(hass, entry, group_id, kind)
                trackers[key] = tracker
                name = tracker.display_name()
                # The sensors of the earlier versions (a set for each period, the energy of a device) are not needed any more
                remove(legacy_unique_ids(entry.entry_id, group_id, kind))
                if kind in ENERGY_KINDS:
                    entities.append(GroupEnergySensor(entry, tracker, name))
                tracker.start()
            tracker = trackers[key]
            # The cost sensor needs a price, so it appears once Tariffy offers one.
            if key not in with_cost and tracker.price is not None:
                with_cost.add(key)
                entities.append(GroupCostSensor(entry, tracker, tracker.display_name()))
        if entities:
            async_add_entities(entities)
        for key in [k for k in trackers if k not in wanted]:
            kind, group_id = key
            trackers.pop(key).stop()
            with_cost.discard(key)
            remove(
                [
                    unique_id(entry.entry_id, group_id, ENERGY, kind),
                    unique_id(entry.entry_id, group_id, COST, kind),
                    *legacy_unique_ids(entry.entry_id, group_id, kind),
                ]
            )

    async def _updated(hass_: HomeAssistant, entry_: ConfigEntry) -> None:
        sync()

    sync()
    entry.async_on_unload(entry.add_update_listener(_updated))
    # A price source (Tariffy) may be set up later: look again now and then.
    entry.async_on_unload(async_track_time_interval(hass, sync, timedelta(minutes=5)))

    @callback
    def stop_all() -> None:
        for tracker in trackers.values():
            tracker.stop()

    entry.async_on_unload(stop_all)
