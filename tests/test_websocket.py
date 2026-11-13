"""Tests for the WebSocket API used by the panel settings."""

import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.energy_assistant.const import DOMAIN
from custom_components.energy_assistant.websocket import async_register


@pytest.fixture
async def entry(hass):
    async_register(hass)
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={"grid_import": "sensor.gi", "solar_power": ["sensor.pv"]},
    )
    entry.add_to_hass(hass)
    return entry


async def test_get_config(hass, hass_ws_client, entry) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "energy_assistant/get_config"})
    msg = await client.receive_json()
    assert msg["success"]
    assert msg["result"]["grid_import"] == ["sensor.gi"]
    assert msg["result"]["solar_power"] == ["sensor.pv"]
    assert msg["result"]["house_power"] is None


async def test_get_config_without_entry(hass, hass_ws_client) -> None:
    async_register(hass)
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "energy_assistant/get_config"})
    msg = await client.receive_json()
    assert not msg["success"]
    assert msg["error"]["code"] == "not_found"


async def test_update_config_stores_options_and_keeps_other_values(
    hass, hass_ws_client, entry
) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "energy_assistant/update_config",
            "config": {
                "device_power": ["sensor.oven"],
                "battery_charge": ["sensor.bc"],
                "invert_battery": True,
            },
        }
    )
    msg = await client.receive_json()
    assert msg["success"]
    assert msg["result"]["device_power"] == ["sensor.oven"]
    assert msg["result"]["grid_import"] == ["sensor.gi"]  # untouched
    assert entry.options["device_power"] == ["sensor.oven"]
    assert entry.options["grid_import"] == "sensor.gi"  # single stays a string
    assert entry.options["invert_battery"] is True


async def test_update_config_can_clear_a_list(hass, hass_ws_client, entry) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {"type": "energy_assistant/update_config", "config": {"solar_power": []}}
    )
    msg = await client.receive_json()
    assert msg["success"]
    assert msg["result"]["solar_power"] == []


async def test_update_config_requires_a_source(hass, hass_ws_client, entry) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {"type": "energy_assistant/update_config", "config": {"grid_import": []}}
    )
    msg = await client.receive_json()
    assert not msg["success"]
    assert msg["error"]["code"] == "no_source"
    assert entry.options == {}


async def test_update_config_rejects_invalid_entity_ids(
    hass, hass_ws_client, entry
) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {"type": "energy_assistant/update_config", "config": {"solar_power": ["nope"]}}
    )
    msg = await client.receive_json()
    assert not msg["success"]
    assert msg["error"]["code"] == "invalid_format"


async def test_update_config_is_admin_only(
    hass, hass_ws_client, hass_read_only_access_token, entry
) -> None:
    client = await hass_ws_client(hass, hass_read_only_access_token)
    await client.send_json_auto_id(
        {"type": "energy_assistant/update_config", "config": {"solar_power": []}}
    )
    msg = await client.receive_json()
    assert not msg["success"]
    assert msg["error"]["code"] == "unauthorized"
    assert entry.options == {}


async def test_update_config_stores_cleaned_patterns(
    hass, hass_ws_client, entry
) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "energy_assistant/update_config",
            "config": {"device_patterns": ["*_Leistung", "sensor.k*"]},
        }
    )
    msg = await client.receive_json()
    assert msg["success"]
    assert msg["result"]["device_patterns"] == ["*_leistung", "sensor.k*"]
    assert entry.options["device_patterns"] == ["*_leistung", "sensor.k*"]


async def test_update_config_rejects_invalid_patterns(
    hass, hass_ws_client, entry
) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "energy_assistant/update_config",
            "config": {"device_patterns": ["a b"]},
        }
    )
    msg = await client.receive_json()
    assert not msg["success"]
    assert msg["error"]["code"] == "invalid_format"
    assert entry.options == {}


async def test_update_config_stores_device_exclude(hass, hass_ws_client, entry) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "energy_assistant/update_config",
            "config": {"device_exclude": ["sensor.a_leistung", "sensor.b_leistung"]},
        }
    )
    msg = await client.receive_json()
    assert msg["success"]
    assert msg["result"]["device_exclude"] == ["sensor.a_leistung", "sensor.b_leistung"]
    assert entry.options["device_exclude"] == ["sensor.a_leistung", "sensor.b_leistung"]


