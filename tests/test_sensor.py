"""Tests for the energy and cost totals of the selected labels, areas and devices."""

from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from zoneinfo import ZoneInfo

from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import label_registry as lr
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.energy_assistant.const import DOMAIN
from custom_components.energy_assistant.sensor import (
    COST,
    ENERGY,
    GroupCostSensor,
    GroupEnergy,
    legacy_unique_ids,
    unique_id,
)

BERLIN = ZoneInfo("Europe/Berlin")


def _tracker(hass: HomeAssistant) -> GroupEnergy:
    entry = MockConfigEntry(domain=DOMAIN, data={})
    tracker = GroupEnergy(hass, entry, "klima")
    tracker.last = datetime(2026, 11, 13, 10, 0, tzinfo=BERLIN)
    return tracker


def _run(tracker: GroupEnergy, minutes: int) -> None:
    """Let the time pass in steps of one minute, like the tick of the sensor does."""
    for _ in range(minutes):
        tracker._integrate(tracker.last + timedelta(minutes=1))


async def test_integrates_power_into_the_total(hass: HomeAssistant) -> None:
    tracker = _tracker(hass)
    tracker.powers = {"sensor.a": 1.0, "sensor.b": 0.5}  # 1.5 kW together
    _run(tracker, 120)
    assert round(tracker.kwh, 6) == 3.0  # 1.5 kW x 2 h


async def test_the_total_does_not_restart_at_midnight(hass: HomeAssistant) -> None:
    """The panel works out the periods from the statistics, the total just keeps growing."""
    tracker = _tracker(hass)  # 10:00
    tracker.powers = {"sensor.a": 1.0}
    _run(tracker, 15 * 60)  # until 01:00 of the next day
    assert round(tracker.kwh, 6) == 15.0


async def test_a_long_pause_is_not_integrated(hass: HomeAssistant) -> None:
    """After a restart or a blocked loop the power during the pause is unknown."""
    tracker = _tracker(hass)
    tracker.powers = {"sensor.a": 2.0}
    tracker._integrate(tracker.last + timedelta(hours=3))
    assert tracker.kwh == 0.0
    _run(tracker, 60)  # it carries on normally afterwards
    assert round(tracker.kwh, 6) == 2.0


async def test_time_going_backwards_adds_nothing(hass: HomeAssistant) -> None:
    tracker = _tracker(hass)
    tracker.powers = {"sensor.a": 2.0}
    tracker._integrate(tracker.last - timedelta(minutes=1))
    assert tracker.kwh == 0.0


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
    assert round(tracker.kwh, 6) == 1.0  # 1 kW for 1 h, the spike was ignored


async def test_restore_takes_the_stored_total_and_never_shrinks_it(
    hass: HomeAssistant,
) -> None:
    tracker = _tracker(hass)
    tracker.restore(4.2)
    assert tracker.kwh == 4.2
    tracker.restore(1.0)  # a smaller value never lowers what is already counted
    assert tracker.kwh == 4.2
    tracker.restore(9.5, cost=True)
    assert tracker.cost == 9.5


async def test_restore_ignores_values_that_cannot_be_right(hass: HomeAssistant) -> None:
    tracker = _tracker(hass)
    for bad in (float("nan"), float("inf"), -3.0, 5e9):
        tracker.restore(bad)
        tracker.restore(bad, cost=True)
    assert tracker.kwh == 0.0
    assert tracker.cost == 0.0


async def test_the_cost_is_priced_step_by_step_and_never_recalculated(
    hass: HomeAssistant,
) -> None:
    tracker = _tracker(hass)
    tracker.powers = {"sensor.a": 2.0}
    tracker.price = 0.30
    _run(tracker, 60)  # 2 kWh at 0.30
    tracker.price = 0.50  # the tariff changes
    _run(tracker, 60)  # 2 kWh at 0.50
    assert round(tracker.kwh, 6) == 4.0
    assert round(tracker.cost, 6) == round(2 * 0.30 + 2 * 0.50, 6)  # 1.60, not 2.00


