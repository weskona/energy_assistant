"""Konfiguration von Energyboard."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.config_entries import ConfigEntry, ConfigFlow, OptionsFlow
from homeassistant.core import callback
from homeassistant.data_entry_flow import FlowResult
from homeassistant.helpers import selector

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
    DOMAIN,
)

_SINGLE = selector.EntitySelector(
    selector.EntitySelectorConfig(domain="sensor", device_class="power")
)
_MULTI = selector.EntitySelector(
    selector.EntitySelectorConfig(domain="sensor", device_class="power", multiple=True)
)


def _optional(defaults: dict[str, Any], key: str) -> vol.Optional:
    if defaults.get(key):
        return vol.Optional(key, description={"suggested_value": defaults[key]})
    return vol.Optional(key)


def _grid_schema(defaults: dict[str, Any]) -> vol.Schema:
    """Schritt 1: Netz und Haus."""
    return vol.Schema(
        {
            _optional(defaults, CONF_GRID_POWER): _MULTI,
            vol.Optional(
                CONF_INVERT_GRID, default=bool(defaults.get(CONF_INVERT_GRID))
            ): bool,
            _optional(defaults, CONF_GRID_IMPORT): _SINGLE,
            _optional(defaults, CONF_GRID_EXPORT): _SINGLE,
            _optional(defaults, CONF_HOUSE_POWER): _SINGLE,
        }
    )


def _storage_schema(defaults: dict[str, Any]) -> vol.Schema:
    """Schritt 2: PV und Speicher."""
    return vol.Schema(
        {
            _optional(defaults, CONF_SOLAR_POWER): _MULTI,
            _optional(defaults, CONF_BATTERY_POWER): _MULTI,
            vol.Optional(
                CONF_INVERT_BATTERY, default=bool(defaults.get(CONF_INVERT_BATTERY))
            ): bool,
            _optional(defaults, CONF_BATTERY_DISCHARGE): _MULTI,
            _optional(defaults, CONF_BATTERY_CHARGE): _MULTI,
            _optional(defaults, CONF_BATTERY_GRID_CHARGE): _SINGLE,
        }
    )


def _validate(user_input: dict[str, Any]) -> dict[str, str]:
    """Hausverbrauch direkt oder Netzsensor zur Berechnung ist nötig."""
    if not (
        user_input.get(CONF_HOUSE_POWER)
        or user_input.get(CONF_GRID_IMPORT)
        or user_input.get(CONF_GRID_POWER)
    ):
        return {"base": "no_source"}
    return {}


class EnergyboardConfigFlow(ConfigFlow, domain=DOMAIN):
    """Einrichtung in zwei Schritten: Netz/Haus, dann PV/Speicher."""

    VERSION = 1

    def __init__(self) -> None:
        self._data: dict[str, Any] = {}

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            errors = _validate(user_input)
            if not errors:
                self._data.update(user_input)
                return await self.async_step_storage()
        return self.async_show_form(
            step_id="user",
            data_schema=_grid_schema(user_input or self._data),
            errors=errors,
        )

    async def async_step_storage(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        if user_input is not None:
            return self.async_create_entry(
                title="Energyboard", data={**self._data, **user_input}
            )
        return self.async_show_form(
            step_id="storage", data_schema=_storage_schema(self._data)
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return EnergyboardOptionsFlow()


class EnergyboardOptionsFlow(OptionsFlow):
    """Sensoren nachträglich ändern, ebenfalls in zwei Schritten."""

    def __init__(self) -> None:
        self._data: dict[str, Any] = {}

    @property
    def _current(self) -> dict[str, Any]:
        return {**self.config_entry.data, **self.config_entry.options, **self._data}

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            errors = _validate(user_input)
            if not errors:
                self._data.update(user_input)
                return await self.async_step_storage()
        return self.async_show_form(
            step_id="init",
            data_schema=_grid_schema(user_input or self._current),
            errors=errors,
        )

    async def async_step_storage(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        if user_input is not None:
            return self.async_create_entry(data={**self._current, **user_input})
        return self.async_show_form(
            step_id="storage", data_schema=_storage_schema(self._current)
        )
