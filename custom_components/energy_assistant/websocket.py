"""WebSocket API used by the panel to read and change its settings."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import label_registry as lr

from .const import (
    BOOL_KEYS,
    CONF_DEVICE_NAMES,
    CONF_HOUSE_POWER,
    DOMAIN,
    ID_KEYS,
    ID_REGEX,
    LIST_KEYS,
    NAME_MAX_LEN,
    PATTERN_REGEX,
    TEXT_KEYS,
)
from .pv_assistant import suggestion
from .settings import has_source, normalize, to_storage

_CONFIG_SCHEMA = vol.Schema(
    {
        **{
            vol.Optional(key): cv.entity_ids
            for key in LIST_KEYS
            if key not in TEXT_KEYS
        },
        **{
            vol.Optional(key): [vol.All(cv.string, vol.Lower, vol.Match(PATTERN_REGEX))]
            for key in TEXT_KEYS
        },
        **{vol.Optional(key): cv.boolean for key in BOOL_KEYS},
        **{
            vol.Optional(key): [vol.All(cv.string, vol.Match(ID_REGEX))]
            for key in ID_KEYS
        },
        vol.Optional(CONF_DEVICE_NAMES): {
            cv.entity_id: vol.All(cv.string, vol.Length(max=NAME_MAX_LEN))
        },
        vol.Optional(CONF_HOUSE_POWER): vol.Any(None, cv.entity_id),
    }
)


@callback
def async_register(hass: HomeAssistant) -> None:
    """Register the commands."""
    websocket_api.async_register_command(hass, ws_get_config)
    websocket_api.async_register_command(hass, ws_update_config)
    websocket_api.async_register_command(hass, ws_labels)
    websocket_api.async_register_command(hass, ws_pv_suggestion)


def _entry(hass: HomeAssistant):
    entries = hass.config_entries.async_entries(DOMAIN)
    return entries[0] if entries else None


@websocket_api.websocket_command({vol.Required("type"): "energy_assistant/get_config"})
@callback
def ws_get_config(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Return the current settings."""
    entry = _entry(hass)
    if entry is None:
        connection.send_error(msg["id"], "not_found", "Energy Assistant is not set up")
        return
    connection.send_result(msg["id"], normalize({**entry.data, **entry.options}))


@websocket_api.websocket_command({vol.Required("type"): "energy_assistant/labels"})
@callback
def ws_labels(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Return the labels of Home Assistant and which sensors carry them.

    A sensor carries the labels of its entity and of its device. Available to every
    user (the labels are only names and ids), unlike the admin-only registry commands.
    """
    labels = [
        {
            "label_id": label.label_id,
            "name": label.name,
            "icon": label.icon,
            "color": label.color,
        }
        for label in lr.async_get(hass).async_list_labels()
    ]
    devices = dr.async_get(hass)
    entities: dict[str, list[str]] = {}
    for entry in er.async_get(hass).entities.values():
        if entry.domain != "sensor":
            continue
        ids = set(entry.labels)
        if entry.device_id and (device := devices.async_get(entry.device_id)):
            ids |= set(device.labels)
        if ids:
            entities[entry.entity_id] = sorted(ids)
    connection.send_result(msg["id"], {"labels": labels, "entities": entities})


@websocket_api.websocket_command(
    {vol.Required("type"): "energy_assistant/pv_suggestion"}
)
@callback
def ws_pv_suggestion(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Return what the PV Assistant integration offers (settings, notes, plants), or null.

    PV Assistant is only read. Nothing is returned without it or without production sensors.
    """
    connection.send_result(msg["id"], suggestion(hass))


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): "energy_assistant/update_config",
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
        connection.send_error(msg["id"], "not_found", "Energy Assistant is not set up")
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
