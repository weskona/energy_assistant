"""Energy sensors per selected label: kWh of today, this week, this month and this year.

The sensors are created for the labels that are selected in the settings (one set of four per label)
and removed when a label is deselected, without reloading the entry. The energy is the power of the
sensors that carry the label (like the Labels card of the panel), integrated over time. The periods
follow the time zone of Home Assistant.
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
from .settings import as_list, clean_ids

PERIODS = ("day", "week", "month", "year")
# Unit of a power sensor -> factor to kW. Other units are ignored.
_TO_KW = {"W": 0.001, "kW": 1.0}
_TICK = timedelta(minutes=1)


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
        self.starts = {p: period_start(self.last, p) for p in PERIODS}
        self._sensors: list[LabelEnergySensor] = []
        self._unsubs: list[Callable[[], None]] = []
        self._unsub_state: Callable[[], None] | None = None

    # -- members -----------------------------------------------------------------

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

    def _power(self, entity_id: str) -> float:
        """Current power of a sensor in kW, 0 without a usable value."""
        state = self.hass.states.get(entity_id)
        if state is None or state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
            return 0.0
        factor = _TO_KW.get(state.attributes.get("unit_of_measurement", ""))
        try:
            value = float(state.state)
        except ValueError:
            return 0.0
        if factor is None or value < 0 or math.isnan(value):
            return 0.0
        return value * factor

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
        self.powers = {m: self._power(m) for m in self.members}

    # -- integration -------------------------------------------------------------

    def _integrate(self, now: datetime) -> None:
        """Add the energy since the last call with the power that was valid until now."""
        total_kw = sum(self.powers.values())
        for period in PERIODS:
            start = period_start(now, period)
            if start > self.starts[period]:  # a new period began
                self.values[period] = 0.0
                self.starts[period] = start
            since = max(self.last, start)
            if now > since:
                self.values[period] += total_kw * (now - since).total_seconds() / 3600
        self.last = now

    @callback
    def _on_state(self, event: Event) -> None:
        """A member changed: close the interval with the old power, then take the new one."""
        self._integrate(dt_util.now())
        entity_id = event.data["entity_id"]
        self.powers[entity_id] = self._power(entity_id)

    @callback
    def _tick(self, _now: datetime) -> None:
        self._integrate(dt_util.now())
        self._refresh_members()
        for sensor in self._sensors:
            sensor.async_write_ha_state()

    # -- lifetime ----------------------------------------------------------------

    def restore(self, period: str, value: float, start: datetime) -> None:
        """Take over a stored value when it belongs to the running period."""
        if start == self.starts[period]:
            self.values[period] = max(self.values[period], value)

    def add_sensor(self, sensor: LabelEnergySensor) -> None:
        self._sensors.append(sensor)

    @callback
    def start(self) -> None:
        self.last = dt_util.now()
        self._refresh_members()
        self._unsubs.append(async_track_time_interval(self.hass, self._tick, _TICK))

    @callback
    def stop(self) -> None:
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()
        if self._unsub_state:
            self._unsub_state()
            self._unsub_state = None


class LabelEnergySensor(SensorEntity, RestoreEntity):
    """Energy of a label in kWh for one period."""

    _attr_has_entity_name = True
    _attr_device_class = SensorDeviceClass.ENERGY
    _attr_native_unit_of_measurement = UnitOfEnergy.KILO_WATT_HOUR
    _attr_state_class = SensorStateClass.TOTAL
    _attr_suggested_display_precision = 2
    _attr_should_poll = False

    def __init__(
        self, entry: ConfigEntry, tracker: LabelEnergy, label_name: str, period: str
    ) -> None:
        self._tracker = tracker
        self._period = period
        self._attr_unique_id = unique_id(entry.entry_id, tracker.label_id, period)
        self._attr_translation_key = f"label_energy_{period}"
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
        self._tracker.restore(self._period, value, start)


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    """Create the sensors of the selected labels and keep them in line with the selection."""
    trackers: dict[str, LabelEnergy] = {}

    def label_name(label_id: str) -> str:
        label = lr.async_get(hass).async_get_label(label_id)
        return label.name if label else label_id

    @callback
    def sync(*_: Any) -> None:
        wanted = _selected(entry)
        # Only labels that exist; a deleted label would give a sensor without a name.
        wanted = [i for i in wanted if lr.async_get(hass).async_get_label(i)]
        new = [i for i in wanted if i not in trackers]
        entities: list[LabelEnergySensor] = []
        for label_id in new:
            tracker = LabelEnergy(hass, entry, label_id)
            trackers[label_id] = tracker
            name = label_name(label_id)
            entities += [
                LabelEnergySensor(entry, tracker, name, period) for period in PERIODS
            ]
            tracker.start()
        if entities:
            async_add_entities(entities)
        registry = er.async_get(hass)
        for label_id in [i for i in trackers if i not in wanted]:
            trackers.pop(label_id).stop()
            for period in PERIODS:
                uid = unique_id(entry.entry_id, label_id, period)
                if entity_id := registry.async_get_entity_id("sensor", DOMAIN, uid):
                    registry.async_remove(entity_id)

    async def _updated(hass_: HomeAssistant, entry_: ConfigEntry) -> None:
        sync()

    sync()
    entry.async_on_unload(entry.add_update_listener(_updated))
    entry.async_on_unload(lambda: [t.stop() for t in trackers.values()])
