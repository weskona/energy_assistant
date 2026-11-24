"""Optional data from sibling integrations (Tariffy, ...), read only.

Every provider looks for its integration in the entity registry (platform + translation key, which stay
the same in every language) and answers with entity ids. The panel then reads the live values from the
states itself. Without the integration a provider answers nothing, so every integration keeps running
on its own and Energy Assistant only shows what exists.
"""

from __future__ import annotations

from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er

TARIFFY = "tariffy"
EV_ASSISTANT = "ev_assistant"
AMORTIX = "amortix"
_AMORTIX_KEYS = (
    "einsparung",
    "investition",
    "fortschritt",
    "verbleibend",
    "tagesschnitt",
    "resttage",
    "datum",
)
PV_ASSISTANT = "pv_assistant"
_PV_KEYS = (
    "production_today",
    "feed_in_today",
    "self_consumption_rate_today",
    "autarky_today",
    "benefit_today",
    "forecast_reached_today",
    "expected_feed_in_tomorrow",
    "best_window_tomorrow",
    "storage_usable",
    "storage_empty_at",
    "string_fault",
)
_EV_KEYS = (
    "home_kwh",
    "home_cost",
    "kwh_day",
    "cost_day",
    "charge_before_pv_recommended",
)
_ELECTRICITY = ("electricity", "strom", "electricity_ht_nt")
_TARIFFY_KEYS = (
    "arbeitspreis",
    "einspeiseverguetung",
    "kosten_bisher",
    "guthaben_bisher",
    "prognose_real",
)


def _title(hass: HomeAssistant, entry_id: str | None, default: str = "") -> str:
    """The title of a config entry (the contract, the vehicle ...)."""
    config_entry = hass.config_entries.async_get_entry(entry_id) if entry_id else None
    return config_entry.title if config_entry else default


def _tariffy_entities(
    hass: HomeAssistant, excluded: frozenset[str] = frozenset()
) -> dict[str, dict[str, str]]:
    """Tariffy sensors by contract (config entry) and translation key."""
    contracts: dict[str, dict[str, str]] = {}
    for entry in er.async_get(hass).entities.values():
        if (
            entry.platform == TARIFFY
            and entry.domain == "sensor"
            and not entry.disabled_by
            and entry.config_entry_id
            and entry.translation_key in _TARIFFY_KEYS
            and entry.entity_id not in excluded
        ):
            contracts.setdefault(entry.config_entry_id, {})[entry.translation_key] = (
                entry.entity_id
            )
    return contracts


def tariffy(
    hass: HomeAssistant, excluded: frozenset[str] = frozenset()
) -> dict[str, Any] | None:
    """Electricity price, feed-in tariff and the contract balance of Tariffy.

    The price is the unit price of the first electricity contract (its attribute `arbeitspreis_aktuell`
    carries the live price of a dynamic tariff). The feed-in tariff may belong to another contract.
    """
    contracts = _tariffy_entities(hass, excluded)
    price_contract: dict[str, str] | None = None
    for _entry_id, keys in sorted(contracts.items()):
        price = keys.get("arbeitspreis")
        state = hass.states.get(price) if price else None
        if state and state.attributes.get("sparte") in _ELECTRICITY:
            price_contract = keys
            break
    if price_contract is None:
        return None
    feed_in = next(
        (
            keys["einspeiseverguetung"]
            for _id, keys in sorted(contracts.items())
            if "einspeiseverguetung" in keys
        ),
        None,
    )
    prices = []
    for _entry_id, keys in sorted(contracts.items()):
        entity_id = keys.get("arbeitspreis")
        state = hass.states.get(entity_id) if entity_id else None
        if state and state.attributes.get("sparte") in _ELECTRICITY:
            prices.append(
                {
                    "entity": entity_id,
                    "name": state.attributes.get("friendly_name") or entity_id,
                }
            )
    return {
        "price": price_contract["arbeitspreis"],
        "prices": prices,  # every electricity contract, for the choice per label
        "feed_in": feed_in,
        "cost_so_far": price_contract.get("kosten_bisher"),
        "balance": price_contract.get("guthaben_bisher"),
        "forecast": price_contract.get("prognose_real"),
    }


