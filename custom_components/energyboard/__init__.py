"""Energyboard: sidebar panel showing household energy flows."""

from __future__ import annotations

import json
from pathlib import Path

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import BOOL_KEYS, CONFIG_KEYS, DOMAIN, LIST_KEYS, PANEL_URL_PATH, STATIC_URL

_FRONTEND_DIR = Path(__file__).parent / "frontend"


def _as_list(value: str | list[str] | None) -> list[str]:
    """Normalize a single entity or a list to a list for the panel."""
    if not value:
        return []
    return [value] if isinstance(value, str) else list(value)


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

    merged = {**entry.data, **entry.options}
    config = {
        key: _as_list(merged.get(key))
        if key in LIST_KEYS
        else bool(merged.get(key))
        if key in BOOL_KEYS
        else merged.get(key)
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
    """Remove the panel."""
    frontend.async_remove_panel(hass, PANEL_URL_PATH)
    return True


async def _async_reload(hass: HomeAssistant, entry: ConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)
