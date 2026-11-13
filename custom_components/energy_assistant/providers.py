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
_EV_KEYS = ("home_kwh", "kwh_day", "cost_day", "charge_before_pv_recommended")
_ELECTRICITY = ("electricity", "strom", "electricity_ht_nt")
_TARIFFY_KEYS = (
    "arbeitspreis",
    "einspeiseverguetung",
    "kosten_bisher",
    "guthaben_bisher",
    "prognose_real",
)


def _tariffy_entities(hass: HomeAssistant) -> dict[str, dict[str, str]]:
    """Tariffy sensors by contract (config entry) and translation key."""
    contracts: dict[str, dict[str, str]] = {}
    for entry in er.async_get(hass).entities.values():
        if (
            entry.platform == TARIFFY
            and entry.domain == "sensor"
            and not entry.disabled_by
            and entry.config_entry_id
            and entry.translation_key in _TARIFFY_KEYS
        ):
            contracts.setdefault(entry.config_entry_id, {})[entry.translation_key] = (
                entry.entity_id
            )
    return contracts


def tariffy(hass: HomeAssistant) -> dict[str, Any] | None:
    """Electricity price, feed-in tariff and the contract balance of Tariffy.

    The price is the unit price of the first electricity contract (its attribute `arbeitspreis_aktuell`
    carries the live price of a dynamic tariff). The feed-in tariff may belong to another contract.
    """
    contracts = _tariffy_entities(hass)
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


def ev_assistant(hass: HomeAssistant) -> dict[str, Any] | None:
    """Vehicles of EV Assistant with the entities that tell about home charging.

    The sensor `home_kwh` carries the live data of the wallbox in its attributes (`evcc_live` with evcc,
    otherwise `home_generic_live`; `charge_power` is in kW), the others the energy and cost of today and
    the recommendation to charge before the PV production starts.
    """
    vehicles: dict[str, dict[str, str]] = {}
    for entry in er.async_get(hass).entities.values():
        if (
            entry.platform == EV_ASSISTANT
            and not entry.disabled_by
            and entry.config_entry_id
            and entry.translation_key in _EV_KEYS
        ):
            vehicles.setdefault(entry.config_entry_id, {})[entry.translation_key] = (
                entry.entity_id
            )
    result = []
    for entry_id, keys in vehicles.items():
        if "home_kwh" not in keys and "kwh_day" not in keys:
            continue
        config_entry = hass.config_entries.async_get_entry(entry_id)
        wallbox = (
            {**config_entry.data, **config_entry.options}.get("home_entity")
            if config_entry
            else None
        )
        result.append(
            {
                "name": config_entry.title if config_entry else "EV",
                # The power sensor of the wallbox that EV Assistant was set up with, so Energy Assistant
                # does not list the same wallbox twice when it is one of the device sensors.
                "wallbox_power": wallbox
                if isinstance(wallbox, str) and wallbox.startswith("sensor.")
                else None,
                "live": keys.get("home_kwh"),
                "kwh_today": keys.get("kwh_day"),
                "cost_today": keys.get("cost_day"),
                "recommend": keys.get("charge_before_pv_recommended"),
            }
        )
    result.sort(key=lambda v: v["name"])
    return {"vehicles": result} if result else None


def pv_assistant(hass: HomeAssistant) -> dict[str, Any] | None:
    """Day figures, forecast and plant fault of PV Assistant, as entity ids by translation key.

    The panel reads the live values from the states (the sensors carry the values of today and the
    forecast for tomorrow; `best_window_tomorrow` has the attributes `end` and `energy`, `string_fault`
    the attribute `plants`).
    """
    found: dict[str, str] = {}
    for entry in sorted(
        er.async_get(hass).entities.values(), key=lambda e: e.entity_id
    ):
        if (
            entry.platform == PV_ASSISTANT
            and not entry.disabled_by
            and entry.translation_key in _PV_KEYS
        ):
            found.setdefault(entry.translation_key, entry.entity_id)
    return {"entities": found} if found else None


def amortix(hass: HomeAssistant) -> dict[str, Any] | None:
    """Savings and payback of Amortix: the overview if there is one, otherwise every entry.

    Amortix has no translation keys, but its unique ids are `<entry id>_<key>`; the keys are in German
    and do not depend on the language. Sensors of single devices carry a suffix and are not meant here.
    The overview entry already combines all other entries, so it replaces them.
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
    chosen = sorted(overview or found, key=lambda e: e["title"])
    return {"entries": chosen} if chosen else None


def available(hass: HomeAssistant) -> dict[str, Any]:
    """Everything the sibling integrations offer right now (only what exists)."""
    found = {
        "tariffy": tariffy(hass),
        "ev_assistant": ev_assistant(hass),
        "pv_assistant": pv_assistant(hass),
        "amortix": amortix(hass),
    }
    return {name: data for name, data in found.items() if data}
