"""Tests for the settings helpers."""

from custom_components.energy_assistant.settings import (
    as_list,
    clean_ids,
    clean_names,
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


def test_clean_names() -> None:
    assert clean_names(None) == {}
    assert clean_names("not a dict") == {}
    assert clean_names({}) == {}
    assert clean_names(
        {
            "sensor.a": " Wallbox ",
            "sensor.b": "",
            "sensor.c": "   ",
            "sensor.d": None,
            "sensor.e": 5,
        }
    ) == {"sensor.a": "Wallbox", "sensor.e": "5"}


def test_device_names_are_normalized_and_stored() -> None:
    settings = normalize({"device_names": {"sensor.a": " Wallbox ", "sensor.b": ""}})
    assert settings["device_names"] == {"sensor.a": "Wallbox"}
    assert normalize({})["device_names"] == {}
    assert to_storage(settings)["device_names"] == {"sensor.a": "Wallbox"}
    assert "device_names" not in to_storage(normalize({}))
    assert normalize(to_storage(settings)) == settings


def test_area_ids_are_normalized_and_stored_as_a_list() -> None:
    settings = normalize({"area_ids": [" kueche ", "kueche", "wohnzimmer"]})
    assert settings["area_ids"] == ["kueche", "wohnzimmer"]
    assert normalize({})["area_ids"] == []  # none selected means all areas
    assert to_storage(settings)["area_ids"] == ["kueche", "wohnzimmer"]
    assert normalize(to_storage(settings)) == settings


def test_numbers_are_floats_or_none() -> None:
    from custom_components.energy_assistant.settings import (
        clean_number,
        normalize,
        to_storage,
    )

    assert clean_number(10) == 10.0
    assert clean_number("12,5") == 12.5
    assert clean_number("7.25") == 7.25
    for bad in (None, "", "abc", -1, "-3", float("nan"), True, False):
        assert clean_number(bad) is None
    assert clean_number(0) == 0.0
    result = normalize(
        {"battery_capacity": "10", "battery_min_soc": None, "battery_soc": "sensor.soc"}
    )
    assert result["battery_capacity"] == 10.0
    assert result["battery_min_soc"] is None
    assert result["battery_soc"] == ["sensor.soc"]
    stored = to_storage(result)
    assert stored["battery_capacity"] == 10.0
    assert "battery_min_soc" not in stored  # not set: nothing stored
    assert (
        stored["battery_soc"] == "sensor.soc"
    )  # one sensor in storage, like the other single fields
    assert (
        to_storage({"battery_min_soc": 0})["battery_min_soc"] == 0.0
    )  # 0 % is a value


def test_label_tariffs_keep_only_valid_entries() -> None:
    from custom_components.energy_assistant.settings import clean_label_tariffs

    result = clean_label_tariffs(
        {
            "waermepumpe": "sensor.wp_preis",
            "Bad Label": "sensor.x",  # not a slug
            "licht": "light.x",  # not a sensor
            "klima": 5,
            3: "sensor.y",
        }
    )
    assert result == {"waermepumpe": "sensor.wp_preis"}
    assert clean_label_tariffs(None) == {}
    assert normalize({})["label_tariffs"] == {}
    assert to_storage({"label_tariffs": {"waermepumpe": "sensor.wp_preis"}})[
        "label_tariffs"
    ] == {"waermepumpe": "sensor.wp_preis"}
    assert "label_tariffs" not in to_storage({"label_tariffs": {}})


def test_devices_with_their_own_sensors_are_cut_to_the_limit() -> None:
    from custom_components.energy_assistant.const import MAX_DEVICE_IDS

    many = [f"sensor.d{k}_power" for k in range(MAX_DEVICE_IDS + 7)]
    assert normalize({"device_ids": many})["device_ids"] == many[:MAX_DEVICE_IDS]
    assert to_storage({"device_ids": many})["device_ids"] == many[:MAX_DEVICE_IDS]
    assert normalize({})["device_ids"] == []  # nothing is selected at first
    assert normalize({"device_ids": "sensor.a_power"})["device_ids"] == [
        "sensor.a_power"
    ]


def test_device_tariffs_keep_only_valid_entries() -> None:
    from custom_components.energy_assistant.settings import clean_device_tariffs

    result = clean_device_tariffs(
        {
            "sensor.wp_power": "sensor.wp_preis",
            "light.x": "sensor.p",  # not a sensor
            "sensor.y": "Preis",  # not an entity id
            "sensor.z": 5,
        }
    )
    assert result == {"sensor.wp_power": "sensor.wp_preis"}
    assert normalize({})["device_tariffs"] == {}
    assert "device_tariffs" not in to_storage({"device_tariffs": {}})
