"""Tests for the settings helpers."""

from custom_components.energyboard.settings import (
    as_list,
    has_source,
    normalize,
    to_storage,
)


def test_as_list() -> None:
    assert as_list(None) == []
    assert as_list("") == []
    assert as_list([]) == []
    assert as_list("sensor.a") == ["sensor.a"]
    assert as_list(["sensor.a", "sensor.b"]) == ["sensor.a", "sensor.b"]


def test_normalize_gives_lists_booleans_and_none() -> None:
    result = normalize({"grid_import": "sensor.gi", "invert_grid": 1})
    assert result["grid_import"] == ["sensor.gi"]
    assert result["solar_power"] == []
    assert result["invert_grid"] is True
    assert result["invert_battery"] is False
    assert result["house_power"] is None


def test_has_source() -> None:
    assert not has_source({})
    assert not has_source({"solar_power": ["sensor.pv"], "grid_export": "sensor.ge"})
    assert has_source({"house_power": "sensor.h"})
    assert has_source({"grid_import": "sensor.gi"})
    assert has_source({"grid_import": ["sensor.gi"]})
    assert has_source({"grid_power": ["sensor.g"]})


def test_to_storage_collapses_single_keys() -> None:
    stored = to_storage(
        {
            "grid_import": ["sensor.gi", "sensor.ignored"],
            "grid_export": [],
            "battery_grid_charge": ["sensor.bgc"],
            "solar_power": ["sensor.pv"],
            "invert_grid": True,
            "house_power": None,
        }
    )
    assert stored["grid_import"] == "sensor.gi"
    assert "grid_export" not in stored
    assert stored["battery_grid_charge"] == "sensor.bgc"
    assert stored["solar_power"] == ["sensor.pv"]
    assert stored["invert_grid"] is True
    assert "house_power" not in stored


def test_storage_round_trips_through_normalize() -> None:
    settings = normalize(
        {"grid_import": "sensor.gi", "solar_power": ["a", "b"], "invert_battery": True}
    )
    assert normalize(to_storage(settings)) == settings
