"""Tests for the energy sensors of the selected labels."""

from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
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


def _run(tracker: LabelEnergy, minutes: int) -> None:
    """Let the time pass in steps of one minute, like the tick of the sensor does."""
    for _ in range(minutes):
        tracker._integrate(tracker.last + timedelta(minutes=1))


async def test_integrates_power_into_all_periods(hass: HomeAssistant) -> None:
    tracker = _tracker(hass)
    tracker.powers = {"sensor.a": 1.0, "sensor.b": 0.5}  # 1.5 kW together
    _run(tracker, 120)
    assert all(round(tracker.values[p], 6) == 3.0 for p in PERIODS)  # 1.5 kW x 2 h


async def test_day_restarts_at_midnight_and_keeps_the_other_periods(
    hass: HomeAssistant,
) -> None:
    tracker = _tracker(hass)  # 10:00, day counter at 0
    tracker.powers = {"sensor.a": 1.0}
    _run(tracker, 15 * 60)  # until 01:00 of the next day
    # 14 h were on the old day, 1 h on the new one
    assert round(tracker.values["day"], 6) == 1.0
    assert tracker.starts["day"] == datetime(2026, 11, 14, tzinfo=BERLIN)
    assert round(tracker.values["week"], 6) == 15.0  # still the same week (Mon 9th)
    assert round(tracker.values["year"], 6) == 15.0


async def test_a_long_pause_is_not_integrated(hass: HomeAssistant) -> None:
    """After a restart or a blocked loop the power during the pause is unknown."""
    tracker = _tracker(hass)
    tracker.powers = {"sensor.a": 2.0}
    tracker._integrate(tracker.last + timedelta(hours=3))
    assert all(tracker.values[p] == 0.0 for p in PERIODS)
    _run(tracker, 60)  # it carries on normally afterwards
    assert round(tracker.values["day"], 6) == 2.0


async def test_time_going_backwards_adds_nothing(hass: HomeAssistant) -> None:
    tracker = _tracker(hass)
    tracker.powers = {"sensor.a": 2.0}
    tracker._integrate(tracker.last - timedelta(minutes=1))
    assert all(tracker.values[p] == 0.0 for p in PERIODS)


def _power(hass: HomeAssistant, state: str, unit: str | None = "W", prev: float = 0.7):
    attrs = {"device_class": "power"}
    if unit:
        attrs["unit_of_measurement"] = unit
    hass.states.async_set("sensor.x", state, attrs)
    return _tracker(hass)._power("sensor.x", prev)


async def test_power_readings_are_checked(hass: HomeAssistant) -> None:
    assert _power(hass, "1500") == 1.5  # W
    assert _power(hass, "1.5", "kW") == 1.5
    # gone or off: counts as 0
    assert _tracker(hass)._power("sensor.missing", 0.7) == 0.0
    assert _power(hass, "unavailable") == 0.0
    assert _power(hass, "unknown") == 0.0
    assert _power(hass, "1500", None) == 0.0  # no unit
    assert _power(hass, "1500", "mW") == 0.0  # unit that is not understood
    # impossible values do not replace the last good one
    for bad in ("nan", "inf", "-inf", "-50", "abc", "", "250000"):  # the last is 250 kW
        assert _power(hass, bad) == 0.7, bad


async def test_a_spike_does_not_reach_the_counters(hass: HomeAssistant) -> None:
    tracker = _tracker(hass)
    tracker.members = {"sensor.x"}
    tracker.powers = {"sensor.x": 1.0}
    hass.states.async_set(
        "sensor.x", "9999999", {"device_class": "power", "unit_of_measurement": "W"}
    )
    tracker.powers["sensor.x"] = tracker._power("sensor.x", tracker.powers["sensor.x"])
    _run(tracker, 60)
    assert round(tracker.values["day"], 6) == 1.0  # 1 kW for 1 h, the spike was ignored


async def test_restore_only_takes_the_running_period(hass: HomeAssistant) -> None:
    tracker = _tracker(hass)
    tracker.restore("day", 4.2, tracker.starts["day"])
    assert tracker.values["day"] == 4.2
    tracker.restore(
        "week", 9.0, tracker.starts["week"] - timedelta(days=7)
    )  # last week
    assert tracker.values["week"] == 0.0


async def test_restore_ignores_values_that_cannot_be_right(hass: HomeAssistant) -> None:
    tracker = _tracker(hass)
    for bad in (float("nan"), float("inf"), -3.0, 5e9):
        tracker.restore("day", bad, tracker.starts["day"])
        tracker.restore("month", bad, tracker.starts["month"], cost=True)
    assert tracker.values["day"] == 0.0
    assert tracker.costs["month"] == 0.0


