"""Config flow for Energyboard."""

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
    CONF_DEVICE_EXCLUDE,
    CONF_DEVICE_PATTERNS,
    CONF_DEVICE_POWER,
    CONF_GRID_EXPORT,
    CONF_GRID_IMPORT,
    CONF_GRID_POWER,
    CONF_HOUSE_POWER,
    CONF_INVERT_BATTERY,
    CONF_INVERT_GRID,
    CONF_SOLAR_POWER,
    DOMAIN,
)
from .settings import clean_patterns, has_source, valid_patterns

_SINGLE = selector.EntitySelector(
    selector.EntitySelectorConfig(domain="sensor", device_class="power")
)
_PATTERNS = selector.TextSelector(selector.TextSelectorConfig(multiple=True))
_MULTI = selector.EntitySelector(
    selector.EntitySelectorConfig(domain="sensor", device_class="power", multiple=True)
)


def _optional(defaults: dict[str, Any], key: str) -> vol.Optional:
    if defaults.get(key):
        return vol.Optional(key, description={"suggested_value": defaults[key]})
    return vol.Optional(key)


def _grid_schema(defaults: dict[str, Any]) -> vol.Schema:
    """Step 1: grid and house."""
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
    """Step 2: solar and storage."""
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


def _devices_schema(defaults: dict[str, Any]) -> vol.Schema:
    """Step 3: individual devices."""
    return vol.Schema(
        {
            _optional(defaults, CONF_DEVICE_PATTERNS): _PATTERNS,
            _optional(defaults, CONF_DEVICE_EXCLUDE): _MULTI,
            _optional(defaults, CONF_DEVICE_POWER): _MULTI,
        }
    )


def _clean_devices(
    user_input: dict[str, Any],
) -> tuple[dict[str, Any], dict[str, str]]:
    """Normalize the device patterns and check that they only use allowed characters."""
    cleaned = {
        **user_input,
        CONF_DEVICE_PATTERNS: clean_patterns(user_input.get(CONF_DEVICE_PATTERNS)),
    }
    if not valid_patterns(cleaned[CONF_DEVICE_PATTERNS]):
        return cleaned, {CONF_DEVICE_PATTERNS: "invalid_pattern"}
    return cleaned, {}


def _validate(user_input: dict[str, Any]) -> dict[str, str]:
    """Require house consumption or a grid sensor to calculate it."""
    if not has_source(user_input):
        return {"base": "no_source"}
    return {}


class EnergyboardConfigFlow(ConfigFlow, domain=DOMAIN):
    """Setup in three steps: grid/house, solar/storage, devices."""

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
            self._data.update(user_input)
            return await self.async_step_devices()
        return self.async_show_form(
            step_id="storage", data_schema=_storage_schema(self._data)
        )

    async def async_step_devices(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            user_input, errors = _clean_devices(user_input)
            if not errors:
                return self.async_create_entry(
                    title="Energyboard", data={**self._data, **user_input}
                )
        return self.async_show_form(
            step_id="devices",
            data_schema=_devices_schema(user_input or self._data),
            errors=errors,
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return EnergyboardOptionsFlow()


class EnergyboardOptionsFlow(OptionsFlow):
    """Change sensors later, also in three steps."""

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
            self._data.update(user_input)
            return await self.async_step_devices()
        return self.async_show_form(
            step_id="storage", data_schema=_storage_schema(self._current)
        )

    async def async_step_devices(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            user_input, errors = _clean_devices(user_input)
            if not errors:
                return self.async_create_entry(data={**self._current, **user_input})
        return self.async_show_form(
            step_id="devices",
            data_schema=_devices_schema(user_input or self._current),
            errors=errors,
        )
