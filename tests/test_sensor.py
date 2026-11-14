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
    GroupEnergy,
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


def _tracker(hass: HomeAssistant) -> GroupEnergy:
    entry = MockConfigEntry(domain=DOMAIN, data={})
    tracker = GroupEnergy(hass, entry, "klima")
    tracker.last = datetime(2026, 11, 13, 10, 0, tzinfo=BERLIN)
    tracker.starts = {p: period_start(tracker.last, p) for p in PERIODS}
    return tracker


def _run(tracker: GroupEnergy, minutes: int) -> None:
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


def _tracker_for(hass: HomeAssistant, tariffs: dict[str, str]) -> GroupEnergy:
    entry = MockConfigEntry(domain=DOMAIN, data={}, options={"label_tariffs": tariffs})
    return GroupEnergy(hass, entry, "waermepumpe")


async def test_a_label_uses_the_tariff_that_was_chosen_for_it(
    hass: HomeAssistant,
) -> None:
    hass.states.async_set(
        "sensor.haus_preis", "0.30", {"unit_of_measurement": "EUR/kWh"}
    )
    hass.states.async_set("sensor.wp_preis", "0.22", {"unit_of_measurement": "EUR/kWh"})
    with patch(
        "custom_components.energy_assistant.sensor.tariffy",
        return_value={"price": "sensor.haus_preis"},
    ):
        chosen = _tracker_for(hass, {"waermepumpe": "sensor.wp_preis"})
        chosen._refresh_price()
        assert chosen.price == 0.22  # the heat pump tariff, not the household one
        default = _tracker_for(hass, {})
        default._refresh_price()
        assert default.price == 0.30  # without a choice: the first electricity contract
        other = _tracker_for(
            hass, {"licht": "sensor.wp_preis"}
        )  # chosen for another label
        other._refresh_price()
        assert other.price == 0.30


async def test_a_chosen_tariff_is_never_replaced_by_another_contract(
    hass: HomeAssistant,
) -> None:
    hass.states.async_set(
        "sensor.haus_preis", "0.30", {"unit_of_measurement": "EUR/kWh"}
    )
    hass.states.async_set("sensor.wp_preis", "0.22", {"unit_of_measurement": "EUR/kWh"})
    with patch(
        "custom_components.energy_assistant.sensor.tariffy",
        return_value={"price": "sensor.haus_preis"},
    ):
        tracker = _tracker_for(hass, {"waermepumpe": "sensor.wp_preis"})
        tracker._refresh_price()
        # briefly unavailable: the last good price of that tariff stays
        hass.states.async_set("sensor.wp_preis", "unavailable")
        tracker._refresh_price()
        assert tracker.price == 0.22
        # the contract is gone: no price (no cost) instead of the household tariff
        hass.states.async_remove("sensor.wp_preis")
        tracker._refresh_price()
        assert tracker.price is None


async def test_changing_the_tariff_closes_the_running_interval_with_the_old_price(
    hass: HomeAssistant,
) -> None:
    hass.states.async_set(
        "sensor.haus_preis", "0.30", {"unit_of_measurement": "EUR/kWh"}
    )
    hass.states.async_set("sensor.wp_preis", "0.10", {"unit_of_measurement": "EUR/kWh"})
    with patch(
        "custom_components.energy_assistant.sensor.tariffy",
        return_value={"price": "sensor.haus_preis"},
    ):
        tracker = _tracker_for(hass, {})
        tracker.powers = {"sensor.a": 1.0}
        tracker.last = datetime.now(tz=BERLIN)
        tracker.starts = {p: period_start(tracker.last, p) for p in PERIODS}
        tracker._refresh_price()
        _run(tracker, 60)  # 1 kWh at 0.30
        tracker.entry = MockConfigEntry(
            domain=DOMAIN,
            data={},
            options={"label_tariffs": {"waermepumpe": "sensor.wp_preis"}},
        )
        tracker._refresh_price()
        _run(tracker, 60)  # 1 kWh at 0.10
    assert round(tracker.costs["year"], 6) == 0.40


