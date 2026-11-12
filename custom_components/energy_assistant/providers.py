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
    return {
        "price": price_contract["arbeitspreis"],
        "feed_in": feed_in,
        "cost_so_far": price_contract.get("kosten_bisher"),
        "balance": price_contract.get("guthaben_bisher"),
        "forecast": price_contract.get("prognose_real"),
    }


def available(hass: HomeAssistant) -> dict[str, Any]:
    """Everything the sibling integrations offer right now (only what exists)."""
    found = {"tariffy": tariffy(hass)}
    return {name: data for name, data in found.items() if data}
