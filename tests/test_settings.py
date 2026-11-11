"""Tests for the settings helpers."""

from custom_components.energyboard.settings import (
    as_list,
    clean_ids,
    clean_patterns,
    has_source,
    normalize,
    to_storage,
    valid_patterns,
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


def test_clean_patterns() -> None:
    assert clean_patterns(None) == []
    assert clean_patterns(" *_Leistung ") == ["*_leistung"]
    assert clean_patterns(["*_a", "", "  ", "*_A", "b*"]) == ["*_a", "b*"]


def test_valid_patterns() -> None:
    assert valid_patterns(["*_leistung", "sensor.k??_power", "x"])
    assert valid_patterns([])
    assert not valid_patterns(["bad pattern"])
    assert not valid_patterns(["a/b"])
    assert not valid_patterns(["ä*"])


def test_normalize_cleans_patterns() -> None:
    assert normalize({"device_patterns": [" *_Leistung "]})["device_patterns"] == [
        "*_leistung"
    ]
    assert normalize({})["device_patterns"] == []


def test_exclude_patterns_are_cleaned_like_patterns() -> None:
    result = normalize({"device_exclude_patterns": [" Alpha_ESS_* ", "alpha_ess_*"]})
    assert result["device_exclude_patterns"] == ["alpha_ess_*"]
    assert normalize({})["device_exclude_patterns"] == []


def test_clean_ids() -> None:
    assert clean_ids(None) == []
    assert clean_ids("klima") == ["klima"]
    assert clean_ids([" klima ", "", "klima", "licht"]) == ["klima", "licht"]


def test_label_ids_are_normalized_and_stored_as_a_list() -> None:
    settings = normalize({"label_ids": [" klima ", "klima", "licht"]})
    assert settings["label_ids"] == ["klima", "licht"]
    assert normalize({})["label_ids"] == []
    assert to_storage(settings)["label_ids"] == ["klima", "licht"]
