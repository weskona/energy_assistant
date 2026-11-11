"""Tests for the WebSocket API used by the panel settings."""

import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.energyboard.const import DOMAIN
from custom_components.energyboard.websocket import async_register


@pytest.fixture
async def entry(hass):
    async_register(hass)
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={"grid_import": "sensor.gi", "solar_power": ["sensor.pv"]},
    )
    entry.add_to_hass(hass)
    return entry


async def test_get_config(hass, hass_ws_client, entry) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "energyboard/get_config"})
    msg = await client.receive_json()
    assert msg["success"]
    assert msg["result"]["grid_import"] == ["sensor.gi"]
    assert msg["result"]["solar_power"] == ["sensor.pv"]
    assert msg["result"]["house_power"] is None


async def test_get_config_without_entry(hass, hass_ws_client) -> None:
    async_register(hass)
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "energyboard/get_config"})
    msg = await client.receive_json()
    assert not msg["success"]
    assert msg["error"]["code"] == "not_found"


async def test_update_config_stores_options_and_keeps_other_values(
    hass, hass_ws_client, entry
) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "energyboard/update_config",
            "config": {
                "device_power": ["sensor.oven"],
                "battery_charge": ["sensor.bc"],
                "invert_battery": True,
            },
        }
    )
    msg = await client.receive_json()
    assert msg["success"]
    assert msg["result"]["device_power"] == ["sensor.oven"]
    assert msg["result"]["grid_import"] == ["sensor.gi"]  # untouched
    assert entry.options["device_power"] == ["sensor.oven"]
    assert entry.options["grid_import"] == "sensor.gi"  # single stays a string
    assert entry.options["invert_battery"] is True


async def test_update_config_can_clear_a_list(hass, hass_ws_client, entry) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {"type": "energyboard/update_config", "config": {"solar_power": []}}
    )
    msg = await client.receive_json()
    assert msg["success"]
    assert msg["result"]["solar_power"] == []


async def test_update_config_requires_a_source(hass, hass_ws_client, entry) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {"type": "energyboard/update_config", "config": {"grid_import": []}}
    )
    msg = await client.receive_json()
    assert not msg["success"]
    assert msg["error"]["code"] == "no_source"
    assert entry.options == {}


async def test_update_config_rejects_invalid_entity_ids(
    hass, hass_ws_client, entry
) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {"type": "energyboard/update_config", "config": {"solar_power": ["nope"]}}
    )
    msg = await client.receive_json()
    assert not msg["success"]
    assert msg["error"]["code"] == "invalid_format"


async def test_update_config_is_admin_only(
    hass, hass_ws_client, hass_read_only_access_token, entry
) -> None:
    client = await hass_ws_client(hass, hass_read_only_access_token)
    await client.send_json_auto_id(
        {"type": "energyboard/update_config", "config": {"solar_power": []}}
    )
    msg = await client.receive_json()
    assert not msg["success"]
    assert msg["error"]["code"] == "unauthorized"
    assert entry.options == {}


async def test_update_config_stores_cleaned_patterns(
    hass, hass_ws_client, entry
) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "energyboard/update_config",
            "config": {"device_patterns": ["*_Leistung", "sensor.k*"]},
        }
    )
    msg = await client.receive_json()
    assert msg["success"]
    assert msg["result"]["device_patterns"] == ["*_leistung", "sensor.k*"]
    assert entry.options["device_patterns"] == ["*_leistung", "sensor.k*"]


async def test_update_config_rejects_invalid_patterns(
    hass, hass_ws_client, entry
) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {"type": "energyboard/update_config", "config": {"device_patterns": ["a b"]}}
    )
    msg = await client.receive_json()
    assert not msg["success"]
    assert msg["error"]["code"] == "invalid_format"
    assert entry.options == {}


async def test_update_config_stores_device_exclude(hass, hass_ws_client, entry) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "energyboard/update_config",
            "config": {"device_exclude": ["sensor.a_leistung", "sensor.b_leistung"]},
        }
    )
    msg = await client.receive_json()
    assert msg["success"]
    assert msg["result"]["device_exclude"] == ["sensor.a_leistung", "sensor.b_leistung"]
    assert entry.options["device_exclude"] == ["sensor.a_leistung", "sensor.b_leistung"]


async def test_update_config_rejects_invalid_exclude(
    hass, hass_ws_client, entry
) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {"type": "energyboard/update_config", "config": {"device_exclude": ["nope"]}}
    )
    msg = await client.receive_json()
    assert not msg["success"]
    assert msg["error"]["code"] == "invalid_format"


async def test_update_config_stores_cleaned_exclude_patterns(
    hass, hass_ws_client, entry
) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "energyboard/update_config",
            "config": {"device_exclude_patterns": ["Alpha_ESS_*", "*_string_*"]},
        }
    )
    msg = await client.receive_json()
    assert msg["success"]
    assert msg["result"]["device_exclude_patterns"] == ["alpha_ess_*", "*_string_*"]
    assert entry.options["device_exclude_patterns"] == ["alpha_ess_*", "*_string_*"]


async def test_update_config_rejects_invalid_exclude_patterns(
    hass, hass_ws_client, entry
) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "energyboard/update_config",
            "config": {"device_exclude_patterns": ["a b"]},
        }
    )
    msg = await client.receive_json()
    assert not msg["success"]
    assert msg["error"]["code"] == "invalid_format"
    assert entry.options == {}