async def test_update_config_stores_device_standby(hass, hass_ws_client, entry) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "energy_assistant/update_config",
            "config": {"device_standby": ["sensor.router_leistung"]},
        }
    )
    msg = await client.receive_json()
    assert msg["success"]
    assert msg["result"]["device_standby"] == ["sensor.router_leistung"]
    assert entry.options["device_standby"] == ["sensor.router_leistung"]


async def test_update_config_rejects_invalid_exclude(
    hass, hass_ws_client, entry
) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "energy_assistant/update_config",
            "config": {"device_exclude": ["nope"]},
        }
    )
    msg = await client.receive_json()
    assert not msg["success"]
    assert msg["error"]["code"] == "invalid_format"


async def test_update_config_stores_cleaned_exclude_patterns(
    hass, hass_ws_client, entry
) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "energy_assistant/update_config",
            "config": {"device_exclude_patterns": ["Alpha_ESS_*", "*_string_*"]},
        }
    )
    msg = await client.receive_json()
    assert msg["success"]
    assert msg["result"]["device_exclude_patterns"] == ["alpha_ess_*", "*_string_*"]
    assert entry.options["device_exclude_patterns"] == ["alpha_ess_*", "*_string_*"]


async def test_update_config_rejects_invalid_exclude_patterns(
    hass, hass_ws_client, entry
) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "energy_assistant/update_config",
            "config": {"device_exclude_patterns": ["a b"]},
        }
    )
    msg = await client.receive_json()
    assert not msg["success"]
    assert msg["error"]["code"] == "invalid_format"
    assert entry.options == {}


async def test_update_config_stores_label_ids(hass, hass_ws_client, entry) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "energy_assistant/update_config",
            "config": {"label_ids": [" klima ", "klima", "licht"]},
        }
    )
    msg = await client.receive_json()
    assert msg["success"] is False  # whitespace is not a valid label id
    assert msg["error"]["code"] == "invalid_format"

    await client.send_json_auto_id(
        {
            "type": "energy_assistant/update_config",
            "config": {"label_ids": ["klima", "licht"]},
        }
    )
    msg = await client.receive_json()
    assert msg["success"]
    assert msg["result"]["label_ids"] == ["klima", "licht"]
    assert entry.options["label_ids"] == ["klima", "licht"]


async def test_update_config_rejects_invalid_label_ids(
    hass, hass_ws_client, entry
) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "energy_assistant/update_config",
            "config": {"label_ids": ["Klima Anlage"]},
        }
    )
    msg = await client.receive_json()
    assert not msg["success"]
    assert msg["error"]["code"] == "invalid_format"
    assert entry.options == {}


async def test_labels_lists_labels_and_labelled_sensors(
    hass, hass_ws_client, entry
) -> None:
    from homeassistant.helpers import device_registry as dr
    from homeassistant.helpers import entity_registry as er
    from homeassistant.helpers import label_registry as lr

    labels = lr.async_get(hass)
    klima = labels.async_create("Klima", color="blue", icon="mdi:snowflake")
    licht = labels.async_create("Licht")
    unused = labels.async_create("Unbenutzt")

    devices = dr.async_get(hass)
    config_entry = MockConfigEntry(domain="test")
    config_entry.add_to_hass(hass)
    device = devices.async_get_or_create(
        config_entry_id=config_entry.entry_id, identifiers={("test", "1")}
    )
    devices.async_update_device(device.id, labels={licht.label_id})

    entities = er.async_get(hass)
    own = entities.async_get_or_create(
        "sensor", "test", "own", suggested_object_id="own"
    )
    entities.async_update_entity(own.entity_id, labels={klima.label_id})
    via_device = entities.async_get_or_create(
        "sensor", "test", "dev", suggested_object_id="via_device", device_id=device.id
    )
    both = entities.async_get_or_create(
        "sensor", "test", "both", suggested_object_id="both", device_id=device.id
    )
    entities.async_update_entity(both.entity_id, labels={klima.label_id})
    entities.async_get_or_create("sensor", "test", "plain", suggested_object_id="plain")
    other_domain = entities.async_get_or_create(
        "switch", "test", "sw", suggested_object_id="sw"
    )
    entities.async_update_entity(other_domain.entity_id, labels={klima.label_id})

    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "energy_assistant/labels"})
    msg = await client.receive_json()
    assert msg["success"]
    result = msg["result"]
    by_id = {label["label_id"]: label for label in result["labels"]}
    assert set(by_id) == {klima.label_id, licht.label_id, unused.label_id}
    assert by_id[klima.label_id]["name"] == "Klima"
    assert by_id[klima.label_id]["icon"] == "mdi:snowflake"
    assert result["entities"] == {
        own.entity_id: [klima.label_id],  # own label
        via_device.entity_id: [licht.label_id],  # label of the device
        both.entity_id: sorted([klima.label_id, licht.label_id]),  # both
    }  # no plain sensor, no switch


