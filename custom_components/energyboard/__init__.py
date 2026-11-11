"""Energyboard: Dashboard-Panel für Energie im Haus."""

from __future__ import annotations

import json
from pathlib import Path

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import CONFIG_KEYS, DOMAIN, LIST_KEYS, PANEL_URL_PATH, STATIC_URL

_FRONTEND_DIR = Path(__file__).parent / "frontend"


def _version() -> str:
    manifest = json.loads((Path(__file__).parent / "manifest.json").read_text())
    return manifest["version"]


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Panel registrieren."""
    data = hass.data.setdefault(DOMAIN, {})
    if not data.get("static_registered"):
        await hass.http.async_register_static_paths(
            [StaticPathConfig(STATIC_URL, str(_FRONTEND_DIR), cache_headers=False)]
        )
        data["static_registered"] = True

    merged = {**entry.data, **entry.options}
    config = {
        key: (merged.get(key) or []) if key in LIST_KEYS else merged.get(key)
        for key in CONFIG_KEYS
    }

    await panel_custom.async_register_panel(
        hass,
        webcomponent_name="energyboard-panel",
        frontend_url_path=PANEL_URL_PATH,
        module_url=f"{STATIC_URL}/energyboard-panel.js?v={_version()}",
        sidebar_title="Energyboard",
        sidebar_icon="mdi:lightning-bolt-circle",
        require_admin=False,
        config=config,
        config_panel_domain=DOMAIN,
        update=True,
    )

    entry.async_on_unload(entry.add_update_listener(_async_reload))
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Panel entfernen."""
    frontend.async_remove_panel(hass, PANEL_URL_PATH)
    return True


async def _async_reload(hass: HomeAssistant, entry: ConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)
