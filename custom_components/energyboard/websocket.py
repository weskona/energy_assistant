"""WebSocket API used by the panel to read and change its settings."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import config_validation as cv

from .const import BOOL_KEYS, CONF_HOUSE_POWER, DOMAIN, LIST_KEYS
from .settings import has_source, normalize, to_storage

_CONFIG_SCHEMA = vol.Schema(
    {
        **{vol.Optional(key): cv.entity_ids for key in LIST_KEYS},
        **{vol.Optional(key): cv.boolean for key in BOOL_KEYS},
        vol.Optional(CONF_HOUSE_POWER): vol.Any(None, cv.entity_id),
    }
)


@callback
def async_register(hass: HomeAssistant) -> None:
    """Register the commands."""
    websocket_api.async_register_command(hass, ws_get_config)
    websocket_api.async_register_command(hass, ws_update_config)


def _entry(hass: HomeAssistant):
    entries = hass.config_entries.async_entries(DOMAIN)
    return entries[0] if entries else None


@websocket_api.websocket_command({vol.Required("type"): "energyboard/get_config"})
@callback
def ws_get_config(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Return the current settings."""
    entry = _entry(hass)
    if entry is None:
        connection.send_error(msg["id"], "not_found", "Energyboard is not set up")
        return
    connection.send_result(msg["id"], normalize({**entry.data, **entry.options}))


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): "energyboard/update_config",
        vol.Required("config"): _CONFIG_SCHEMA,
    }
)
@callback
def ws_update_config(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Change the settings (admins only). Missing keys keep their value."""
    entry = _entry(hass)
    if entry is None:
        connection.send_error(msg["id"], "not_found", "Energyboard is not set up")
        return
    merged = normalize({**entry.data, **entry.options, **msg["config"]})
    if not has_source(merged):
        connection.send_error(
            msg["id"],
            "no_source",
            "Grid import, grid combined or house consumption is required",
        )
        return
    hass.config_entries.async_update_entry(entry, options=to_storage(merged))
    connection.send_result(msg["id"], merged)
