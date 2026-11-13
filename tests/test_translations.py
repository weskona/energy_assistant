"""Translations must match the schemas."""

import json
from pathlib import Path

import pytest

from custom_components.energy_assistant.config_flow import (
    _devices_schema,
    _energy_schema,
    _grid_schema,
    _pv_schema,
    _storage_schema,
)

TRANSLATIONS = (
    Path(__file__).parent.parent / "custom_components/energy_assistant/translations"
)


@pytest.mark.parametrize("lang", ["de", "en"])
def test_every_field_is_translated(lang: str) -> None:
    data = json.loads((TRANSLATIONS / f"{lang}.json").read_text())
    schemas = {
        "pv": lambda _defaults: _pv_schema(),
        "energy": _energy_schema,
        "user": _grid_schema,
        "init": _grid_schema,
        "storage": _storage_schema,
        "devices": _devices_schema,
    }
    for section, steps in (
        ("config", ("pv", "user", "storage", "energy", "devices")),
        ("options", ("pv", "init", "storage", "energy", "devices")),
    ):
        assert set(data[section]["step"]) == set(steps)
        for step in steps:
            fields = {str(k) for k in schemas[step]({}).schema}
            assert set(data[section]["step"][step]["data"]) == fields
            assert data[section]["step"][step]["title"]
            assert data[section]["step"][step]["description"]
    assert "no_source" in data["config"]["error"]
    assert "no_source" in data["options"]["error"]