async def _setup_areas(hass: HomeAssistant, area_ids: list[str]) -> MockConfigEntry:
    from homeassistant.helpers import area_registry as ar
    from homeassistant.helpers import device_registry as dr

    hass.http = MagicMock(async_register_static_paths=AsyncMock())
    areas = ar.async_get(hass)
    living = areas.async_create("Wohnzimmer")
    kitchen = areas.async_create("Kueche")
    assert (living.id, kitchen.id) == ("wohnzimmer", "kueche")
    config = MockConfigEntry(domain="test", data={})
    config.add_to_hass(hass)
    device = dr.async_get(hass).async_get_or_create(
        config_entry_id=config.entry_id, identifiers={("test", "d1")}
    )
    dr.async_get(hass).async_update_device(device.id, area_id=kitchen.id)
    registry = er.async_get(hass)

    def power(name: str, **kwargs) -> str:
        reg = registry.async_get_or_create(
            "sensor", "test", name, suggested_object_id=f"{name}_power", **kwargs
        )
        hass.states.async_set(
            reg.entity_id, "500", {"device_class": "power", "unit_of_measurement": "W"}
        )
        return reg.entity_id

    a = power("tv", config_entry=config)
    registry.async_update_entity(a, area_id=living.id)  # its own area
    b = power(
        "oven", config_entry=config, device_id=device.id
    )  # the area of its device
    c = power("lamp", config_entry=config, device_id=device.id)
    registry.async_update_entity(c, area_id=living.id)  # the entity beats the device
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={"grid_import": "sensor.import", "area_ids": area_ids},
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert {a, b, c}
    return entry


def _area_ids(hass: HomeAssistant, entry: MockConfigEntry, area_id: str, prefix=""):
    registry = er.async_get(hass)
    return [
        registry.async_get_entity_id(
            "sensor", DOMAIN, unique_id(entry.entry_id, area_id, prefix + p, "area")
        )
        for p in PERIODS
    ]


async def test_area_sensors_exist_only_for_the_selected_areas(
    hass: HomeAssistant, mock_panel
) -> None:
    entry = await _setup_areas(hass, ["wohnzimmer"])
    assert all(_area_ids(hass, entry, "wohnzimmer"))
    assert not any(_area_ids(hass, entry, "kueche"))
    state = hass.states.get(_area_ids(hass, entry, "wohnzimmer")[0])
    assert state.attributes["area_id"] == "wohnzimmer"
    assert "label_id" not in state.attributes
    # the sensor of the area itself and the one whose entity overrides its device count, the oven does not
    assert state.attributes["sensors"] == ["sensor.lamp_power", "sensor.tv_power"]


async def test_a_sensor_takes_the_area_of_its_device_when_it_has_none_of_its_own(
    hass: HomeAssistant, mock_panel
) -> None:
    entry = await _setup_areas(hass, ["kueche"])
    state = hass.states.get(_area_ids(hass, entry, "kueche")[0])
    assert state.attributes["sensors"] == ["sensor.oven_power"]


async def test_areas_and_labels_have_their_own_sensors_and_German_names(
    hass: HomeAssistant, mock_panel
) -> None:
    hass.config.language = "de"
    entry = await _setup_areas(hass, ["wohnzimmer"])
    ids = _area_ids(hass, entry, "wohnzimmer")
    assert ids[0] == "sensor.energy_assistant_wohnzimmer_verbrauch_taglich"
    assert ids[3] == "sensor.energy_assistant_wohnzimmer_verbrauch_jahrlich"
    # the unique ids of labels and areas never meet
    assert unique_id("e", "x", "day") != unique_id("e", "x", "day", "area")


async def test_deselecting_an_area_removes_its_sensors_only(
    hass: HomeAssistant, mock_panel
) -> None:
    entry = await _setup_areas(hass, ["wohnzimmer", "kueche"])
    assert all(_area_ids(hass, entry, "kueche"))
    hass.config_entries.async_update_entry(entry, options={"area_ids": ["wohnzimmer"]})
    await hass.async_block_till_done()
    assert not any(_area_ids(hass, entry, "kueche"))
    assert all(_area_ids(hass, entry, "wohnzimmer"))


