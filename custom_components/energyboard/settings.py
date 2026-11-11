"""Helpers to read, validate and store the Energyboard settings."""

from __future__ import annotations

import re
from typing import Any

from .const import (
    BOOL_KEYS,
    CONF_GRID_IMPORT,
    CONF_GRID_POWER,
    CONF_HOUSE_POWER,
    CONFIG_KEYS,
    LABEL_KEYS,
    LIST_KEYS,
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


def valid_patterns(patterns: list[str]) -> bool:
    """Patterns may only contain entity id characters, * and ?."""
    return all(re.fullmatch(PATTERN_REGEX[1:-1], p) for p in patterns)


def normalize(data: dict[str, Any]) -> dict[str, Any]:
    """Settings as the panel sees them: lists, booleans and an optional house sensor."""
    return {
        key: clean_patterns(data.get(key))
        if key in TEXT_KEYS
        else clean_ids(data.get(key))
        if key in LABEL_KEYS
        else as_list(data.get(key))
        if key in LIST_KEYS
        else bool(data.get(key))
        if key in BOOL_KEYS
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
        elif key in LIST_KEYS or key in LABEL_KEYS:
            stored[key] = as_list(value)
        elif key in BOOL_KEYS:
            stored[key] = bool(value)
        elif value:
            stored[key] = value
    return stored
