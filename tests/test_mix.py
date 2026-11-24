"""Tests for the share of the consumption that the grid delivers (it makes the price of the cost sensors)."""

from homeassistant.core import HomeAssistant

from custom_components.energy_assistant.mix import grid_share, watched


def _set(
    hass: HomeAssistant, entity_id: str, state: str, unit: str | None = "W"
) -> None:
    attrs = {"unit_of_measurement": unit} if unit else {}
    hass.states.async_set(entity_id, state, attrs)


async def test_all_from_the_grid_is_a_share_of_one(hass: HomeAssistant) -> None:
    _set(hass, "sensor.gi", "800")
    assert grid_share(hass, {"grid_import": ["sensor.gi"]}) == 1.0  # no sun, no storage


async def test_a_self_sufficiency_of_100_percent_is_a_share_of_zero(
    hass: HomeAssistant,
) -> None:
    _set(hass, "sensor.gi", "0")
    _set(hass, "sensor.go", "1000")
    _set(hass, "sensor.pv", "3000")
    # without a house sensor: 3000 + 0 - 1000 = 2000 W consumption, nothing from the grid
    opts = {
        "grid_import": ["sensor.gi"],
        "grid_export": ["sensor.go"],
        "solar_power": ["sensor.pv"],
    }
    assert grid_share(hass, opts) == 0.0
    # a part from the grid
    _set(hass, "sensor.gi", "500")
    _set(hass, "sensor.pv", "2500")  # 2500 + 500 - 1000 = 2000 W, 500 W from the grid
    assert grid_share(hass, opts) == 0.25


async def test_the_house_sensor_is_the_consumption_when_there_is_one(
    hass: HomeAssistant,
) -> None:
    _set(hass, "sensor.gi", "1000")
    _set(hass, "sensor.h", "2000")
    assert (
        grid_share(hass, {"grid_import": ["sensor.gi"], "house_power": "sensor.h"})
        == 0.5
    )
    _set(hass, "sensor.h", "0.5", "kW")  # kW is understood
    assert (
        grid_share(hass, {"grid_import": ["sensor.gi"], "house_power": "sensor.h"})
        == 1.0
    )  # clamped


async def test_combined_sensors_and_the_storage_are_split_like_in_the_panel(
    hass: HomeAssistant,
) -> None:
    _set(hass, "sensor.grid", "-1500")  # exporting
    _set(hass, "sensor.pv", "4000")
    _set(hass, "sensor.bat", "-1000")  # charging
    opts = {
        "grid_power": ["sensor.grid"],
        "solar_power": ["sensor.pv"],
        "battery_power": ["sensor.bat"],
    }
    assert grid_share(hass, opts) == 0.0  # 4000 + 0 - 1500 - 1000 = 1500 W from the sun
    # the sign can be inverted
    _set(hass, "sensor.grid", "1500")
    assert grid_share(hass, {**opts, "invert_grid": True}) == 0.0
    assert (
        grid_share(hass, opts) is not None and grid_share(hass, opts) > 0
    )  # importing now
    # a separate sensor wins over the combined one
    _set(hass, "sensor.gi", "0")
    assert grid_share(hass, {**opts, "grid_import": ["sensor.gi"]}) == 0.0


async def test_power_that_charges_the_storage_from_the_grid_is_not_consumption(
    hass: HomeAssistant,
) -> None:
    _set(hass, "sensor.gi", "3000")
    _set(hass, "sensor.gc", "2000")  # of it into the storage
    _set(hass, "sensor.h", "2000")
    opts = {
        "grid_import": ["sensor.gi"],
        "house_power": "sensor.h",
        "battery_grid_charge": ["sensor.gc"],
    }
    assert grid_share(hass, opts) == 0.5  # (3000 - 2000) / 2000


async def test_bad_readings_and_missing_data_give_no_share(hass: HomeAssistant) -> None:
    opts = {"grid_import": ["sensor.gi"], "house_power": "sensor.h"}
    _set(hass, "sensor.h", "1000")
    assert grid_share(hass, {"house_power": "sensor.h"}) is None  # no grid sensor
    assert grid_share(hass, opts) is None  # the grid sensor is gone
    for bad in (
        "nan",
        "inf",
        "abc",
        "unavailable",
        "unknown",
        "5000000",
    ):  # the last is 5000 kW
        _set(hass, "sensor.gi", bad)
        assert grid_share(hass, opts) is None, bad
    _set(hass, "sensor.gi", "500", "mW")  # a unit that is not understood
    assert grid_share(hass, opts) is None
    _set(hass, "sensor.gi", "500")
    _set(hass, "sensor.h", "0")  # no consumption: nothing to share
    assert grid_share(hass, opts) is None
    _set(
        hass, "sensor.h", "nan"
    )  # a bad house sensor: the balance of the others is used
    assert grid_share(hass, opts) == 1.0  # 0 + 500 W from the grid is all there is


async def test_the_sensors_the_share_depends_on_are_watched(
    hass: HomeAssistant,
) -> None:
    opts = {
        "grid_import": ["sensor.gi"],
        "solar_power": ["sensor.pv", "sensor.pv2"],
        "house_power": "sensor.h",
        "battery_power": ["sensor.bat"],
        "battery_grid_charge": ["sensor.gc"],
    }
    assert watched(opts) == [
        "sensor.bat",
        "sensor.gc",
        "sensor.gi",
        "sensor.h",
        "sensor.pv",
        "sensor.pv2",
    ]
    assert watched({}) == []