def _ev_vehicles(
    hass: HomeAssistant, excluded: frozenset[str] = frozenset()
) -> dict[str, dict[str, str]]:
    """EV Assistant sensors by vehicle (config entry) and translation key."""
    vehicles: dict[str, dict[str, str]] = {}
    for entry in er.async_get(hass).entities.values():
        if (
            entry.platform == EV_ASSISTANT
            and not entry.disabled_by
            and entry.config_entry_id
            and entry.translation_key in _EV_KEYS
            and entry.entity_id not in excluded
        ):
            vehicles.setdefault(entry.config_entry_id, {})[entry.translation_key] = (
                entry.entity_id
            )
    return vehicles


def _ev_wallbox_power(hass: HomeAssistant, entry_id: str) -> str | None:
    """The power sensor of the wallbox EV Assistant was set up with (its `home_entity`), if it is a sensor."""
    config_entry = hass.config_entries.async_get_entry(entry_id)
    wallbox = (
        {**config_entry.data, **config_entry.options}.get("home_entity")
        if config_entry
        else None
    )
    return (
        wallbox if isinstance(wallbox, str) and wallbox.startswith("sensor.") else None
    )


def ev_assistant(
    hass: HomeAssistant, excluded: frozenset[str] = frozenset()
) -> dict[str, Any] | None:
    """Vehicles of EV Assistant with the entities that tell about home charging.

    The sensor `home_kwh` carries the live data of the wallbox in its attributes (`evcc_live` with evcc,
    otherwise `home_generic_live`; `charge_power` is in kW), `home_cost` the cumulative cost of the home charging
    (with the real price of every charging session), the others the energy and cost of today and the
    recommendation to charge before the PV production starts.
    """
    vehicles = _ev_vehicles(hass, excluded)
    result = []
    for entry_id, keys in vehicles.items():
        if "home_kwh" not in keys and "kwh_day" not in keys:
            continue
        wallbox = _ev_wallbox_power(hass, entry_id)
        result.append(
            {
                "name": _title(hass, entry_id, "EV"),
                # The power sensor of the wallbox that EV Assistant was set up with, so Energy Assistant
                # does not list the same wallbox twice when it is one of the device sensors.
                "wallbox_power": wallbox if wallbox not in excluded else None,
                # The wallbox sensor was deselected: no wallbox row in the device list (the EV tab stays).
                "wallbox_off": bool(wallbox) and wallbox in excluded,
                "live": keys.get("home_kwh"),
                "kwh_today": keys.get("kwh_day"),
                "cost_today": keys.get("cost_day"),
                # What the home charging really cost, with the price of every session (the solar share is free):
                # cumulative, so the cost of a period is the difference of two values.
                "home_cost": keys.get("home_cost"),
                "recommend": keys.get("charge_before_pv_recommended"),
            }
        )
    result.sort(key=lambda v: v["name"])
    return {"vehicles": result} if result else None


def _pv_entities(
    hass: HomeAssistant, excluded: frozenset[str] = frozenset()
) -> list[tuple[str, str]]:
    """(translation key, entity id) of the PV Assistant sensors, sorted by entity id."""
    return [
        (entry.translation_key, entry.entity_id)
        for entry in sorted(
            er.async_get(hass).entities.values(), key=lambda e: e.entity_id
        )
        if entry.platform == PV_ASSISTANT
        and not entry.disabled_by
        and entry.translation_key in _PV_KEYS
        and entry.entity_id not in excluded
    ]


def pv_assistant(
    hass: HomeAssistant, excluded: frozenset[str] = frozenset()
) -> dict[str, Any] | None:
    """Day figures, forecast and plant fault of PV Assistant, as entity ids by translation key.

    The panel reads the live values from the states (the sensors carry the values of today and the
    forecast for tomorrow; `best_window_tomorrow` has the attributes `end` and `energy`, `string_fault`
    the attribute `plants`).
    """
    found: dict[str, str] = {}
    for key, entity_id in _pv_entities(hass, excluded):
        found.setdefault(key, entity_id)
    return {"entities": found} if found else None