async def test_without_a_price_nothing_is_costed(hass: HomeAssistant) -> None:
    tracker = _tracker(hass)
    tracker.powers = {"sensor.a": 2.0}
    _run(tracker, 60)
    assert round(tracker.kwh, 6) == 2.0
    assert tracker.cost == 0.0


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
    """The energy total of a label (as a list, so `all(...)` and `any(...)` read well)."""
    registry = er.async_get(hass)
    return [
        registry.async_get_entity_id(
            "sensor", DOMAIN, unique_id(entry.entry_id, label_id, ENERGY)
        )
    ]


async def test_sensors_exist_only_for_the_selected_labels(
    hass: HomeAssistant, mock_panel
) -> None:
    entry = await _setup(hass, ["klima"])
    assert all(_ids(hass, entry, "klima"))  # one running total
    assert not any(_ids(hass, entry, "licht"))
    state = hass.states.get(_ids(hass, entry, "klima")[0])
    assert state.state == "0.0"
    assert state.attributes["unit_of_measurement"] == "kWh"
    assert state.attributes["device_class"] == "energy"
    assert state.attributes["state_class"] == "total_increasing"
    assert "period_start" not in state.attributes
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
    hass.states.async_set("sensor.t_preis", "0.30", {"unit_of_measurement": "EUR/kWh"})
    with patch(
        "custom_components.energy_assistant.sensor.tariffy",
        return_value={"price": "sensor.t_preis"},
    ):
        entry = await _setup(hass, ["klima"])
    registry = er.async_get(hass)
    cost_id = registry.async_get_entity_id(
        "sensor", DOMAIN, unique_id(entry.entry_id, "klima", COST)
    )
    assert cost_id
    state = hass.states.get(cost_id)
    assert state.attributes["device_class"] == "monetary"
    assert state.attributes["state_class"] == "total"
    assert state.attributes["unit_of_measurement"] == "EUR"
    assert state.attributes["price"] == 0.30
    assert state.state == "0.0"


async def test_no_cost_sensors_without_tariffy(hass: HomeAssistant, mock_panel) -> None:
    entry = await _setup(hass, ["klima"])
    registry = er.async_get(hass)
    assert not registry.async_get_entity_id(
        "sensor", DOMAIN, unique_id(entry.entry_id, "klima", COST)
    )