async def test_an_area_uses_the_tariff_chosen_for_it(hass: HomeAssistant) -> None:
    hass.states.async_set(
        "sensor.haus_preis", "0.30", {"unit_of_measurement": "EUR/kWh"}
    )
    hass.states.async_set("sensor.wp_preis", "0.22", {"unit_of_measurement": "EUR/kWh"})
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={},
        options={
            "area_tariffs": {"keller": "sensor.wp_preis"},
            "label_tariffs": {"keller": "sensor.haus_preis"},  # same id, other kind
        },
    )
    with patch(
        "custom_components.energy_assistant.sensor.tariffy",
        return_value={"price": "sensor.haus_preis"},
    ):
        area = GroupEnergy(hass, entry, "keller", "area")
        area._refresh_price()
        label = GroupEnergy(hass, entry, "keller", "label")
        label._refresh_price()
    assert area.price == 0.22
    assert label.price == 0.30


async def test_a_fresh_setup_creates_no_sensors_at_all(
    hass: HomeAssistant, mock_panel
) -> None:
    """Nothing is preselected: a new installation must not flood Home Assistant with sensors."""
    hass.http = MagicMock(async_register_static_paths=AsyncMock())
    from homeassistant.helpers import area_registry as ar

    lr.async_get(hass).async_create("Klima")
    ar.async_get(hass).async_create("Wohnzimmer")
    entry = MockConfigEntry(domain=DOMAIN, data={"grid_import": "sensor.import"})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    ours = [e for e in er.async_get(hass).entities.values() if e.platform == DOMAIN]
    assert ours == []
    # an empty selection of areas (which shows all areas on the card) does not create any either
    hass.config_entries.async_update_entry(
        entry, options={"area_ids": [], "label_ids": []}
    )
    await hass.async_block_till_done()
    assert [
        e for e in er.async_get(hass).entities.values() if e.platform == DOMAIN
    ] == []


def test_a_device_name_loses_the_word_leistung() -> None:
    from custom_components.energy_assistant.sensor import strip_power

    assert strip_power("Backofen Leistung") == "Backofen"
    assert strip_power("Wallbox 3EM Phase A Leistung") == "Wallbox 3EM Phase A"
    assert strip_power("Oven power") == "Oven"
    assert strip_power("Kühlschrank_leistung") == "Kühlschrank"
    assert strip_power("Leistung") == "Leistung"  # a name that is only the word stays
    assert (
        strip_power("Leistungsmesser Keller") == "Leistungsmesser Keller"
    )  # only at the end


async def test_the_name_of_a_device_is_the_own_name_else_the_short_friendly_name(
    hass: HomeAssistant,
) -> None:
    from custom_components.energy_assistant.sensor import device_display_name

    hass.states.async_set(
        "sensor.oven_power", "5", {"friendly_name": "Backofen Leistung"}
    )
    entry = MockConfigEntry(domain=DOMAIN, data={})
    assert device_display_name(hass, entry, "sensor.oven_power") == "Backofen"
    entry = MockConfigEntry(
        domain=DOMAIN, data={}, options={"device_names": {"sensor.oven_power": "Ofen"}}
    )
    assert device_display_name(hass, entry, "sensor.oven_power") == "Ofen"
    # without a state the id gives a readable name
    assert device_display_name(hass, entry, "sensor.herd_leistung") == "herd"


async def _setup_devices(
    hass: HomeAssistant, device_ids: list[str], **options
) -> MockConfigEntry:
    hass.http = MagicMock(async_register_static_paths=AsyncMock())
    for entity_id, name in (
        ("sensor.oven_power", "Backofen Leistung"),
        ("sensor.tv_power", "Fernseher Leistung"),
    ):
        hass.states.async_set(
            entity_id,
            "500",
            {
                "device_class": "power",
                "unit_of_measurement": "W",
                "friendly_name": name,
            },
        )
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={"grid_import": "sensor.import"},
        options={"device_ids": device_ids, **options},
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


def _device_ids(hass: HomeAssistant, entry: MockConfigEntry, device: str, prefix=""):
    registry = er.async_get(hass)
    return [
        registry.async_get_entity_id(
            "sensor", DOMAIN, unique_id(entry.entry_id, device, prefix + p, "device")
        )
        for p in PERIODS
    ]