def _amortix_entries(hass: HomeAssistant) -> list[dict[str, Any]]:
    """The Amortix entries that count, with all their sensors (no sensor is left out here).

    Amortix has no translation keys, but its unique ids are `<entry id>_<key>`; the keys are in German
    and do not depend on the language. Sensors of single devices carry a suffix and are not meant here.
    The overview entry already combines all other entries, so it replaces them: the choice is made on
    the full set, so deselecting a sensor of the overview never brings the other entries back.
    """
    entries: dict[str, dict[str, str]] = {}
    for entry in er.async_get(hass).entities.values():
        if (
            entry.platform != AMORTIX
            or entry.domain != "sensor"
            or entry.disabled_by
            or not entry.config_entry_id
            or not entry.unique_id
        ):
            continue
        prefix = f"{entry.config_entry_id}_"
        key = (
            entry.unique_id[len(prefix) :]
            if entry.unique_id.startswith(prefix)
            else None
        )
        if key in _AMORTIX_KEYS:
            entries.setdefault(entry.config_entry_id, {})[key] = entry.entity_id
    found = []
    for entry_id, keys in entries.items():
        if "einsparung" not in keys and "fortschritt" not in keys:
            continue
        config_entry = hass.config_entries.async_get_entry(entry_id)
        found.append(
            {
                "title": config_entry.title if config_entry else "Amortix",
                "mode": config_entry.data.get("mode") if config_entry else None,
                "entities": keys,
            }
        )
    overview = [e for e in found if e["mode"] == "overview"]
    return sorted(overview or found, key=lambda e: e["title"])


def amortix(
    hass: HomeAssistant, excluded: frozenset[str] = frozenset()
) -> dict[str, Any] | None:
    """Savings and payback of Amortix: the overview if there is one, otherwise every entry."""
    chosen = []
    for entry in _amortix_entries(hass):
        keys = {k: e for k, e in entry["entities"].items() if e not in excluded}
        if "einsparung" in keys or "fortschritt" in keys:
            chosen.append({**entry, "entities": keys})
    return {"entries": chosen} if chosen else None


def available(
    hass: HomeAssistant, excluded: frozenset[str] = frozenset()
) -> dict[str, Any]:
    """Everything the sibling integrations offer right now (only what exists), without the deselected sensors."""
    found = {
        "tariffy": tariffy(hass, excluded),
        "ev_assistant": ev_assistant(hass, excluded),
        "pv_assistant": pv_assistant(hass, excluded),
        "amortix": amortix(hass, excluded),
    }
    return {name: data for name, data in found.items() if data}


def sources(hass: HomeAssistant) -> list[dict[str, str]]:
    """Every sensor Energy Assistant takes from the sibling integrations, for the list of sources.

    Always the full set (also the deselected ones, so they can be selected again): `integration`, `group`
    (contract, vehicle or entry; empty for PV Assistant), the `key` of the sensor and its `entity_id`.
    Tariffy: the sensors of the electricity contracts, the feed-in tariff of any contract.
    """
    out: list[dict[str, str]] = []
    for entry_id, keys in sorted(_tariffy_entities(hass).items()):
        price = keys.get("arbeitspreis")
        state = hass.states.get(price) if price else None
        electricity = bool(state and state.attributes.get("sparte") in _ELECTRICITY)
        for key in _TARIFFY_KEYS:
            if key in keys and (electricity or key == "einspeiseverguetung"):
                out.append(
                    {
                        "integration": TARIFFY,
                        "group": _title(hass, entry_id),
                        "key": key,
                        "entity_id": keys[key],
                    }
                )
    for entry_id, keys in sorted(_ev_vehicles(hass).items()):
        if "home_kwh" not in keys and "kwh_day" not in keys:
            continue
        group = _title(hass, entry_id, "EV")
        for key in _EV_KEYS:
            if key in keys:
                out.append(
                    {
                        "integration": EV_ASSISTANT,
                        "group": group,
                        "key": key,
                        "entity_id": keys[key],
                    }
                )
        if wallbox := _ev_wallbox_power(hass, entry_id):
            out.append(
                {
                    "integration": EV_ASSISTANT,
                    "group": group,
                    "key": "wallbox_power",
                    "entity_id": wallbox,
                }
            )
    out.extend(
        {"integration": PV_ASSISTANT, "group": "", "key": key, "entity_id": entity_id}
        for key, entity_id in _pv_entities(hass)
    )
    for entry in _amortix_entries(hass):
        for key in _AMORTIX_KEYS:
            if key in entry["entities"]:
                out.append(
                    {
                        "integration": AMORTIX,
                        "group": entry["title"],
                        "key": key,
                        "entity_id": entry["entities"][key],
                    }
                )
    return out
