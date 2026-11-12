"""Optional link to the PV Assistant integration (weskona/pv-assistant).

PV Assistant is only read, never changed. When it is installed, its configuration tells which
sensors measure the PV production, the storage and the grid. This module turns them into the
settings of Energy Assistant, in one place for the config flow and the panel.
"""

from __future__ import annotations

from typing import Any

from homeassistant.core import HomeAssistant

from .const import (
    CONF_BATTERY_CHARGE,
    CONF_BATTERY_DISCHARGE,
    CONF_BATTERY_POWER,
    CONF_GRID_EXPORT,
    CONF_GRID_IMPORT,
    CONF_GRID_POWER,
    CONF_INVERT_BATTERY,
    CONF_INVERT_GRID,
    CONF_SOLAR_POWER,
)

PV_DOMAIN = "pv_assistant"


def _ids(value: Any) -> list[str]:
    """A sensor id or a list of them as a clean list."""
    if isinstance(value, str):
        return [value] if value else []
    if isinstance(value, (list, tuple)):
        return [v for v in value if isinstance(v, str) and v]
    return []


def targets_from(data: dict[str, Any]) -> tuple[dict[str, Any], dict[str, bool]]:
    """Settings of Energy Assistant from the configuration of PV Assistant, plus notes.

    Storage: combined sensors count "+ = from the storage" in both integrations, inverted on request.
    Separate in/out sensors may report negative values; Energy Assistant counts their magnitude.
    Grid: import sensors fit as they are. A feed-in sensor that reports feed-in as negative values is a
    combined meter (import +, feed-in −): it goes into the combined grid field and is not counted twice
    when it is also one of the import sensors.
    """
    targets: dict[str, Any] = {}
    if solar := _ids(data.get("production_power_sensors")):
        targets[CONF_SOLAR_POWER] = solar

    if combined := _ids(data.get("storage_combined_power_sensors")):
        targets[CONF_BATTERY_POWER] = combined
        targets[CONF_INVERT_BATTERY] = bool(data.get("invert_storage_combined_power"))
    charge = _ids(data.get("storage_in_power_sensors"))
    discharge = _ids(data.get("storage_out_power_sensors"))
    if charge:
        targets[CONF_BATTERY_CHARGE] = charge
    if discharge:
        targets[CONF_BATTERY_DISCHARGE] = discharge

    feed_in = _ids(data.get("feed_in_power_sensor"))
    negative = bool(data.get("invert_feed_in_power")) and bool(feed_in)
    grid_import = [
        i
        for i in _ids(data.get("grid_import_power_sensors"))
        if not (negative and i in feed_in)
    ]
    if grid_import:
        targets[CONF_GRID_IMPORT] = grid_import
    if negative:
        targets[CONF_GRID_POWER] = feed_in
        targets[CONF_INVERT_GRID] = False
    elif feed_in:
        targets[CONF_GRID_EXPORT] = feed_in

    notes = {
        "feed_in_negative": negative,
        "storage_absolute": bool(data.get("abs_storage_power"))
        and bool(charge or discharge),
    }
    return targets, notes


def plants_from(
    data: dict[str, Any], settings: dict[str, Any], friendly: dict[str, str]
) -> list[dict[str, Any]]:
    """Plants of PV Assistant: the saved inverters with their sensors, then every other sensor on its own."""
    sensors = _ids(data.get("production_power_sensors"))
    strings = settings.get("strings") or {}

    def name_of(sensor_id: str) -> str:
        return (
            strings.get(sensor_id, {}).get("name")
            or friendly.get(sensor_id)
            or sensor_id
        )

    plants: list[dict[str, Any]] = []
    taken: set[str] = set()
    for inverter in settings.get("inverters") or []:
        ids = [
            i for i in _ids(inverter.get("sensors")) if i in sensors and i not in taken
        ]
        if not ids:
            continue
        taken.update(ids)
        plants.append({"name": inverter.get("name") or name_of(ids[0]), "sensors": ids})
    plants.extend(
        {"name": name_of(i), "sensors": [i]} for i in sensors if i not in taken
    )
    return plants


def suggestion(hass: HomeAssistant) -> dict[str, Any] | None:
    """What PV Assistant offers (targets, notes, plants), or None without PV Assistant or without sensors."""
    entries = hass.config_entries.async_entries(PV_DOMAIN)
    if not entries:
        return None
    data = {**entries[0].data, **entries[0].options}
    targets, notes = targets_from(data)
    if not targets:
        return None
    settings = hass.data.get(PV_DOMAIN, {}).get("settings", {})
    friendly = {
        state.entity_id: state.attributes.get("friendly_name")
        for state in hass.states.async_all("sensor")
        if state.attributes.get("friendly_name")
    }
    return {
        "targets": targets,
        "notes": notes,
        "plants": plants_from(data, settings, friendly),
    }