async def test_labels_is_available_to_non_admins(
    hass, hass_ws_client, hass_read_only_access_token, entry
) -> None:
    client = await hass_ws_client(hass, hass_read_only_access_token)
    await client.send_json_auto_id({"type": "energy_assistant/labels"})
    msg = await client.receive_json()
    assert msg["success"]
    assert msg["result"] == {"labels": [], "entities": {}}


async def test_update_config_stores_device_names(hass, hass_ws_client, entry) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "energy_assistant/update_config",
            "config": {
                "device_names": {
                    "sensor.wallbox_leistung": " Wallbox ",
                    "sensor.herd_leistung": "Herd",
                }
            },
        }
    )
    msg = await client.receive_json()
    assert msg["success"]
    assert msg["result"]["device_names"] == {
        "sensor.wallbox_leistung": "Wallbox",
        "sensor.herd_leistung": "Herd",
    }
    assert entry.options["device_names"] == msg["result"]["device_names"]
    assert msg["result"]["grid_import"] == ["sensor.gi"]  # other settings untouched


async def test_device_names_are_replaced_as_a_whole_and_can_be_emptied(
    hass, hass_ws_client, entry
) -> None:
    client = await hass_ws_client(hass)
    for names, expected in (
        ({"sensor.a_leistung": "A", "sensor.b_leistung": "B"}, 2),
        ({"sensor.a_leistung": "A2", "sensor.b_leistung": "   "}, 1),  # blank resets B
        ({}, 0),
    ):
        await client.send_json_auto_id(
            {
                "type": "energy_assistant/update_config",
                "config": {"device_names": names},
            }
        )
        msg = await client.receive_json()
        assert msg["success"]
        assert len(msg["result"]["device_names"]) == expected
    assert "device_names" not in entry.options


async def test_update_config_rejects_bad_device_names(
    hass, hass_ws_client, entry
) -> None:
    client = await hass_ws_client(hass)
    for names in (
        {"nope": "Name"},  # not an entity id
        {"sensor.a_leistung": "x" * 81},  # too long
    ):
        await client.send_json_auto_id(
            {
                "type": "energy_assistant/update_config",
                "config": {"device_names": names},
            }
        )
        msg = await client.receive_json()
        assert not msg["success"]
        assert msg["error"]["code"] == "invalid_format"
    assert entry.options == {}


async def test_renaming_keeps_names_when_other_settings_change(
    hass, hass_ws_client, entry
) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "energy_assistant/update_config",
            "config": {"device_names": {"sensor.a_leistung": "A"}},
        }
    )
    await client.receive_json()
    await client.send_json_auto_id(
        {
            "type": "energy_assistant/update_config",
            "config": {"device_patterns": ["*_leistung"]},
        }
    )
    msg = await client.receive_json()
    assert msg["result"]["device_names"] == {"sensor.a_leistung": "A"}


async def test_update_config_stores_area_ids(hass, hass_ws_client, entry) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "energy_assistant/update_config",
            "config": {"area_ids": ["kueche", "wz_2"]},
        }
    )
    msg = await client.receive_json()
    assert msg["success"]
    assert msg["result"]["area_ids"] == ["kueche", "wz_2"]
    assert entry.options["area_ids"] == ["kueche", "wz_2"]
    # an empty selection is stored too and means "all areas"
    await client.send_json_auto_id(
        {"type": "energy_assistant/update_config", "config": {"area_ids": []}}
    )
    msg = await client.receive_json()
    assert msg["success"]
    assert msg["result"]["area_ids"] == []


