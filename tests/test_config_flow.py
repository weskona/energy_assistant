"""Tests for the two-step config flow and the options flow."""

from unittest.mock import patch

from homeassistant import config_entries
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.energyboard.const import DOMAIN

SETUP = "custom_components.energyboard.async_setup_entry"


async def _start(hass: HomeAssistant):
    return await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )


async def test_step1_fields(hass: HomeAssistant) -> None:
    result = await _start(hass)
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "user"
    assert list(result["data_schema"].schema) == [
        "grid_power",
        "invert_grid",
        "grid_import",
        "grid_export",
        "house_power",
    ]


async def test_step1_requires_a_source(hass: HomeAssistant) -> None:
    result = await _start(hass)
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "user"
    assert result["errors"] == {"base": "no_source"}


async def test_full_flow_with_combined_sensors(hass: HomeAssistant) -> None:
    result = await _start(hass)
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"grid_power": ["sensor.grid"], "invert_grid": True}
    )
    assert result["step_id"] == "storage"
    assert list(result["data_schema"].schema) == [
        "solar_power",
        "battery_power",
        "invert_battery",
        "battery_discharge",
        "battery_charge",
        "battery_grid_charge",
    ]
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        {
            "solar_power": ["sensor.pv_1", "sensor.pv_2"],
            "battery_charge": ["sensor.bat_in"],
            "battery_grid_charge": "sensor.bat_grid",
        },
    )
    assert result["step_id"] == "devices"
    assert list(result["data_schema"].schema) == ["device_patterns", "device_power"]
    with patch(SETUP, return_value=True):
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"],
            {
                "device_patterns": [" *_Power ", "*_power", "sensor.x_*"],
                "device_power": ["sensor.oven", "sensor.fridge"],
            },
        )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "Energyboard"
    assert result["data"] == {
        "grid_power": ["sensor.grid"],
        "invert_grid": True,
        "solar_power": ["sensor.pv_1", "sensor.pv_2"],
        "battery_charge": ["sensor.bat_in"],
        "battery_grid_charge": "sensor.bat_grid",
        "invert_battery": False,
        "device_patterns": ["*_power", "sensor.x_*"],
        "device_power": ["sensor.oven", "sensor.fridge"],
    }


async def test_flow_with_separate_import_only(hass: HomeAssistant) -> None:
    result = await _start(hass)
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"grid_import": "sensor.import"}
    )
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
    with patch(SETUP, return_value=True):
        result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["data"]["grid_import"] == "sensor.import"


async def test_house_power_alone_is_enough(hass: HomeAssistant) -> None:
    result = await _start(hass)
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"house_power": "sensor.house"}
    )
    assert result["step_id"] == "storage"


async def test_single_instance(hass: HomeAssistant) -> None:
    MockConfigEntry(domain=DOMAIN, data={"house_power": "sensor.h"}).add_to_hass(hass)
    result = await _start(hass)
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "single_instance_allowed"


async def test_options_flow_prefills_and_saves(hass: HomeAssistant) -> None:
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={"grid_import": "sensor.import", "solar_power": ["sensor.pv"]},
    )
    entry.add_to_hass(hass)
    result = await hass.config_entries.options.async_init(entry.entry_id)
    assert result["step_id"] == "init"
    schema = {str(k): k for k in result["data_schema"].schema}
    assert schema["grid_import"].description == {"suggested_value": "sensor.import"}

    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"grid_import": "sensor.import2"}
    )
    assert result["step_id"] == "storage"
    schema = {str(k): k for k in result["data_schema"].schema}
    assert schema["solar_power"].description == {"suggested_value": ["sensor.pv"]}

    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"solar_power": ["sensor.pv", "sensor.pv_2"]}
    )
    assert result["step_id"] == "devices"
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"device_power": ["sensor.oven"]}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["data"]["grid_import"] == "sensor.import2"
    assert result["data"]["solar_power"] == ["sensor.pv", "sensor.pv_2"]
    assert result["data"]["device_power"] == ["sensor.oven"]


async def test_options_flow_requires_a_source(hass: HomeAssistant) -> None:
    entry = MockConfigEntry(domain=DOMAIN, data={"house_power": "sensor.h"})
    entry.add_to_hass(hass)
    result = await hass.config_entries.options.async_init(entry.entry_id)
    result = await hass.config_entries.options.async_configure(result["flow_id"], {})
    assert result["errors"] == {"base": "no_source"}


async def test_devices_step_rejects_invalid_patterns(hass: HomeAssistant) -> None:
    result = await _start(hass)
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"house_power": "sensor.house"}
    )
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
    assert result["step_id"] == "devices"
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"device_patterns": ["*_power", "bad pattern!"]}
    )
    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {"device_patterns": "invalid_pattern"}
