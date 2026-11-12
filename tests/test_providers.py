"""Tests for the optional data of sibling integrations."""

from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.energy_assistant.providers import available, tariffy
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
