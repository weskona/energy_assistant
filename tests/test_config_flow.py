"""Tests for the two-step config flow and the options flow."""

from unittest.mock import AsyncMock, patch

from homeassistant import config_entries
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.energy_assistant.const import DOMAIN

SETUP = "custom_components.energy_assistant.async_setup_entry"


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
        "battery_soc",
        "battery_capacity",
        "battery_min_soc",
    ]
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        {
            "solar_power": ["sensor.pv_1", "sensor.pv_2"],
            "battery_charge": ["sensor.bat_in"],
            "battery_grid_charge": "sensor.bat_grid",
            "battery_soc": "sensor.soc",
            "battery_capacity": 10.5,
            "battery_min_soc": 10,
        },
    )
    assert result["step_id"] == "energy"
    assert list(result["data_schema"].schema) == [
        "energy_solar",
        "energy_grid_import",
        "energy_grid_export",
        "energy_battery_charge",
        "energy_battery_discharge",
        "energy_house",
    ]
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        {"energy_solar": ["sensor.pv_e"], "energy_grid_import": ["sensor.imp_e"]},
    )
    assert result["step_id"] == "devices"
    assert list(result["data_schema"].schema) == [
        "device_patterns",
        "device_exclude_patterns",
        "device_exclude",
        "device_power",
        "area_ids",
        "label_ids",
    ]
    with patch(SETUP, return_value=True):
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"],
            {
                "device_patterns": [" *_Power ", "*_power", "sensor.x_*"],
                "device_exclude_patterns": [" Alpha_ESS_* ", "alpha_ess_*"],
                "device_exclude": ["sensor.skip_power"],
                "device_power": ["sensor.oven", "sensor.fridge"],
                "area_ids": ["kueche", " kueche ", "wohnzimmer"],
                "label_ids": ["klima", " klima ", "licht"],
            },
        )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "Energy Assistant"
    assert result["data"] == {
        "grid_power": ["sensor.grid"],
        "invert_grid": True,
        "solar_power": ["sensor.pv_1", "sensor.pv_2"],
        "battery_charge": ["sensor.bat_in"],
        "battery_grid_charge": "sensor.bat_grid",
        "battery_soc": "sensor.soc",
        "battery_capacity": 10.5,
        "battery_min_soc": 10,
        "energy_solar": ["sensor.pv_e"],
        "energy_grid_import": ["sensor.imp_e"],
        "invert_battery": False,
        "device_patterns": ["*_power", "sensor.x_*"],
        "device_exclude_patterns": ["alpha_ess_*"],
        "device_exclude": ["sensor.skip_power"],
        "device_power": ["sensor.oven", "sensor.fridge"],
        "area_ids": ["kueche", "wohnzimmer"],
        "label_ids": ["klima", "licht"],
    }


async def test_flow_with_separate_import_only(hass: HomeAssistant) -> None:
    result = await _start(hass)
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"grid_import": ["sensor.import"]}
    )
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
    with patch(SETUP, return_value=True):
        result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["data"]["grid_import"] == ["sensor.import"]


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
    assert schema["grid_import"].description == {
        "suggested_value": ["sensor.import"]
    }  # old text value shown as list

    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"grid_import": ["sensor.import2"]}
    )
    assert result["step_id"] == "storage"
    schema = {str(k): k for k in result["data_schema"].schema}
    assert schema["solar_power"].description == {"suggested_value": ["sensor.pv"]}

    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"solar_power": ["sensor.pv", "sensor.pv_2"]}
    )
    assert result["step_id"] == "energy"
    result = await hass.config_entries.options.async_configure(result["flow_id"], {})
    assert result["step_id"] == "devices"
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"device_power": ["sensor.oven"]}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["data"]["grid_import"] == ["sensor.import2"]
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
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
    assert result["step_id"] == "devices"
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"device_patterns": ["*_power", "bad pattern!"]}
    )
    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {"device_patterns": "invalid_pattern"}


async def test_devices_step_rejects_invalid_exclude_patterns(
    hass: HomeAssistant,
) -> None:
    result = await _start(hass)
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"house_power": "sensor.house"}
    )
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"device_exclude_patterns": ["no spaces"]}
    )
    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {"device_exclude_patterns": "invalid_pattern"}


async def test_options_flow_keeps_the_display_names(hass: HomeAssistant) -> None:
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={"grid_import": ["sensor.import"]},
        options={"device_names": {"sensor.wallbox_leistung": "Wallbox"}},
    )
    entry.add_to_hass(hass)
    result = await hass.config_entries.options.async_init(entry.entry_id)
    # the form is prefilled in the UI, so the stored sensor comes back with the submit
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"grid_import": ["sensor.import"]}
    )
    result = await hass.config_entries.options.async_configure(result["flow_id"], {})
    result = await hass.config_entries.options.async_configure(result["flow_id"], {})
    result = await hass.config_entries.options.async_configure(result["flow_id"], {})
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["data"]["device_names"] == {"sensor.wallbox_leistung": "Wallbox"}


