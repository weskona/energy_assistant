"""Helpers to read, validate and store the Energy Assistant settings."""

from __future__ import annotations

import math
import re
from typing import Any

from .const import (
    BOOL_KEYS,
    CONF_AREA_TARIFFS,
    CONF_DEVICE_TARIFFS,
    CONF_GRID_IMPORT,
    CONF_GRID_POWER,
    CONF_HISTORY_YEARS,
    CONF_HOUSE_POWER,
    CONF_LABEL_TARIFFS,
    CONFIG_KEYS,
    DICT_KEYS,
    HISTORY_KINDS,
    HISTORY_MAX_COST,
    HISTORY_MAX_KWH,
    HISTORY_MIN_YEAR,
    ID_KEYS,
    LIST_KEYS,
    NUMBER_KEYS,
    PATTERN_REGEX,
    SINGLE_KEYS,
    TEXT_KEYS,
)


def as_list(value: str | list[str] | None) -> list[str]:
    """Normalize a single entity or a list to a list."""
    if not value:
        return []
    return [value] if isinstance(value, str) else list(value)


def clean_patterns(value: str | list[str] | None) -> list[str]:
    """Strip and lowercase patterns, drop empty ones and duplicates."""
    seen: list[str] = []
    for item in as_list(value):
        pattern = str(item).strip().lower()
        if pattern and pattern not in seen:
            seen.append(pattern)
    return seen


def clean_ids(value: str | list[str] | None) -> list[str]:
    """Strip ids, drop empty ones and duplicates (keeps the order)."""
    seen: list[str] = []
    for item in as_list(value):
        label_id = str(item).strip()
        if label_id and label_id not in seen:
            seen.append(label_id)
    return seen


def clean_names(value: Any) -> dict[str, str]:
    """Display names per entity id: strip them and drop empty names (an empty name resets it)."""
    if not isinstance(value, dict):
        return {}
    names: dict[str, str] = {}
    for entity_id, name in value.items():
        text = str(name).strip() if name is not None else ""
        if text and isinstance(entity_id, str) and entity_id:
            names[entity_id] = text
    return names


def clean_label_tariffs(value: Any) -> dict[str, str]:
    """Tariffy price sensor per label: keep only valid label ids with a sensor entity id."""
    if not isinstance(value, dict):
        return {}
    return {
        label_id: entity_id
        for label_id, entity_id in value.items()
        if isinstance(label_id, str)
        and isinstance(entity_id, str)
        and re.fullmatch(r"[a-z0-9_]+", label_id)
        and re.fullmatch(r"sensor\.[a-z0-9_]+", entity_id)
    }


def clean_device_tariffs(value: Any) -> dict[str, str]:
    """Tariffy price sensor per device: keep only entries of two sensor entity ids."""
    if not isinstance(value, dict):
        return {}
    return {
        device: price
        for device, price in value.items()
        if isinstance(device, str)
        and isinstance(price, str)
        and re.fullmatch(r"sensor\.[a-z0-9_]+", device)
        and re.fullmatch(r"sensor\.[a-z0-9_]+", price)
    }


def clean_history_entry(entry: Any) -> dict[str, float] | None:
    """One value: a finite, positive, plausible kWh number and an optional cost (dropped when unusable)."""
    if not isinstance(entry, dict):
        return None
    kwh = clean_number(entry.get("kwh"))
    if kwh is None or not math.isfinite(kwh) or kwh <= 0 or kwh > HISTORY_MAX_KWH:
        return None
    item = {"kwh": kwh}
    cost = clean_number(entry.get("cost"))
    if cost is not None and math.isfinite(cost) and 0 < cost <= HISTORY_MAX_COST:
        item["cost"] = cost
    return item


