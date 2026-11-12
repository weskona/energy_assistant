"""Tests for the optional data of sibling integrations."""

from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.energy_assistant.providers import (
    available,
    ev_assistant,
    pv_assistant,
    tariffy,
)
from custom_components.energy_assistant.websocket import async_register


def _sensor(hass, entry, key, state="0.3", **attrs):
    """A Tariffy sensor of a contract, as the entity registry and the state machine know it."""
    entity = er.async_get(hass).async_get_or_create(
        "sensor",
        "tariffy",
        f"{entry.entry_id}_{key}",
        suggested_object_id=f"{entry.title}_{key}",
        config_entry=entry,
        translation_key=key,
    )
    hass.states.async_set(entity.entity_id, state, attrs)
    return entity.entity_id


def _contract(hass, title, sparte="electricity", keys=("arbeitspreis",)):
    entry = MockConfigEntry(domain="tariffy", title=title)
    entry.add_to_hass(hass)
    ids = {}
    for key in keys:
        extra = {"sparte": sparte} if key == "arbeitspreis" else {}
        ids[key] = _sensor(hass, entry, key, **extra)
    return ids


async def test_nothing_without_tariffy(hass) -> None:
    assert tariffy(hass) is None
    assert available(hass) == {}


async def test_electricity_contract_gives_price_and_balance(hass) -> None:
    ids = _contract(
        hass,
        "strom",
        keys=(
            "arbeitspreis",
            "einspeiseverguetung",
            "kosten_bisher",
            "guthaben_bisher",
            "prognose_real",
        ),
    )
    offer = tariffy(hass)
    assert offer == {
        "price": ids["arbeitspreis"],
        "feed_in": ids["einspeiseverguetung"],
        "cost_so_far": ids["kosten_bisher"],
        "balance": ids["guthaben_bisher"],
        "forecast": ids["prognose_real"],
    }
    assert available(hass) == {"tariffy": offer}


async def test_gas_and_water_contracts_are_not_the_electricity_price(hass) -> None:
    _contract(hass, "gas", sparte="gas")
    _contract(hass, "wasser", sparte="water")
    assert tariffy(hass) is None


async def test_the_feed_in_tariff_may_belong_to_another_contract(hass) -> None:
    _contract(hass, "bezug", keys=("arbeitspreis",))
    einspeisung = _contract(hass, "einspeisung", keys=("einspeiseverguetung",))
    offer = tariffy(hass)
    assert offer["feed_in"] == einspeisung["einspeiseverguetung"]


async def test_disabled_sensors_are_ignored(hass) -> None:
    ids = _contract(hass, "strom")
    registry = er.async_get(hass)
    registry.async_update_entity(
        ids["arbeitspreis"], disabled_by=er.RegistryEntryDisabler.USER
    )
    assert tariffy(hass) is None


async def test_websocket_answers_with_the_entities_or_nothing(
    hass, hass_ws_client
) -> None:
    async_register(hass)
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "energy_assistant/integrations"})
    assert (await client.receive_json())["result"] == {}
    ids = _contract(hass, "strom")
    await client.send_json_auto_id({"type": "energy_assistant/integrations"})
    msg = await client.receive_json()
    assert msg["result"]["tariffy"]["price"] == ids["arbeitspreis"]


def _ev_vehicle(
    hass,
    title,
    keys=("home_kwh", "kwh_day", "cost_day", "charge_before_pv_recommended"),
):
    entry = MockConfigEntry(domain="ev_assistant", title=title)
    entry.add_to_hass(hass)
    ids = {}
    for key in keys:
        domain = "binary_sensor" if key == "charge_before_pv_recommended" else "sensor"
        entity = er.async_get(hass).async_get_or_create(
            domain,
            "ev_assistant",
            f"{entry.entry_id}_{key}",
            suggested_object_id=f"{title}_{key}",
            config_entry=entry,
            translation_key=key,
        )
        hass.states.async_set(entity.entity_id, "0")
        ids[key] = entity.entity_id
    return ids


async def test_no_ev_assistant_no_offer(hass) -> None:
    assert ev_assistant(hass) is None


async def test_ev_assistant_vehicle_gives_live_sensor_and_today(hass) -> None:
    ids = _ev_vehicle(hass, "id3")
    assert ev_assistant(hass) == {
        "vehicles": [
            {
                "name": "id3",
                "live": ids["home_kwh"],
                "kwh_today": ids["kwh_day"],
                "cost_today": ids["cost_day"],
                "recommend": ids["charge_before_pv_recommended"],
            }
        ]
    }
    assert "ev_assistant" in available(hass)


async def test_several_vehicles_are_sorted_by_name_and_empty_ones_are_skipped(
    hass,
) -> None:
    _ev_vehicle(hass, "zoe")
    _ev_vehicle(hass, "id3")
    _ev_vehicle(hass, "nothing", keys=("charge_before_pv_recommended",))
    assert [v["name"] for v in ev_assistant(hass)["vehicles"]] == ["id3", "zoe"]


async def test_ev_sensors_of_other_platforms_are_ignored(hass) -> None:
    entry = MockConfigEntry(domain="other", title="x")
    entry.add_to_hass(hass)
    er.async_get(hass).async_get_or_create(
        "sensor",
        "other",
        "u",
        suggested_object_id="x",
        config_entry=entry,
        translation_key="home_kwh",
    )
    assert ev_assistant(hass) is None


def _pv_sensor(hass, entry, key, domain="sensor", disabled=False):
    entity = er.async_get(hass).async_get_or_create(
        domain,
        "pv_assistant",
        f"{entry.entry_id}_{key}",
        suggested_object_id=f"pv_{key}",
        config_entry=entry,
        translation_key=key,
        disabled_by=er.RegistryEntryDisabler.USER if disabled else None,
    )
    hass.states.async_set(entity.entity_id, "1")
    return entity.entity_id


async def test_no_pv_assistant_no_day_data(hass) -> None:
    assert pv_assistant(hass) is None


async def test_pv_assistant_day_entities_by_translation_key(hass) -> None:
    entry = MockConfigEntry(domain="pv_assistant", title="PV")
    entry.add_to_hass(hass)
    prod = _pv_sensor(hass, entry, "production_today")
    fc = _pv_sensor(hass, entry, "best_window_tomorrow")
    fault = _pv_sensor(hass, entry, "string_fault", domain="binary_sensor")
    _pv_sensor(hass, entry, "pv_power")  # not a day value: not offered here
    _pv_sensor(hass, entry, "autarky_today", disabled=True)
    offer = pv_assistant(hass)
    assert offer == {
        "entities": {
            "production_today": prod,
            "best_window_tomorrow": fc,
            "string_fault": fault,
        }
    }
    assert available(hass)["pv_assistant"] == offer
