"""Set the integration up with the real frontend, http and panel_custom.

The other tests replace the panel registration with a mock. This one uses the real Home
Assistant components so a wrong call (e.g. an unknown argument) makes the setup fail here
and not only on a real instance.
"""

from pathlib import Path

import pytest
from homeassistant.config_entries import ConfigEntryState
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.energy_assistant.const import DOMAIN

FRONTEND = Path(__file__).parent.parent / "custom_components/energy_assistant/frontend"


@pytest.fixture
async def entry(hass):
    assert await async_setup_component(hass, "frontend", {})
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={"grid_import": "sensor.gi", "solar_power": ["sensor.pv"]},
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


async def _panels(hass, hass_ws_client) -> dict:
    ws = await hass_ws_client(hass)
    await ws.send_json_auto_id({"type": "get_panels"})
    return (await ws.receive_json())["result"]


async def test_setup_registers_the_panel(hass, hass_ws_client, entry) -> None:
    assert entry.state is ConfigEntryState.LOADED
    panel = (await _panels(hass, hass_ws_client))["energy-assistant"]
    assert panel["component_name"] == "custom"
    assert panel["title"] == "Energy Assistant"
    assert panel["require_admin"] is False
    custom = panel["config"]["_panel_custom"]
    assert custom["name"] == "energy-assistant-panel"
    assert custom["module_url"].startswith(
        "/energy_assistant_static/energy-assistant-panel.js"
    )
    assert panel["config"]["grid_import"] == ["sensor.gi"]


async def test_panel_files_are_served(hass, hass_client, entry) -> None:
    client = await hass_client()
    for name in (
        "energy-assistant-panel.js",
        "energy-assistant-tokens.css",
        "fonts/outfit-latin-wght-normal.woff2",
    ):
        resp = await client.get(f"/energy_assistant_static/{name}")
        assert resp.status == 200, name
        assert await resp.read() == (FRONTEND / name).read_bytes(), name


async def test_reload_and_unload(hass, hass_ws_client, entry) -> None:
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    assert entry.state is ConfigEntryState.LOADED
    assert "energy-assistant" in await _panels(hass, hass_ws_client)

    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    assert "energy-assistant" not in await _panels(hass, hass_ws_client)


async def test_panel_settings_over_the_real_websocket(
    hass, hass_ws_client, entry
) -> None:
    ws = await hass_ws_client(hass)
    await ws.send_json_auto_id({"type": "energy_assistant/get_config"})
    msg = await ws.receive_json()
    assert msg["success"]
    assert msg["result"]["solar_power"] == ["sensor.pv"]

    await ws.send_json_auto_id(
        {
            "type": "energy_assistant/update_config",
            "config": {"device_patterns": ["*_power"]},
        }
    )
    msg = await ws.receive_json()
    assert msg["success"]
    assert entry.options["device_patterns"] == ["*_power"]
    assert entry.state is ConfigEntryState.LOADED  # saving does not reload the entry