def _offer(targets):
    return patch(
        "custom_components.energy_assistant.config_flow.async_energy_suggestion",
        AsyncMock(return_value={"targets": targets} if targets else None),
    )


async def test_the_energy_step_suggests_the_counters_of_the_energy_dashboard(
    hass: HomeAssistant,
) -> None:
    offer = {
        "energy_solar": ["sensor.pv_e"],
        "energy_grid_import": ["sensor.imp_e"],
        "energy_grid_export": ["sensor.exp_e"],
    }
    with _offer(offer):
        result = await _start(hass)
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"], {"house_power": "sensor.house"}
        )
        result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
        assert result["step_id"] == "energy"
        schema = {str(k): k for k in result["data_schema"].schema}
        assert schema["energy_solar"].description == {
            "suggested_value": ["sensor.pv_e"]
        }
        assert schema["energy_grid_export"].description == {
            "suggested_value": ["sensor.exp_e"]
        }
        assert schema["energy_house"].description is None
        # taking them over stores them, the user can still change them
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"], {"energy_solar": ["sensor.pv_e", "sensor.balkon_e"]}
        )
        with patch(SETUP, return_value=True):
            result = await hass.config_entries.flow.async_configure(
                result["flow_id"], {}
            )
    assert result["data"]["energy_solar"] == ["sensor.pv_e", "sensor.balkon_e"]
    assert (
        "energy_grid_import" not in result["data"]
    )  # not taken over: removed in the form


async def test_without_the_energy_dashboard_the_energy_step_is_empty(
    hass: HomeAssistant,
) -> None:
    with _offer(None):
        result = await _start(hass)
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"], {"house_power": "sensor.house"}
        )
        result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
        schema = {str(k): k for k in result["data_schema"].schema}
        assert all(marker.description is None for marker in schema.values())


async def test_the_pv_assistant_offer_fills_the_storage_fields(
    hass: HomeAssistant,
) -> None:
    MockConfigEntry(
        domain="pv_assistant",
        data={
            "production_power_sensors": ["sensor.pv"],
            "battery_soc_sensor": "sensor.soc",
        },
    ).add_to_hass(hass)
    hass.data["pv_assistant"] = {
        "settings": {"general": {"storage_capacity_kwh": 9.5, "battery_min_soc": 10}}
    }
    result = await _start(hass)
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"use_pv": True}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"grid_import": ["sensor.import"]}
    )
    assert result["step_id"] == "storage"
    schema = {str(k): k for k in result["data_schema"].schema}
    assert schema["battery_soc"].description == {
        "suggested_value": "sensor.soc"
    }  # one sensor, not a list
    assert schema["battery_capacity"].description == {"suggested_value": 9.5}
    assert schema["battery_min_soc"].description == {"suggested_value": 10.0}


async def test_a_minimum_of_zero_is_shown_as_zero(hass: HomeAssistant) -> None:
    entry = MockConfigEntry(
        domain=DOMAIN, data={"grid_import": ["sensor.import"], "battery_min_soc": 0.0}
    )
    entry.add_to_hass(hass)
    result = await hass.config_entries.options.async_init(entry.entry_id)
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"grid_import": ["sensor.import"]}
    )
    schema = {str(k): k for k in result["data_schema"].schema}
    assert schema["battery_min_soc"].description == {"suggested_value": 0.0}


async def test_options_flow_clears_fields_that_were_emptied(
    hass: HomeAssistant,
) -> None:
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={
            "grid_import": ["sensor.import"],
            "solar_power": ["sensor.pv"],
            "battery_soc": "sensor.soc",
            "battery_capacity": 10.0,
            "energy_solar": ["sensor.pv_e"],
            "device_power": ["sensor.oven"],
            "house_power": "sensor.house",
        },
    )
    entry.add_to_hass(hass)
    with _offer(None):
        result = await hass.config_entries.options.async_init(entry.entry_id)
        # the user empties the house power sensor; the import stays
        result = await hass.config_entries.options.async_configure(
            result["flow_id"], {"grid_import": ["sensor.import"]}
        )
        # in the storage step everything is emptied
        result = await hass.config_entries.options.async_configure(
            result["flow_id"], {}
        )
        result = await hass.config_entries.options.async_configure(
            result["flow_id"], {}
        )
        result = await hass.config_entries.options.async_configure(
            result["flow_id"], {}
        )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    data = result["data"]
    assert data["grid_import"] == ["sensor.import"]
    assert not data["house_power"]
    assert not data["solar_power"]
    assert not data["battery_soc"]
    assert not data["battery_capacity"]
    assert not data["energy_solar"]
    assert not data["device_power"]
