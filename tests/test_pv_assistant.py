"""Tests for the optional link to the PV Assistant integration."""

from homeassistant import config_entries
from homeassistant.data_entry_flow import FlowResultType
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.energy_assistant.const import DOMAIN
from custom_components.energy_assistant.pv_assistant import (
    plants_from,
    suggestion,
    targets_from,
)
from custom_components.energy_assistant.websocket import async_register

PV = {
    "production_power_sensors": ["sensor.wr1_pv1", "sensor.wr1_pv2", "sensor.wr2_pv"],
}


def test_solar_sensors_are_taken_over() -> None:
    targets, notes = targets_from(PV)
    assert targets == {"solar_power": PV["production_power_sensors"]}
    assert notes == {"feed_in_negative": False, "storage_absolute": False}


def test_nothing_to_offer_without_sensors() -> None:
    assert targets_from({}) == (
        {},
        {"feed_in_negative": False, "storage_absolute": False},
    )
    assert targets_from({"production_power_sensors": None})[0] == {}


def test_combined_storage_keeps_the_sign_setting() -> None:
    targets, _ = targets_from({**PV, "storage_combined_power_sensors": ["sensor.batt"]})
    assert targets["battery_power"] == ["sensor.batt"]
    assert targets["invert_battery"] is False
    targets, _ = targets_from(
        {
            **PV,
            "storage_combined_power_sensors": ["sensor.batt"],
            "invert_storage_combined_power": True,
        }
    )
    assert targets["invert_battery"] is True


def test_separate_storage_sensors_with_negative_values_are_taken_over() -> None:
    targets, notes = targets_from(
        {
            **PV,
            "storage_in_power_sensors": ["sensor.in"],
            "storage_out_power_sensors": ["sensor.out"],
            "abs_storage_power": True,
        }
    )
    assert targets["battery_charge"] == ["sensor.in"]
    assert targets["battery_discharge"] == ["sensor.out"]
    assert notes["storage_absolute"] is True


def test_grid_import_and_feed_in_are_taken_over() -> None:
    targets, notes = targets_from(
        {
            **PV,
            "grid_import_power_sensors": ["sensor.bezug"],
            "feed_in_power_sensor": "sensor.einsp",
        }
    )
    assert targets["grid_import"] == ["sensor.bezug"]
    assert targets["grid_export"] == ["sensor.einsp"]
    assert "grid_power" not in targets
    assert notes["feed_in_negative"] is False


def test_negative_feed_in_becomes_the_combined_grid_sensor() -> None:
    targets, notes = targets_from(
        {
            **PV,
            "grid_import_power_sensors": ["sensor.bezug"],
            "feed_in_power_sensor": "sensor.einsp",
            "invert_feed_in_power": True,
        }
    )
    assert targets["grid_power"] == ["sensor.einsp"]
    assert targets["invert_grid"] is False
    assert targets["grid_import"] == ["sensor.bezug"]
    assert "grid_export" not in targets
    assert notes["feed_in_negative"] is True


def test_a_combined_meter_that_is_also_an_import_sensor_is_not_counted_twice() -> None:
    targets, _ = targets_from(
        {
            **PV,
            "grid_import_power_sensors": ["sensor.zaehler"],
            "feed_in_power_sensor": "sensor.zaehler",
            "invert_feed_in_power": True,
        }
    )
    assert targets["grid_power"] == ["sensor.zaehler"]
    assert "grid_import" not in targets


def test_plants_follow_the_inverters_of_pv_assistant() -> None:
    settings = {
        "inverters": [
            {
                "name": "Wechselrichter Haus",
                "sensors": ["sensor.wr1_pv1", "sensor.wr1_pv2"],
            },
            {"name": "leer", "sensors": ["sensor.unknown"]},
        ],
        "strings": {"sensor.wr2_pv": {"name": "Garage"}},
    }
    assert plants_from(PV, settings, {}) == [
        {
            "name": "Wechselrichter Haus",
            "sensors": ["sensor.wr1_pv1", "sensor.wr1_pv2"],
        },
        {"name": "Garage", "sensors": ["sensor.wr2_pv"]},
    ]
    # without settings every sensor is a plant of its own, named by its friendly name or its id
    plants = plants_from(PV, {}, {"sensor.wr1_pv1": "WR Haus String 1"})
    assert [p["name"] for p in plants] == [
        "WR Haus String 1",
        "sensor.wr1_pv2",
        "sensor.wr2_pv",
    ]


