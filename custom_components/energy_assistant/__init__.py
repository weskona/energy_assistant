"""Energy Assistant: sidebar panel showing household energy flows."""

from __future__ import annotations

import json
from pathlib import Path

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.typing import ConfigType

from . import websocket
from .const import DOMAIN, PANEL_URL_PATH, STATIC_URL
from .settings import normalize

_FRONTEND_DIR = Path(__file__).parent / "frontend"
PLATFORMS = [Platform.SENSOR]

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Register the WebSocket API used by the panel settings."""
    websocket.async_register(hass)
    return True


def _version() -> str:
    manifest = json.loads((Path(__file__).parent / "manifest.json").read_text())
    return manifest["version"]


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Register the panel."""
    data = hass.data.setdefault(DOMAIN, {})
    if not data.get("static_registered"):
        await hass.http.async_register_static_paths(
            [StaticPathConfig(STATIC_URL, str(_FRONTEND_DIR), cache_headers=False)]
        )
        data["static_registered"] = True

    # The panel loads the live settings over the WebSocket API. This initial copy is only a
    # fallback, so changing the settings does not need to reload the entry or the panel.
    config = normalize({**entry.data, **entry.options})

    await panel_custom.async_register_panel(
        hass,
        webcomponent_name="energy-assistant-panel",
        frontend_url_path=PANEL_URL_PATH,
        module_url=f"{STATIC_URL}/energy-assistant-panel.js?v={_version()}",
        sidebar_title="Energy Assistant",
        sidebar_icon="mdi:lightning-bolt-circle",
        require_admin=False,
        config=config,
        config_panel_domain=DOMAIN,
    )

    # Energy sensors of the selected labels (created and removed with the selection).
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Remove the panel and the sensors."""
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded:
        frontend.async_remove_panel(hass, PANEL_URL_PATH)
    return unloaded