async def test_devices_get_sensors_only_when_selected_with_a_short_name(
    hass: HomeAssistant, mock_panel
) -> None:
    hass.config.language = "de"
    entry = await _setup_devices(hass, ["sensor.oven_power"])
    ids = _device_ids(hass, entry, "sensor.oven_power")
    assert ids[0] == "sensor.energy_assistant_backofen_verbrauch_taglich"
    assert all(ids)
    assert not any(_device_ids(hass, entry, "sensor.tv_power"))  # not selected: nothing
    state = hass.states.get(ids[0])
    assert state.attributes["device_id"] == "sensor.oven_power"
    assert state.attributes["sensors"] == ["sensor.oven_power"]
    assert (
        state.attributes["friendly_name"]
        == "Energy Assistant Backofen Verbrauch täglich"
    )


async def test_the_name_of_the_sensors_follows_a_new_display_name_but_not_the_id(
    hass: HomeAssistant, mock_panel
) -> None:
    from homeassistant.util import dt as dt_util
    from pytest_homeassistant_custom_component.common import async_fire_time_changed

    hass.config.language = "de"
    entry = await _setup_devices(hass, ["sensor.oven_power"])
    entity_id = _device_ids(hass, entry, "sensor.oven_power")[0]
    hass.config_entries.async_update_entry(
        entry, options={**entry.options, "device_names": {"sensor.oven_power": "Ofen"}}
    )
    await hass.async_block_till_done()
    async_fire_time_changed(hass, dt_util.utcnow() + timedelta(minutes=2))
    await hass.async_block_till_done()
    assert _device_ids(hass, entry, "sensor.oven_power")[0] == entity_id  # the id stays
    assert hass.states.get(entity_id).attributes["friendly_name"] == (
        "Energy Assistant Ofen Verbrauch täglich"
    )


async def test_the_sensors_of_a_device_stay_when_its_source_goes_away(
    hass: HomeAssistant, mock_panel
) -> None:
    entry = await _setup_devices(hass, ["sensor.oven_power"])
    hass.states.async_remove("sensor.oven_power")
    hass.config_entries.async_update_entry(
        entry, options={**entry.options, "device_exclude": ["sensor.oven_power"]}
    )
    await hass.async_block_till_done()
    assert all(
        _device_ids(hass, entry, "sensor.oven_power")
    )  # nothing is deleted on its own
    # deselecting is what removes them
    hass.config_entries.async_update_entry(entry, options={"device_ids": []})
    await hass.async_block_till_done()
    assert not any(_device_ids(hass, entry, "sensor.oven_power"))


async def test_an_excluded_device_that_exists_still_counts(
    hass: HomeAssistant,
) -> None:
    entry = MockConfigEntry(
        domain=DOMAIN, data={}, options={"device_exclude": ["sensor.oven_power"]}
    )
    hass.states.async_set(
        "sensor.oven_power",
        "500",
        {"device_class": "power", "unit_of_measurement": "W"},
    )
    tracker = GroupEnergy(hass, entry, "sensor.oven_power", "device")
    assert tracker._find_members() == {"sensor.oven_power"}
    gone = GroupEnergy(hass, entry, "sensor.missing_power", "device")
    assert gone._find_members() == set()


async def test_a_device_uses_the_tariff_chosen_for_it(hass: HomeAssistant) -> None:
    hass.states.async_set(
        "sensor.haus_preis", "0.30", {"unit_of_measurement": "EUR/kWh"}
    )
    hass.states.async_set("sensor.wp_preis", "0.22", {"unit_of_measurement": "EUR/kWh"})
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={},
        options={"device_tariffs": {"sensor.wp_power": "sensor.wp_preis"}},
    )
    with patch(
        "custom_components.energy_assistant.sensor.tariffy",
        return_value={"price": "sensor.haus_preis"},
    ):
        heat = GroupEnergy(hass, entry, "sensor.wp_power", "device")
        heat._refresh_price()
        other = GroupEnergy(hass, entry, "sensor.tv_power", "device")
        other._refresh_price()
    assert heat.price == 0.22
    assert other.price == 0.30
