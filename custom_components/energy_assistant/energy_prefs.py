"""The Energy dashboard of Home Assistant as an offer for the energy counters of the balance tab.

Energy Assistant only reads the preferences of the Energy dashboard, it never changes them. Without
the dashboard (or without anything set up in it) there is no offer.
"""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.core import HomeAssistant

from .const import (
    CONF_ENERGY_CHARGE,
    CONF_ENERGY_DISCHARGE,
    CONF_ENERGY_GRID_EXPORT,
    CONF_ENERGY_GRID_IMPORT,
    CONF_ENERGY_SOLAR,
)

_LOGGER = logging.getLogger(__name__)


def _add(targets: dict[str, list[str]], key: str, statistic_id: Any) -> None:
    """Add a counter. Only sensor entities count (external statistics have no entity)."""
    if isinstance(statistic_id, str) and statistic_id.startswith("sensor."):
        ids = targets.setdefault(key, [])
        if statistic_id not in ids:
            ids.append(statistic_id)


def targets_from_prefs(prefs: dict[str, Any] | None) -> dict[str, list[str]]:
    """Energy counters of the settings from the preferences of the Energy dashboard.

    Grid: `flow_from` is the import and `flow_to` the export (older versions kept both as
    `stat_energy_from` / `stat_energy_to` on the source itself). Solar: `stat_energy_from`.
    Battery: `stat_energy_from` is the energy out of the battery (discharge), `stat_energy_to` into it.
    """
    targets: dict[str, list[str]] = {}
    for source in (prefs or {}).get("energy_sources", []) or []:
        kind = source.get("type")
        if kind == "grid":
            flows_from = source.get("flow_from")
            flows_to = source.get("flow_to")
            if flows_from is None and flows_to is None:  # the older shape
                flows_from = [{"stat_energy_from": source.get("stat_energy_from")}]
                flows_to = [{"stat_energy_to": source.get("stat_energy_to")}]
            for flow in flows_from or []:
                _add(targets, CONF_ENERGY_GRID_IMPORT, flow.get("stat_energy_from"))
            for flow in flows_to or []:
                _add(targets, CONF_ENERGY_GRID_EXPORT, flow.get("stat_energy_to"))
        elif kind == "solar":
            _add(targets, CONF_ENERGY_SOLAR, source.get("stat_energy_from"))
        elif kind == "battery":
            _add(targets, CONF_ENERGY_DISCHARGE, source.get("stat_energy_from"))
            _add(targets, CONF_ENERGY_CHARGE, source.get("stat_energy_to"))
    return targets


async def async_energy_suggestion(hass: HomeAssistant) -> dict[str, Any] | None:
    """What the Energy dashboard offers, or None without the dashboard or without counters."""
    try:
        from homeassistant.components.energy.data import async_get_manager

        manager = await async_get_manager(hass)
        prefs = manager.data
    except Exception:
        _LOGGER.debug("The Energy dashboard is not available", exc_info=True)
        return None
    targets = targets_from_prefs(prefs)
    return {"targets": targets} if targets else None