async def test_update_config_rejects_invalid_area_ids(
    hass, hass_ws_client, entry
) -> None:
    client = await hass_ws_client(hass)
    for ids in (["Küche"], ["a b"], ["Wohnzimmer"], [""]):
        await client.send_json_auto_id(
            {"type": "energy_assistant/update_config", "config": {"area_ids": ids}}
        )
        msg = await client.receive_json()
        assert not msg["success"], ids
        assert msg["error"]["code"] == "invalid_format"
    assert entry.options == {}


async def test_the_storage_numbers_are_validated_and_stored(
    hass, hass_ws_client, entry
) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "energy_assistant/update_config",
            "config": {
                "battery_soc": ["sensor.soc"],
                "battery_capacity": 10.5,
                "battery_min_soc": 10,
            },
        }
    )
    assert (await client.receive_json())["success"]
    assert entry.options["battery_soc"] == "sensor.soc"
    assert entry.options["battery_capacity"] == 10.5
    await client.send_json_auto_id({"type": "energy_assistant/get_config"})
    result = (await client.receive_json())["result"]
    assert result["battery_soc"] == ["sensor.soc"]
    assert (result["battery_capacity"], result["battery_min_soc"]) == (10.5, 10.0)
    # empty (null) means not set again; out of range is refused
    await client.send_json_auto_id(
        {"type": "energy_assistant/update_config", "config": {"battery_capacity": None}}
    )
    assert (await client.receive_json())["success"]
    assert "battery_capacity" not in entry.options
    await client.send_json_auto_id(
        {"type": "energy_assistant/update_config", "config": {"battery_min_soc": 120}}
    )
    assert not (await client.receive_json())["success"]


async def test_label_energy_lists_the_sensors_of_the_selected_labels(
    hass, hass_ws_client, entry
) -> None:
    from homeassistant.helpers import entity_registry as er

    from custom_components.energy_assistant.sensor import PERIODS, unique_id

    hass.config_entries.async_update_entry(entry, options={"label_ids": ["klima"]})
    registry = er.async_get(hass)
    for period in PERIODS[:2]:  # only some sensors exist
        registry.async_get_or_create(
            "sensor", DOMAIN, unique_id(entry.entry_id, "klima", period)
        )
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "energy_assistant/label_energy"})
    msg = await client.receive_json()
    assert msg["success"]
    assert set(msg["result"]["klima"]) == {"day", "week"}
    assert msg["result"]["klima"]["day"].startswith("sensor.")


async def test_update_config_stores_the_tariff_per_label(
    hass, hass_ws_client, entry
) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "energy_assistant/update_config",
            "config": {"label_tariffs": {"waermepumpe": "sensor.wp_preis"}},
        }
    )
    msg = await client.receive_json()
    assert msg["success"]
    assert msg["result"]["label_tariffs"] == {"waermepumpe": "sensor.wp_preis"}
    assert entry.options["label_tariffs"] == {"waermepumpe": "sensor.wp_preis"}


async def test_area_energy_lists_the_sensors_of_the_selected_areas(
    hass, hass_ws_client, entry
) -> None:
    from homeassistant.helpers import entity_registry as er

    from custom_components.energy_assistant.sensor import COST, PERIODS, unique_id

    hass.config_entries.async_update_entry(entry, options={"area_ids": ["wohnzimmer"]})
    registry = er.async_get(hass)
    for period in PERIODS[:2]:
        registry.async_get_or_create(
            "sensor", DOMAIN, unique_id(entry.entry_id, "wohnzimmer", period, "area")
        )
    registry.async_get_or_create(
        "sensor", DOMAIN, unique_id(entry.entry_id, "wohnzimmer", COST + "day", "area")
    )
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "energy_assistant/area_energy"})
    msg = await client.receive_json()
    assert msg["success"]
    assert set(msg["result"]["wohnzimmer"]) == {"day", "week", "cost_day"}
    # the labels command does not see them
    await client.send_json_auto_id({"type": "energy_assistant/label_energy"})
    assert (await client.receive_json())["result"] == {}


async def test_update_config_stores_the_tariff_per_area(
    hass, hass_ws_client, entry
) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "energy_assistant/update_config",
            "config": {"area_tariffs": {"keller": "sensor.wp_preis"}},
        }
    )
    msg = await client.receive_json()
    assert msg["success"]
    assert msg["result"]["area_tariffs"] == {"keller": "sensor.wp_preis"}
    assert entry.options["area_tariffs"] == {"keller": "sensor.wp_preis"}