async def test_the_cost_is_priced_step_by_step_and_never_recalculated(
    hass: HomeAssistant,
) -> None:
    tracker = _tracker(hass)
    tracker.powers = {"sensor.a": 2.0}
    tracker.price = 0.30
    _run(tracker, 60)  # 2 kWh at 0.30
    tracker.price = 0.50  # the tariff changes
    _run(tracker, 60)  # 2 kWh at 0.50
    assert round(tracker.values["day"], 6) == 4.0
    assert round(tracker.costs["day"], 6) == round(
        2 * 0.30 + 2 * 0.50, 6
    )  # 1.60, not 2.00


async def test_without_a_price_nothing_is_costed(hass: HomeAssistant) -> None:
    tracker = _tracker(hass)
    tracker.powers = {"sensor.a": 2.0}
    _run(tracker, 60)
    assert round(tracker.values["day"], 6) == 2.0
    assert tracker.costs["day"] == 0.0


def _price(hass: HomeAssistant, state: str, **attrs):
    hass.states.async_set(
        "sensor.t_preis", state, {"unit_of_measurement": "EUR/kWh", **attrs}
    )
    with patch(
        "custom_components.energy_assistant.sensor.tariffy",
        return_value={"price": "sensor.t_preis"},
    ):
        return _tracker(hass)._read_price()


async def test_the_price_is_read_and_checked(hass: HomeAssistant) -> None:
    assert _price(hass, "0.30") == (0.30, "EUR")
    # the live price of a dynamic tariff wins over the state
    assert _price(hass, "0.30", arbeitspreis_aktuell="0.12") == (0.12, "EUR")
    # impossible live price: fall back to the state; impossible state: no price
    assert _price(hass, "0.30", arbeitspreis_aktuell="999") == (0.30, "EUR")
    assert _price(hass, "unavailable") is None
    assert _price(hass, "nan") is None
    assert _price(hass, "-0.2") is None
    assert _price(hass, "1000") is None


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


async def test_cost_sensors_exist_only_with_a_price_and_are_monetary(
    hass: HomeAssistant, mock_panel
) -> None:
    from custom_components.energy_assistant.sensor import COST

    hass.states.async_set("sensor.t_preis", "0.30", {"unit_of_measurement": "EUR/kWh"})
    with patch(
        "custom_components.energy_assistant.sensor.tariffy",
        return_value={"price": "sensor.t_preis"},
    ):
        entry = await _setup(hass, ["klima"])
    registry = er.async_get(hass)
    ids = [
        registry.async_get_entity_id(
            "sensor", DOMAIN, unique_id(entry.entry_id, "klima", COST + p)
        )
        for p in PERIODS
    ]
    assert all(ids)
    state = hass.states.get(ids[0])
    assert state.attributes["device_class"] == "monetary"
    assert state.attributes["unit_of_measurement"] == "EUR"
    assert state.attributes["price"] == 0.30
    assert state.state == "0.0"


async def test_no_cost_sensors_without_tariffy(hass: HomeAssistant, mock_panel) -> None:
    from custom_components.energy_assistant.sensor import COST

    entry = await _setup(hass, ["klima"])
    registry = er.async_get(hass)
    assert not any(
        registry.async_get_entity_id(
            "sensor", DOMAIN, unique_id(entry.entry_id, "klima", COST + p)
        )
        for p in PERIODS
    )


async def test_entity_ids_and_names_follow_the_language_of_home_assistant(
    hass: HomeAssistant, mock_panel
) -> None:
    from custom_components.energy_assistant.sensor import COST

    hass.config.language = "de"
    hass.states.async_set("sensor.t_preis", "0.30", {"unit_of_measurement": "EUR/kWh"})
    with patch(
        "custom_components.energy_assistant.sensor.tariffy",
        return_value={"price": "sensor.t_preis"},
    ):
        entry = await _setup(hass, ["klima"])
    registry = er.async_get(hass)
    energy = registry.async_get_entity_id(
        "sensor", DOMAIN, unique_id(entry.entry_id, "klima", "day")
    )
    cost = registry.async_get_entity_id(
        "sensor", DOMAIN, unique_id(entry.entry_id, "klima", COST + "week")
    )
    assert energy == "sensor.energy_assistant_klima_verbrauch_taglich"
    assert cost == "sensor.energy_assistant_klima_kosten_wochentlich"
    assert (
        hass.states.get(energy).attributes["friendly_name"]
        == "Energy Assistant Klima Verbrauch täglich"
    )
