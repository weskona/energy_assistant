"""The share of the consumption that comes from the grid, for the price of the cost sensors.

A kilowatt hour that the house takes from the grid costs the price of the contract; one that comes from the own
solar plant (or from the storage that the sun filled) only costs what could have been earned by feeding it in.
So the unit price of a moment is `grid price * share + feed-in price * (1 - share)`, where the share is what
the grid delivers of the consumption right now (like the self-sufficiency of the panel: 100 % self-sufficiency
is a share of 0). The share is read from the sensors that are set up for the balance of the house.
"""

from __future__ import annotations

import math
from typing import Any

from homeassistant.const import STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.core import HomeAssistant

from .const import (
    CONF_BATTERY_CHARGE,
    CONF_BATTERY_DISCHARGE,
    CONF_BATTERY_GRID_CHARGE,
    CONF_BATTERY_POWER,
    CONF_GRID_EXPORT,
    CONF_GRID_IMPORT,
    CONF_GRID_POWER,
    CONF_HOUSE_POWER,
    CONF_INVERT_BATTERY,
    CONF_INVERT_GRID,
    CONF_SOLAR_POWER,
)
from .settings import as_list

# Unit of a power sensor -> factor to kW. Other units are not understood.
_TO_KW = {"W": 0.001, "kW": 1.0, "MW": 1000.0}
MAX_SITE_KW = 1000.0  # a sensor of the balance above this is a glitch
_MIN_HOUSE_KW = 0.001  # below this there is no consumption to share


def _kw(hass: HomeAssistant, entity_id: str) -> float | None:
    """Power of a sensor in kW, None when it is gone, unavailable, not a number, in an unknown unit or absurd."""
    state = hass.states.get(entity_id)
    if state is None or state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
        return None
    factor = _TO_KW.get(state.attributes.get("unit_of_measurement", ""))
    if factor is None:
        return None
    try:
        value = float(state.state) * factor
    except ValueError:
        return None
    if math.isnan(value) or math.isinf(value) or abs(value) > MAX_SITE_KW:
        return None
    return value


def _values(hass: HomeAssistant, ids: list[str]) -> list[float]:
    return [v for v in (_kw(hass, i) for i in ids) if v is not None]


def _sum_pos(hass: HomeAssistant, ids: list[str]) -> float | None:
    """Sum that ignores negative readings of single sensors (production, import and export cannot be negative)."""
    values = _values(hass, ids)
    return sum(max(0.0, v) for v in values) if values else None


def _sum_abs(hass: HomeAssistant, ids: list[str]) -> float | None:
    values = _values(hass, ids)
    return sum(abs(v) for v in values) if values else None


def _signed(hass: HomeAssistant, ids: list[str], invert: bool) -> float | None:
    values = _values(hass, ids)
    if not values:
        return None
    total = sum(values)
    return -total if invert else total


def _pick(separate: float | None, combined: float | None) -> float | None:
    # Separate sensors win over the combined one: a combined meter often shows the same flow again.
    return separate if separate is not None else combined


def grid_share(hass: HomeAssistant, options: dict[str, Any]) -> float | None:
    """What the grid delivers of the consumption right now, 0 to 1; None when it cannot be told.

    `options` are the normalized settings. The consumption is the house power sensor, else the balance of the
    separate sensors (like the panel). Power that charges the storage from the grid is not consumption.
    Without a grid sensor, with unusable readings or without consumption the answer is None, and the cost sensors
    then take the grid price as before.
    """
    solar = _sum_pos(hass, as_list(options.get(CONF_SOLAR_POWER)))
    grid = _signed(
        hass, as_list(options.get(CONF_GRID_POWER)), bool(options.get(CONF_INVERT_GRID))
    )
    battery = _signed(
        hass,
        as_list(options.get(CONF_BATTERY_POWER)),
        bool(options.get(CONF_INVERT_BATTERY)),
    )
    grid_in = _pick(
        _sum_pos(hass, as_list(options.get(CONF_GRID_IMPORT))),
        None if grid is None else max(0.0, grid),
    )
    grid_out = _pick(
        _sum_pos(hass, as_list(options.get(CONF_GRID_EXPORT))),
        None if grid is None else max(0.0, -grid),
    )
    discharge = _pick(
        _sum_abs(hass, as_list(options.get(CONF_BATTERY_DISCHARGE))),
        None if battery is None else max(0.0, battery),
    )
    charge = _pick(
        _sum_abs(hass, as_list(options.get(CONF_BATTERY_CHARGE))),
        None if battery is None else max(0.0, -battery),
    )
    if grid_in is None:
        return None
    house = None
    if house_id := options.get(CONF_HOUSE_POWER):
        house = _kw(hass, house_id)
    if house is None:
        house = max(
            0.0,
            (solar or 0.0)
            + grid_in
            + (discharge or 0.0)
            - (grid_out or 0.0)
            - (charge or 0.0),
        )
    if house < _MIN_HOUSE_KW:
        return None
    # what the grid delivers to the storage is not part of the consumption
    to_storage = _sum_abs(hass, as_list(options.get(CONF_BATTERY_GRID_CHARGE))) or 0.0
    return min(1.0, max(0.0, grid_in - to_storage) / house)


def watched(options: dict[str, Any]) -> list[str]:
    """The sensors the share depends on: when one changes, the running interval is closed first."""
    ids: list[str] = []
    for key in (
        CONF_SOLAR_POWER,
        CONF_GRID_IMPORT,
        CONF_GRID_EXPORT,
        CONF_GRID_POWER,
        CONF_BATTERY_DISCHARGE,
        CONF_BATTERY_CHARGE,
        CONF_BATTERY_POWER,
        CONF_BATTERY_GRID_CHARGE,
    ):
        ids += as_list(options.get(key))
    if house := options.get(CONF_HOUSE_POWER):
        ids.append(house)
    return sorted(set(ids))