async def test_no_suggestion_without_pv_assistant(hass) -> None:
    assert suggestion(hass) is None


async def test_suggestion_reads_pv_assistant_and_changes_nothing(hass) -> None:
    pv_entry = MockConfigEntry(domain="pv_assistant", data=dict(PV))
    pv_entry.add_to_hass(hass)
    hass.data["pv_assistant"] = {
        "settings": {"strings": {"sensor.wr2_pv": {"name": "Garage"}}}
    }
    offer = suggestion(hass)
    assert offer["targets"]["solar_power"] == PV["production_power_sensors"]
    assert offer["plants"][-1] == {"name": "Garage", "sensors": ["sensor.wr2_pv"]}
    assert dict(pv_entry.data) == PV
    assert hass.data["pv_assistant"] == {
        "settings": {"strings": {"sensor.wr2_pv": {"name": "Garage"}}}
    }


async def test_websocket_returns_the_suggestion_or_null(hass, hass_ws_client) -> None:
    async_register(hass)
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "energy_assistant/pv_suggestion"})
    msg = await client.receive_json()
    assert msg["success"] and msg["result"] is None
    MockConfigEntry(domain="pv_assistant", data=dict(PV)).add_to_hass(hass)
    await client.send_json_auto_id({"type": "energy_assistant/pv_suggestion"})
    msg = await client.receive_json()
    assert msg["result"]["targets"]["solar_power"] == PV["production_power_sensors"]


async def test_config_flow_asks_first_and_prefills_the_sensors(hass) -> None:
    MockConfigEntry(
        domain="pv_assistant",
        data={**PV, "grid_import_power_sensors": ["sensor.bezug"]},
    ).add_to_hass(hass)
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "pv"
    assert "solar 3" in result["description_placeholders"]["summary"]
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"use_pv": True}
    )
    assert result["step_id"] == "user"
    schema = {str(k): k for k in result["data_schema"].schema}
    assert schema["grid_import"].description == {"suggested_value": ["sensor.bezug"]}
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"grid_import": ["sensor.bezug"]}
    )
    assert result["step_id"] == "storage"
    schema = {str(k): k for k in result["data_schema"].schema}
    assert schema["solar_power"].description == {
        "suggested_value": PV["production_power_sensors"]
    }


async def test_config_flow_can_decline_the_offer(hass) -> None:
    MockConfigEntry(domain="pv_assistant", data=dict(PV)).add_to_hass(hass)
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"use_pv": False}
    )
    assert result["step_id"] == "user"
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"grid_import": ["sensor.x"]}
    )
    schema = {str(k): k for k in result["data_schema"].schema}
    assert schema["solar_power"].description is None


async def test_config_flow_without_pv_assistant_starts_as_before(hass) -> None:
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    assert result["step_id"] == "user"


async def test_options_flow_offers_to_replace_the_sensors(hass) -> None:
    MockConfigEntry(domain="pv_assistant", data=dict(PV)).add_to_hass(hass)
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={"grid_import": ["sensor.import"], "solar_power": ["sensor.old"]},
    )
    entry.add_to_hass(hass)
    result = await hass.config_entries.options.async_init(entry.entry_id)
    assert result["step_id"] == "pv"
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"use_pv": True}
    )
    assert result["step_id"] == "init"
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"grid_import": ["sensor.import"]}
    )
    schema = {str(k): k for k in result["data_schema"].schema}
    assert schema["solar_power"].description == {
        "suggested_value": PV["production_power_sensors"]
    }
