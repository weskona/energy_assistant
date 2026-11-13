"""Tests for setup, panel configuration and unloading."""

from unittest.mock import AsyncMock, MagicMock

from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.energy_assistant.const import DOMAIN


def _entry(**kw) -> MockConfigEntry:
    return MockConfigEntry(domain=DOMAIN, **kw)


async def test_setup_registers_panel_with_normalized_config(
    hass: HomeAssistant, mock_panel
) -> None:
    register, remove = mock_panel
    hass.http = MagicMock(async_register_static_paths=AsyncMock())
    entry = _entry(
        data={
            "grid_import": "sensor.import",  # single value becomes a list
            "solar_power": ["sensor.pv1", "sensor.pv2"],
            "invert_grid": True,
        },
        options={
            "battery_grid_charge": "sensor.bgc",
            "house_power": "sensor.house",
            "device_power": ["sensor.oven", "sensor.fridge"],
            "device_patterns": ["*_power"],
            "device_exclude": ["sensor.skip_power"],
            "device_exclude_patterns": ["alpha_ess_*"],
            "label_ids": ["klima", "licht"],
            "area_ids": ["kueche"],
            "device_names": {"sensor.oven": " Ofen "},
        },
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)

    hass.http.async_register_static_paths.assert_awaited_once()
    kwargs = register.await_args.kwargs
    assert kwargs["webcomponent_name"] == "energy-assistant-panel"
    assert kwargs["frontend_url_path"] == "energy-assistant"
    assert kwargs["require_admin"] is False
    assert kwargs["module_url"].startswith(
        "/energy_assistant_static/energy-assistant-panel.js?v="
    )
    assert kwargs["config"] == {
        "house_power": "sensor.house",
        "grid_power": [],
        "grid_import": ["sensor.import"],
        "grid_export": [],
        "solar_power": ["sensor.pv1", "sensor.pv2"],
        "battery_power": [],
        "battery_discharge": [],
        "battery_charge": [],
        "battery_grid_charge": ["sensor.bgc"],
        "device_power": ["sensor.oven", "sensor.fridge"],
        "device_standby": [],
        "device_ids": [],
        "device_patterns": ["*_power"],
        "device_exclude": ["sensor.skip_power"],
        "device_exclude_patterns": ["alpha_ess_*"],
        "label_ids": ["klima", "licht"],
        "area_ids": ["kueche"],
        "device_names": {"sensor.oven": "Ofen"},
        "label_tariffs": {},
        "area_tariffs": {},
        "device_tariffs": {},
        "battery_soc": [],
        "battery_capacity": None,
        "battery_min_soc": None,
        "energy_solar": [],
        "energy_grid_import": [],
        "energy_grid_export": [],
        "energy_battery_charge": [],
        "energy_battery_discharge": [],
        "energy_house": [],
        "invert_grid": True,
        "invert_battery": False,
    }

    assert await hass.config_entries.async_unload(entry.entry_id)
    remove.assert_called_once_with(hass, "energy-assistant")


async def test_options_override_data(hass: HomeAssistant, mock_panel) -> None:
    register, _ = mock_panel
    hass.http = MagicMock(async_register_static_paths=AsyncMock())
    entry = _entry(
        data={"grid_import": "sensor.old"}, options={"grid_import": "sensor.new"}
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    assert register.await_args.kwargs["config"]["grid_import"] == ["sensor.new"]
