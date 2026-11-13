"""Config flow for Energy Assistant."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.config_entries import ConfigEntry, ConfigFlow, OptionsFlow
from homeassistant.core import callback
from homeassistant.data_entry_flow import FlowResult
from homeassistant.helpers import selector

from .const import (
    CONF_AREA_IDS,
    CONF_BATTERY_CAPACITY,
    CONF_BATTERY_CHARGE,
    CONF_BATTERY_DISCHARGE,
    CONF_BATTERY_GRID_CHARGE,
    CONF_BATTERY_MIN_SOC,
    CONF_BATTERY_POWER,
    CONF_BATTERY_SOC,
    CONF_DEVICE_EXCLUDE,
    CONF_DEVICE_EXCLUDE_PATTERNS,
    CONF_DEVICE_PATTERNS,
    CONF_DEVICE_POWER,
    CONF_ENERGY_CHARGE,
    CONF_ENERGY_DISCHARGE,
    CONF_ENERGY_GRID_EXPORT,
    CONF_ENERGY_GRID_IMPORT,
    CONF_ENERGY_HOUSE,
    CONF_ENERGY_SOLAR,
    CONF_GRID_EXPORT,
    CONF_GRID_IMPORT,
    CONF_GRID_POWER,
    CONF_HOUSE_POWER,
    CONF_INVERT_BATTERY,
    CONF_INVERT_GRID,
    CONF_LABEL_IDS,
    CONF_SOLAR_POWER,
    DOMAIN,
    NUMBER_KEYS,
    SINGLE_KEYS,
    TEXT_KEYS,
)
from .energy_prefs import async_energy_suggestion
from .pv_assistant import suggestion
from .settings import clean_ids, clean_patterns, has_source, valid_patterns

_SINGLE = selector.EntitySelector(
    selector.EntitySelectorConfig(domain="sensor", device_class="power")
)
_PATTERNS = selector.TextSelector(selector.TextSelectorConfig(multiple=True))
_LABELS = selector.LabelSelector(selector.LabelSelectorConfig(multiple=True))
_AREAS = selector.AreaSelector(selector.AreaSelectorConfig(multiple=True))
_MULTI = selector.EntitySelector(
    selector.EntitySelectorConfig(domain="sensor", device_class="power", multiple=True)
)
_ENERGY = selector.EntitySelector(
    selector.EntitySelectorConfig(domain="sensor", device_class="energy", multiple=True)
)
_SOC = selector.EntitySelector(selector.EntitySelectorConfig(domain="sensor"))
_CAPACITY = selector.NumberSelector(
    selector.NumberSelectorConfig(
        min=0,
        max=100000,
        step="any",
        mode=selector.NumberSelectorMode.BOX,
        unit_of_measurement="kWh",
    )
)
_MIN_SOC = selector.NumberSelector(
    selector.NumberSelectorConfig(
        min=0,
        max=100,
        step="any",
        mode=selector.NumberSelectorMode.BOX,
        unit_of_measurement="%",
    )
)


def _optional(
    defaults: dict[str, Any],
    key: str,
    multiple: bool = False,
    single: bool = False,
) -> vol.Optional:
    value = defaults.get(key)
    if value or value == 0:
        if multiple and isinstance(value, str):
            value = [value]  # older entries stored a single sensor as text
        if single and isinstance(value, list):
            value = value[0]  # a single field holds one sensor, offers come as lists
        return vol.Optional(key, description={"suggested_value": value})
    return vol.Optional(key)


def _grid_schema(defaults: dict[str, Any]) -> vol.Schema:
    """Step 1: grid and house."""
    return vol.Schema(
        {
            _optional(defaults, CONF_GRID_POWER): _MULTI,
            vol.Optional(
                CONF_INVERT_GRID, default=bool(defaults.get(CONF_INVERT_GRID))
            ): bool,
            _optional(defaults, CONF_GRID_IMPORT, multiple=True): _MULTI,
            _optional(defaults, CONF_GRID_EXPORT, multiple=True): _MULTI,
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
            _optional(defaults, CONF_BATTERY_SOC, single=True): _SOC,
            _optional(defaults, CONF_BATTERY_CAPACITY): _CAPACITY,
            _optional(defaults, CONF_BATTERY_MIN_SOC): _MIN_SOC,
        }
    )


def _energy_schema(defaults: dict[str, Any]) -> vol.Schema:
    """Step 3: the energy counters of the balance tab."""
    return vol.Schema(
        {
            _optional(defaults, CONF_ENERGY_SOLAR, multiple=True): _ENERGY,
            _optional(defaults, CONF_ENERGY_GRID_IMPORT, multiple=True): _ENERGY,
            _optional(defaults, CONF_ENERGY_GRID_EXPORT, multiple=True): _ENERGY,
            _optional(defaults, CONF_ENERGY_CHARGE, multiple=True): _ENERGY,
            _optional(defaults, CONF_ENERGY_DISCHARGE, multiple=True): _ENERGY,
            _optional(defaults, CONF_ENERGY_HOUSE, multiple=True): _ENERGY,
        }
    )


def _devices_schema(defaults: dict[str, Any]) -> vol.Schema:
    """Step 4: individual devices."""
    return vol.Schema(
        {
            _optional(defaults, CONF_DEVICE_PATTERNS): _PATTERNS,
            _optional(defaults, CONF_DEVICE_EXCLUDE_PATTERNS): _PATTERNS,
            _optional(defaults, CONF_DEVICE_EXCLUDE): _MULTI,
            _optional(defaults, CONF_DEVICE_POWER): _MULTI,
            _optional(defaults, CONF_AREA_IDS): _AREAS,
            _optional(defaults, CONF_LABEL_IDS): _LABELS,
        }
    )


def _with_cleared(schema: vol.Schema, user_input: dict[str, Any]) -> dict[str, Any]:
    """The input plus an empty value for every field of the step that was left empty.

    A cleared field is missing from the input; without this the old value would come back
    when the options are merged with the stored ones.
    """
    result = dict(user_input)
    for marker in schema.schema:
        key = str(marker)
        if key in result:
            continue
        single = key in NUMBER_KEYS or key in SINGLE_KEYS or key == CONF_HOUSE_POWER
        result[key] = None if single else []
    return result


async def _energy_defaults(hass: Any, data: dict[str, Any]) -> dict[str, Any]:
    """The settings, with the counters of the Energy dashboard filled in where none are set yet."""
    offer = await async_energy_suggestion(hass)
    targets = (offer or {}).get("targets", {})
    return {
        **{k: v for k, v in targets.items() if not data.get(k)},
        **{k: v for k, v in data.items() if v},
    }


def _clean_devices(
    user_input: dict[str, Any],
) -> tuple[dict[str, Any], dict[str, str]]:
    """Normalize the patterns and check that they only use allowed characters."""
    cleaned = {
        **user_input,
        CONF_LABEL_IDS: clean_ids(user_input.get(CONF_LABEL_IDS)),
        CONF_AREA_IDS: clean_ids(user_input.get(CONF_AREA_IDS)),
    }
    errors: dict[str, str] = {}
    for key in TEXT_KEYS:
        cleaned[key] = clean_patterns(user_input.get(key))
        if not valid_patterns(cleaned[key]):
            errors[key] = "invalid_pattern"
    return cleaned, errors


def _pv_schema() -> vol.Schema:
    """Question asked first when PV Assistant is installed."""
    return vol.Schema({vol.Required("use_pv", default=True): bool})


def _pv_summary(offer: dict[str, Any]) -> str:
    """Short list of what would be taken over."""
    labels = (
        (CONF_SOLAR_POWER, "solar"),
        (CONF_BATTERY_POWER, "storage combined"),
        (CONF_BATTERY_CHARGE, "storage charging"),
        (CONF_BATTERY_DISCHARGE, "storage discharging"),
        (CONF_GRID_IMPORT, "grid import"),
        (CONF_GRID_EXPORT, "grid export"),
        (CONF_GRID_POWER, "grid combined"),
    )
    return ", ".join(
        f"{label} {len(offer['targets'][key])}"
        for key, label in labels
        if key in offer["targets"]
    )


def _validate(user_input: dict[str, Any]) -> dict[str, str]:
    """Require house consumption or a grid sensor to calculate it."""
    if not has_source(user_input):
        return {"base": "no_source"}
    return {}


class EnergyAssistantConfigFlow(ConfigFlow, domain=DOMAIN):
    """Setup in four steps: grid/house, solar/storage, energy counters, devices."""

    VERSION = 1

    def __init__(self) -> None:
        self._data: dict[str, Any] = {}
        self._pv_asked = False
        self._energy_seeded = False

    async def async_step_pv(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """PV Assistant is installed: take over its sensors as defaults?"""
        offer = suggestion(self.hass)
        if user_input is not None:
            if user_input["use_pv"] and offer:
                self._data.update(offer["targets"])
            return await self.async_step_user()
        return self.async_show_form(
            step_id="pv",
            data_schema=_pv_schema(),
            description_placeholders={"summary": _pv_summary(offer) if offer else ""},
        )

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        if user_input is None and not self._pv_asked:
            self._pv_asked = True
            if suggestion(self.hass):
                return await self.async_step_pv()
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
            return await self.async_step_energy()
        return self.async_show_form(
            step_id="storage", data_schema=_storage_schema(self._data)
        )

    async def async_step_energy(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Energy counters; the Energy dashboard of Home Assistant fills them in the first time."""
        if user_input is not None:
            self._data.update(user_input)
            return await self.async_step_devices()
        defaults = self._data
        if not self._energy_seeded:
            self._energy_seeded = True
            defaults = await _energy_defaults(self.hass, self._data)
        return self.async_show_form(
            step_id="energy", data_schema=_energy_schema(defaults)
        )

    async def async_step_devices(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            user_input, errors = _clean_devices(user_input)
            if not errors:
                return self.async_create_entry(
                    title="Energy Assistant", data={**self._data, **user_input}
                )
        return self.async_show_form(
            step_id="devices",
            data_schema=_devices_schema(user_input or self._data),
            errors=errors,
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return EnergyAssistantOptionsFlow()


class EnergyAssistantOptionsFlow(OptionsFlow):
    """Change sensors later, also in four steps."""

    def __init__(self) -> None:
        self._data: dict[str, Any] = {}
        self._pv_asked = False
        self._energy_seeded = False

    @property
    def _current(self) -> dict[str, Any]:
        return {**self.config_entry.data, **self.config_entry.options, **self._data}

    async def async_step_pv(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """PV Assistant is installed: replace the sensors with its sensors?"""
        offer = suggestion(self.hass)
        if user_input is not None:
            if user_input["use_pv"] and offer:
                self._data.update(offer["targets"])
            return await self.async_step_init()
        return self.async_show_form(
            step_id="pv",
            data_schema=_pv_schema(),
            description_placeholders={"summary": _pv_summary(offer) if offer else ""},
        )

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        if user_input is None and not self._pv_asked:
            self._pv_asked = True
            if suggestion(self.hass):
                return await self.async_step_pv()
        errors: dict[str, str] = {}
        if user_input is not None:
            user_input = _with_cleared(_grid_schema({}), user_input)
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
            self._data.update(_with_cleared(_storage_schema({}), user_input))
            return await self.async_step_energy()
        return self.async_show_form(
            step_id="storage", data_schema=_storage_schema(self._current)
        )

    async def async_step_energy(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Energy counters; the Energy dashboard fills them in the first time if none are set."""
        if user_input is not None:
            self._data.update(_with_cleared(_energy_schema({}), user_input))
            return await self.async_step_devices()
        defaults = self._current
        if not self._energy_seeded:
            self._energy_seeded = True
            defaults = await _energy_defaults(self.hass, self._current)
        return self.async_show_form(
            step_id="energy", data_schema=_energy_schema(defaults)
        )

    async def async_step_devices(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            user_input, errors = _clean_devices(
                _with_cleared(_devices_schema({}), user_input)
            )
            if not errors:
                return self.async_create_entry(data={**self._current, **user_input})
        return self.async_show_form(
            step_id="devices",
            data_schema=_devices_schema(user_input or self._current),
            errors=errors,
        )