def clean_history(
    value: Any, max_year: int | None = None
) -> dict[str, dict[str, dict[str, float]]]:
    """Energy of past years entered by hand: {year: {kind: {"kwh", "cost"?}}}.

    The first version stored {year: {"kwh", "cost"?}} for the house only; that shape is taken over as the kind
    "house". A year needs a plausible number and at least one valid kind.
    """
    if not isinstance(value, dict):
        return {}
    years: dict[str, dict[str, dict[str, float]]] = {}
    for key, entry in value.items():
        try:
            year = int(str(key).strip())
        except ValueError:
            continue
        if year < HISTORY_MIN_YEAR or (max_year is not None and year > max_year):
            continue
        if not isinstance(entry, dict):
            continue
        kinds = {"house": entry} if "kwh" in entry else entry
        cleaned = {
            kind: item
            for kind in HISTORY_KINDS
            if (item := clean_history_entry(kinds.get(kind))) is not None
        }
        if cleaned:
            years[str(year)] = cleaned
    return dict(sorted(years.items()))


def clean_number(value: Any) -> float | None:
    """A number or None: texts with a decimal comma work, anything unusable (and negative values) means not set."""
    if isinstance(value, bool) or value is None:
        return None
    try:
        number = (
            float(str(value).replace(",", "."))
            if isinstance(value, str)
            else float(value)
        )
    except ValueError:
        return None
    return (
        None if math.isnan(number) or number < 0 else number
    )  # NaN and negatives are not set


def valid_patterns(patterns: list[str]) -> bool:
    """Patterns may only contain entity id characters, * and ?."""
    return all(re.fullmatch(PATTERN_REGEX[1:-1], p) for p in patterns)


def normalize(data: dict[str, Any]) -> dict[str, Any]:
    """Settings as the panel sees them: lists, booleans and an optional house sensor."""
    return {
        key: clean_patterns(data.get(key))
        if key in TEXT_KEYS
        else clean_label_tariffs(data.get(key))
        if key in (CONF_LABEL_TARIFFS, CONF_AREA_TARIFFS)
        else clean_device_tariffs(data.get(key))
        if key == CONF_DEVICE_TARIFFS
        else clean_history(data.get(key))
        if key == CONF_HISTORY_YEARS
        else clean_names(data.get(key))
        if key in DICT_KEYS
        else clean_ids(data.get(key))
        if key in ID_KEYS
        else as_list(data.get(key))
        if key in LIST_KEYS
        else bool(data.get(key))
        if key in BOOL_KEYS
        else clean_number(data.get(key))
        if key in NUMBER_KEYS
        else data.get(key) or None
        for key in CONFIG_KEYS
    }


def has_source(data: dict[str, Any]) -> bool:
    """A house sensor or a grid sensor is needed to know the house power."""
    return bool(
        data.get(CONF_HOUSE_POWER)
        or as_list(data.get(CONF_GRID_IMPORT))
        or as_list(data.get(CONF_GRID_POWER))
    )


def to_storage(settings: dict[str, Any]) -> dict[str, Any]:
    """Settings in the shape the config and options flow store them."""
    stored: dict[str, Any] = {}
    for key in CONFIG_KEYS:
        value = settings.get(key)
        if key in SINGLE_KEYS:
            items = as_list(value)
            if items:
                stored[key] = items[0]
        elif key == CONF_DEVICE_TARIFFS:
            if device_tariffs := clean_device_tariffs(value):
                stored[key] = device_tariffs
        elif key in (CONF_LABEL_TARIFFS, CONF_AREA_TARIFFS):
            if tariffs := clean_label_tariffs(value):
                stored[key] = tariffs
        elif key == CONF_HISTORY_YEARS:
            if history := clean_history(value):
                stored[key] = history
        elif key in DICT_KEYS:
            if value:
                stored[key] = clean_names(value)
        elif key in LIST_KEYS or key in ID_KEYS:
            stored[key] = as_list(value)
        elif key in BOOL_KEYS:
            stored[key] = bool(value)
        elif key in NUMBER_KEYS:
            if (number := clean_number(value)) is not None:
                stored[key] = number
        elif value:
            stored[key] = value
    return stored
