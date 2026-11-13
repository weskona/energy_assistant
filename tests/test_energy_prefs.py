"""Tests for the offer from the Energy dashboard of Home Assistant."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.energy_assistant.const import DOMAIN
from custom_components.energy_assistant.energy_prefs import (
    async_energy_suggestion,
    targets_from_prefs,
)
from custom_components.energy_assistant.websocket import async_register

PREFS = {
    "energy_sources": [
        {
            "type": "grid",
            "flow_from": [
                {"stat_energy_from": "sensor.netz_bezug_gesamt", "stat_cost": None},
                {"stat_energy_from": "sensor.netz_bezug_zweit"},
            ],
            "flow_to": [{"stat_energy_to": "sensor.netz_einspeisung_gesamt"}],
            "cost_adjustment_day": 0,
        },
        {"type": "solar", "stat_energy_from": "sensor.pv_gesamt"},
        {"type": "solar", "stat_energy_from": "sensor.pv_balkon"},
        {
            "type": "battery",
            "stat_energy_from": "sensor.speicher_entladen",
            "stat_energy_to": "sensor.speicher_laden",
        },
        {"type": "gas", "stat_energy_from": "sensor.gas"},
    ],
    "device_consumption": [],
}


def test_the_counters_come_from_the_sources_of_the_dashboard() -> None:
    assert targets_from_prefs(PREFS) == {
        "energy_grid_import": ["sensor.netz_bezug_gesamt", "sensor.netz_bezug_zweit"],
        "energy_grid_export": ["sensor.netz_einspeisung_gesamt"],
        "energy_solar": ["sensor.pv_gesamt", "sensor.pv_balkon"],
        "energy_battery_discharge": ["sensor.speicher_entladen"],
        "energy_battery_charge": ["sensor.speicher_laden"],
    }


def test_the_older_shape_of_the_grid_source_is_read_too() -> None:
    old = {
        "energy_sources": [
            {
                "type": "grid",
                "stat_energy_from": "sensor.bezug",
                "stat_energy_to": "sensor.einsp",
            }
        ]
    }
    assert targets_from_prefs(old) == {
        "energy_grid_import": ["sensor.bezug"],
        "energy_grid_export": ["sensor.einsp"],
    }


def test_external_statistics_and_duplicates_are_left_out() -> None:
    prefs = {
        "energy_sources": [
            {"type": "solar", "stat_energy_from": "sensor.pv"},
            {"type": "solar", "stat_energy_from": "sensor.pv"},
            {"type": "solar", "stat_energy_from": "recorder:import_pv"},
            {"type": "solar", "stat_energy_from": None},
        ]
    }
    assert targets_from_prefs(prefs) == {"energy_solar": ["sensor.pv"]}


@pytest.mark.parametrize(
    "prefs", [None, {}, {"energy_sources": []}, {"energy_sources": None}]
)
def test_nothing_without_sources(prefs) -> None:
    assert targets_from_prefs(prefs) == {}


def _manager(prefs):
    return patch(
        "homeassistant.components.energy.data.async_get_manager",
        AsyncMock(return_value=MagicMock(data=prefs)),
    )


async def test_the_offer_is_the_targets_or_none(hass) -> None:
    with _manager(PREFS):
        offer = await async_energy_suggestion(hass)
    assert offer["targets"]["energy_solar"] == ["sensor.pv_gesamt", "sensor.pv_balkon"]
    with _manager(None):
        assert await async_energy_suggestion(hass) is None
    with _manager(
        {"energy_sources": [{"type": "gas", "stat_energy_from": "sensor.gas"}]}
    ):
        assert await async_energy_suggestion(hass) is None


async def test_no_offer_when_the_dashboard_is_not_available(hass) -> None:
    with patch(
        "homeassistant.components.energy.data.async_get_manager",
        AsyncMock(side_effect=RuntimeError("no energy")),
    ):
        assert await async_energy_suggestion(hass) is None


async def test_websocket_answers_with_the_offer(hass, hass_ws_client) -> None:
    async_register(hass)
    client = await hass_ws_client(hass)
    with _manager(PREFS):
        await client.send_json_auto_id({"type": "energy_assistant/energy_suggestion"})
        msg = await client.receive_json()
    assert msg["success"]
    assert msg["result"]["targets"]["energy_battery_charge"] == [
        "sensor.speicher_laden"
    ]
    with _manager(None):
        await client.send_json_auto_id({"type": "energy_assistant/energy_suggestion"})
        assert (await client.receive_json())["result"] is None


async def test_the_energy_counters_are_part_of_the_settings(
    hass, hass_ws_client
) -> None:
    async_register(hass)
    entry = MockConfigEntry(domain=DOMAIN, data={"grid_import": "sensor.gi"})
    entry.add_to_hass(hass)
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "energy_assistant/update_config",
            "config": {
                "energy_solar": ["sensor.pv_gesamt"],
                "energy_house": ["sensor.haus_gesamt"],
            },
        }
    )
    assert (await client.receive_json())["success"]
    assert entry.options["energy_solar"] == ["sensor.pv_gesamt"]
    await client.send_json_auto_id({"type": "energy_assistant/get_config"})
    result = (await client.receive_json())["result"]
    assert result["energy_solar"] == ["sensor.pv_gesamt"]
    assert result["energy_house"] == ["sensor.haus_gesamt"]
    assert result["energy_grid_export"] == []