async def test_entity_ids_and_names_follow_the_language_of_home_assistant(
    hass: HomeAssistant, mock_panel
) -> None:
    hass.config.language = "de"
    hass.states.async_set("sensor.t_preis", "0.30", {"unit_of_measurement": "EUR/kWh"})
    with patch(
        "custom_components.energy_assistant.sensor.tariffy",
        return_value={"price": "sensor.t_preis"},
    ):
        entry = await _setup(hass, ["klima"])
    registry = er.async_get(hass)
    energy = registry.async_get_entity_id(
        "sensor", DOMAIN, unique_id(entry.entry_id, "klima", ENERGY)
    )
    cost = registry.async_get_entity_id(
        "sensor", DOMAIN, unique_id(entry.entry_id, "klima", COST)
    )
    assert energy == "sensor.energy_assistant_klima_verbrauch_gesamt"
    assert cost == "sensor.energy_assistant_klima_kosten_gesamt"
    assert (
        hass.states.get(energy).attributes["friendly_name"]
        == "Energy Assistant Klima Verbrauch gesamt"
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
        tracker._refresh_price()
        _run(tracker, 60)  # 1 kWh at 0.30
        tracker.entry = MockConfigEntry(
            domain=DOMAIN,
            data={},
            options={"label_tariffs": {"waermepumpe": "sensor.wp_preis"}},
        )
        tracker._refresh_price()
        _run(tracker, 60)  # 1 kWh at 0.10
    assert round(tracker.cost, 6) == 0.40


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


def _area_ids(hass: HomeAssistant, entry: MockConfigEntry, area_id: str, what=ENERGY):
    registry = er.async_get(hass)
    return [
        registry.async_get_entity_id(
            "sensor", DOMAIN, unique_id(entry.entry_id, area_id, what, "area")
        )
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
    assert ids[0] == "sensor.energy_assistant_wohnzimmer_verbrauch_gesamt"
    # the unique ids of labels and areas never meet
    assert unique_id("e", "x", ENERGY) != unique_id("e", "x", ENERGY, "area")


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
    hass.states.async_set("sensor.t_preis", "0.30", {"unit_of_measurement": "EUR/kWh"})
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={"grid_import": "sensor.import"},
        options={"device_ids": device_ids, **options},
    )
    entry.add_to_hass(hass)
    # A device only gets a cost total (no energy total), and that needs a price
    with patch(
        "custom_components.energy_assistant.sensor.tariffy",
        return_value={"price": "sensor.t_preis"},
    ):
        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()
    return entry


def _device_ids(hass: HomeAssistant, entry: MockConfigEntry, device: str, what=COST):
    """The cost total of a device (a device has no energy total), as a list."""
    registry = er.async_get(hass)
    return [
        registry.async_get_entity_id(
            "sensor", DOMAIN, unique_id(entry.entry_id, device, what, "device")
        )
    ]


async def test_devices_get_sensors_only_when_selected_with_a_short_name(
    hass: HomeAssistant, mock_panel
) -> None:
    hass.config.language = "de"
    entry = await _setup_devices(hass, ["sensor.oven_power"])
    ids = _device_ids(hass, entry, "sensor.oven_power")
    assert ids[0] == "sensor.energy_assistant_backofen_kosten_gesamt"
    assert all(ids)
    assert not any(_device_ids(hass, entry, "sensor.tv_power"))  # not selected: nothing
    # a device has no energy total
    assert not any(_device_ids(hass, entry, "sensor.oven_power", ENERGY))
    state = hass.states.get(ids[0])
    assert state.attributes["device_id"] == "sensor.oven_power"
    assert state.attributes["sensors"] == ["sensor.oven_power"]
    assert (
        state.attributes["friendly_name"] == "Energy Assistant Backofen Kosten gesamt"
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
        "Energy Assistant Ofen Kosten gesamt"
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


async def test_saving_the_same_selection_again_never_creates_a_second_set(
    hass: HomeAssistant, mock_panel
) -> None:
    """The unique id of a sensor is fixed by entry, device and kind, so a repeated save finds the old ones."""
    entry = await _setup_devices(hass, ["sensor.oven_power"])

    def ours() -> list[str]:
        return sorted(
            e.entity_id
            for e in er.async_get(hass).entities.values()
            if e.platform == DOMAIN
        )

    first = ours()
    price = patch(
        "custom_components.energy_assistant.sensor.tariffy",
        return_value={"price": "sensor.t_preis"},
    )
    price.start()  # the price source stays there while the selection is saved again
    assert len(first) == 1  # one cost total, a device has no energy total
    for _ in range(3):
        hass.config_entries.async_update_entry(
            entry, options={"device_ids": ["sensor.oven_power"], "standby_normal": []}
        )
        await hass.async_block_till_done()
    assert ours() == first
    # unticking and ticking again gives the same ids again (nothing is left behind in between)
    hass.config_entries.async_update_entry(entry, options={"device_ids": []})
    await hass.async_block_till_done()
    assert ours() == []
    hass.config_entries.async_update_entry(
        entry, options={"device_ids": ["sensor.oven_power"]}
    )
    await hass.async_block_till_done()
    assert ours() == first
    price.stop()


# -- the price of a kWh depends on what the grid delivers of the consumption -----------------------


def _mix_tracker(hass: HomeAssistant, options: dict | None = None) -> GroupEnergy:
    entry = MockConfigEntry(domain=DOMAIN, data={}, options=options or {})
    tracker = GroupEnergy(hass, entry, "klima")
    tracker.last = datetime(2026, 11, 13, 10, 0, tzinfo=BERLIN)
    tracker.powers = {"sensor.a": 2.0}  # 2 kW: 2 kWh per hour
    tracker.price = 0.30
    return tracker


async def test_own_solar_power_costs_only_the_lost_feed_in(hass: HomeAssistant) -> None:
    tracker = _mix_tracker(hass)
    tracker.feed_in = 0.08
    tracker.share = 0.0  # a self-sufficiency of 100 %
    _run(tracker, 60)
    assert round(tracker.cost, 6) == round(2 * 0.08, 6)  # not 2 x 0.30
    assert tracker.unit_price() == 0.08


async def test_a_mix_is_priced_by_the_share(hass: HomeAssistant) -> None:
    tracker = _mix_tracker(hass)
    tracker.feed_in = 0.08
    tracker.share = 0.5
    _run(tracker, 60)
    assert round(tracker.cost, 6) == round(2 * (0.5 * 0.30 + 0.5 * 0.08), 6)


async def test_without_a_share_the_grid_price_stays(hass: HomeAssistant) -> None:
    tracker = _mix_tracker(hass)
    tracker.feed_in = 0.08
    tracker.share = None  # no usable sensors: never a lower price by guessing
    _run(tracker, 60)
    assert round(tracker.cost, 6) == round(2 * 0.30, 6)


async def test_without_a_feed_in_tariff_the_own_power_costs_nothing(
    hass: HomeAssistant,
) -> None:
    tracker = _mix_tracker(hass)
    tracker.feed_in = None
    tracker.share = 0.0
    _run(tracker, 60)
    assert tracker.cost == 0.0
    tracker.share = 0.25  # only the grid part is paid
    _run(tracker, 60)
    assert round(tracker.cost, 6) == round(2 * 0.25 * 0.30, 6)


async def test_the_setting_prices_everything_at_the_grid_price(
    hass: HomeAssistant,
) -> None:
    tracker = _mix_tracker(hass, {"cost_grid_only": True})
    tracker._refresh_mix()
    assert tracker.grid_only is True
    tracker.share = 0.0
    tracker.feed_in = 0.08
    _run(tracker, 60)
    assert round(tracker.cost, 6) == round(2 * 0.30, 6)


async def test_a_change_of_the_share_closes_the_running_interval_with_the_old_share(
    hass: HomeAssistant,
) -> None:
    options = {"grid_import": ["sensor.gi"], "house_power": "sensor.h"}
    tracker = _mix_tracker(hass, options)
    hass.states.async_set("sensor.h", "2000", {"unit_of_measurement": "W"})
    hass.states.async_set(
        "sensor.gi", "0", {"unit_of_measurement": "W"}
    )  # all own power
    tracker.feed_in = None
    tracker._refresh_mix()
    assert tracker.share == 0.0
    _run(tracker, 60)  # one hour at a share of 0: free
    assert tracker.cost == 0.0
    # the grid takes over: the interval until now is closed with the old share, the new one counts afterwards
    hass.states.async_set("sensor.gi", "2000", {"unit_of_measurement": "W"})
    with patch(
        "custom_components.energy_assistant.sensor.dt_util.now",
        return_value=tracker.last + timedelta(hours=1) - timedelta(seconds=1),
    ):
        tracker._on_mix(MagicMock())
    assert round(tracker.cost, 4) == 0.0  # the last stretch still had the old share
    assert tracker.share == 1.0
    _run(tracker, 60)
    assert round(tracker.cost, 3) == round(2 * 0.30, 3)  # an hour with the grid price


async def test_the_feed_in_tariff_is_read_checked_and_kept(hass: HomeAssistant) -> None:
    tracker = _mix_tracker(hass)
    offer = {"price": "sensor.t_preis", "feed_in": "sensor.t_feed"}
    with patch("custom_components.energy_assistant.sensor.tariffy", return_value=offer):
        hass.states.async_set("sensor.t_feed", "0.082")
        tracker._refresh_mix()
        assert tracker.feed_in == 0.082
        for bad in ("nan", "inf", "-0.1", "abc", "50", "unavailable"):
            hass.states.async_set("sensor.t_feed", bad)
            tracker._refresh_mix()
            assert tracker.feed_in == 0.082, bad  # the last good one stays
        assert (
            "sensor.t_feed" in tracker._mix_watched
        )  # a change closes the interval first
    with patch(
        "custom_components.energy_assistant.sensor.tariffy",
        return_value={"price": "sensor.t_preis"},
    ):
        tracker._refresh_mix()
        assert tracker.feed_in is None  # no feed-in tariff at all
    tracker.stop()


async def test_the_cost_sensor_shows_the_price_it_uses(hass: HomeAssistant) -> None:
    tracker = _mix_tracker(hass)
    tracker.feed_in = 0.08
    tracker.share = 0.5
    entry = MockConfigEntry(domain=DOMAIN, data={})
    attrs = GroupCostSensor(entry, tracker, "Klima").extra_state_attributes
    assert attrs["price"] == 0.30  # the grid price
    assert attrs["unit_price"] == 0.19  # what a kWh costs now
    assert attrs["grid_share"] == 0.5
    tracker.share = None
    attrs = GroupCostSensor(entry, tracker, "Klima").extra_state_attributes
    assert attrs["unit_price"] == 0.30
    assert attrs["grid_share"] is None


# -- the sensors of the earlier versions are removed ---------------------------------------------


async def test_the_sensors_of_the_earlier_versions_are_removed(
    hass: HomeAssistant, mock_panel
) -> None:
    """Before: four energy and four cost sensors for every label, area and device, and the energy of devices."""
    registry = er.async_get(hass)
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={"grid_import": "sensor.import"},
        options={"label_ids": ["klima"], "device_ids": ["sensor.oven_power"]},
    )
    entry.add_to_hass(hass)
    old = [
        *legacy_unique_ids(entry.entry_id, "klima", "label"),
        *legacy_unique_ids(entry.entry_id, "sensor.oven_power", "device"),
    ]
    assert len(old) == 16
    for uid in old:
        registry.async_get_or_create(
            "sensor", DOMAIN, uid, config_entry=entry, suggested_object_id=f"old_{uid}"
        )
    labels = lr.async_get(hass)
    labels.async_create("Klima")
    hass.http = MagicMock(async_register_static_paths=AsyncMock())
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert not [e for e in registry.entities.values() if e.unique_id in old]
    # what is selected has its totals now: the energy total of the label, no energy total of the device
    assert registry.async_get_entity_id(
        "sensor", DOMAIN, unique_id(entry.entry_id, "klima", ENERGY)
    )
    assert not registry.async_get_entity_id(
        "sensor",
        DOMAIN,
        unique_id(entry.entry_id, "sensor.oven_power", ENERGY, "device"),
    )


async def test_deselecting_removes_the_totals_and_what_is_left_of_the_old_sensors(
    hass: HomeAssistant, mock_panel
) -> None:
    hass.states.async_set("sensor.t_preis", "0.30", {"unit_of_measurement": "EUR/kWh"})
    with patch(
        "custom_components.energy_assistant.sensor.tariffy",
        return_value={"price": "sensor.t_preis"},
    ):
        entry = await _setup(hass, ["klima"])
        registry = er.async_get(hass)
        assert registry.async_get_entity_id(
            "sensor", DOMAIN, unique_id(entry.entry_id, "klima", COST)
        )
        # an old sensor that came back (or was never removed) goes with the deselection
        stray = unique_id(entry.entry_id, "klima", "week")
        registry.async_get_or_create("sensor", DOMAIN, stray, config_entry=entry)
        hass.config_entries.async_update_entry(entry, options={"label_ids": []})
        await hass.async_block_till_done()
    assert not [e for e in registry.entities.values() if e.platform == DOMAIN]


async def test_the_totals_are_restored_after_a_restart(
    hass: HomeAssistant, mock_panel
) -> None:
    from homeassistant.core import State
    from pytest_homeassistant_custom_component.common import mock_restore_cache

    mock_restore_cache(
        hass,
        [
            State(
                "sensor.energy_assistant_klima_energy_total",
                "12.5",
                {"label_id": "klima"},
            ),
            State(
                "sensor.energy_assistant_klima_cost_total",
                "3.4",
                {"label_id": "klima"},
            ),
        ],
    )
    hass.states.async_set("sensor.t_preis", "0.30", {"unit_of_measurement": "EUR/kWh"})
    with patch(
        "custom_components.energy_assistant.sensor.tariffy",
        return_value={"price": "sensor.t_preis"},
    ):
        entry = await _setup(hass, ["klima"])
    registry = er.async_get(hass)
    energy = registry.async_get_entity_id(
        "sensor", DOMAIN, unique_id(entry.entry_id, "klima", ENERGY)
    )
    cost = registry.async_get_entity_id(
        "sensor", DOMAIN, unique_id(entry.entry_id, "klima", COST)
    )
    assert float(hass.states.get(energy).state) >= 12.5
    assert float(hass.states.get(cost).state) >= 3.4
