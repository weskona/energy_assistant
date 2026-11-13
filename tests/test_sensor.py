"""Tests for the energy sensors of the selected labels."""

from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock
from zoneinfo import ZoneInfo

from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import label_registry as lr
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.energy_assistant.const import DOMAIN
from custom_components.energy_assistant.sensor import (
    PERIODS,
    LabelEnergy,
    period_start,
    unique_id,
)

BERLIN = ZoneInfo("Europe/Berlin")


def test_period_start_follows_the_calendar_of_the_time_zone() -> None:
    now = datetime(2026, 11, 13, 15, 30, tzinfo=BERLIN)  # a Friday
    assert period_start(now, "day") == datetime(2026, 11, 13, tzinfo=BERLIN)
    assert period_start(now, "week") == datetime(2026, 11, 9, tzinfo=BERLIN)  # Monday
    assert period_start(now, "month") == datetime(2026, 11, 1, tzinfo=BERLIN)
    assert period_start(now, "year") == datetime(2026, 1, 1, tzinfo=BERLIN)


def _tracker(hass: HomeAssistant) -> LabelEnergy:
    entry = MockConfigEntry(domain=DOMAIN, data={})
    tracker = LabelEnergy(hass, entry, "klima")
    tracker.last = datetime(2026, 11, 13, 10, 0, tzinfo=BERLIN)
    tracker.starts = {p: period_start(tracker.last, p) for p in PERIODS}
    return tracker


async def test_integrates_power_into_all_periods(hass: HomeAssistant) -> None:
    tracker = _tracker(hass)
    tracker.powers = {"sensor.a": 1.0, "sensor.b": 0.5}  # 1.5 kW together
    tracker._integrate(tracker.last + timedelta(hours=2))
    assert all(round(tracker.values[p], 6) == 3.0 for p in PERIODS)  # 1.5 kW x 2 h


async def test_day_restarts_at_midnight_and_keeps_the_other_periods(
    hass: HomeAssistant,
) -> None:
    tracker = _tracker(hass)  # 10:00, day counter at 0
    tracker.powers = {"sensor.a": 1.0}
    tracker._integrate(datetime(2026, 11, 14, 1, 0, tzinfo=BERLIN))
    # 14 h were on the old day, 1 h on the new one
    assert round(tracker.values["day"], 6) == 1.0
    assert tracker.starts["day"] == datetime(2026, 11, 14, tzinfo=BERLIN)
    assert round(tracker.values["week"], 6) == 15.0  # still the same week (Mon 9th)
    assert round(tracker.values["year"], 6) == 15.0


async def test_restore_only_takes_the_running_period(hass: HomeAssistant) -> None:
    tracker = _tracker(hass)
    tracker.restore("day", 4.2, tracker.starts["day"])
    assert tracker.values["day"] == 4.2
    tracker.restore(
        "week", 9.0, tracker.starts["week"] - timedelta(days=7)
    )  # last week
    assert tracker.values["week"] == 0.0


async def _setup(hass: HomeAssistant, label_ids: list[str]) -> MockConfigEntry:
    hass.http = MagicMock(async_register_static_paths=AsyncMock())
    labels = lr.async_get(hass)
    for label_id in ("klima", "licht"):
        if labels.async_get_label(label_id) is None:
            labels.async_create(label_id.capitalize())
    sensors = er.async_get(hass)
    for name, label in (("heater", "klima"), ("lamp", "licht")):
        reg = sensors.async_get_or_create(
            "sensor", "test", name, suggested_object_id=f"{name}_power"
        )
        sensors.async_update_entity(reg.entity_id, labels={label})
        hass.states.async_set(
            reg.entity_id,
            "500",
            {"device_class": "power", "unit_of_measurement": "W"},
        )
    entry = MockConfigEntry(
        domain=DOMAIN, data={"grid_import": "sensor.import", "label_ids": label_ids}
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


def _ids(
    hass: HomeAssistant, entry: MockConfigEntry, label_id: str
) -> list[str | None]:
    registry = er.async_get(hass)
    return [
        registry.async_get_entity_id(
            "sensor", DOMAIN, unique_id(entry.entry_id, label_id, p)
        )
        for p in PERIODS
    ]


async def test_sensors_exist_only_for_the_selected_labels(
    hass: HomeAssistant, mock_panel
) -> None:
    entry = await _setup(hass, ["klima"])
    assert all(_ids(hass, entry, "klima"))  # day, week, month, year
    assert not any(_ids(hass, entry, "licht"))
    state = hass.states.get(_ids(hass, entry, "klima")[0])
    assert state.state == "0.0"
    assert state.attributes["unit_of_measurement"] == "kWh"
    assert state.attributes["device_class"] == "energy"
    assert state.attributes["sensors"] == ["sensor.heater_power"]
    assert "Klima" in state.attributes["friendly_name"]


async def test_selecting_a_label_creates_its_sensors_and_deselecting_removes_them(
    hass: HomeAssistant, mock_panel
) -> None:
    entry = await _setup(hass, ["klima"])
    hass.config_entries.async_update_entry(
        entry, options={"label_ids": ["klima", "licht"]}
    )
    await hass.async_block_till_done()
    assert all(_ids(hass, entry, "licht"))  # no reload needed
    hass.config_entries.async_update_entry(entry, options={"label_ids": ["licht"]})
    await hass.async_block_till_done()
    assert not any(_ids(hass, entry, "klima"))
    assert all(_ids(hass, entry, "licht"))
