"""Übersetzungen müssen zu den Schemas passen."""

import json
from pathlib import Path

import pytest

from custom_components.energyboard.config_flow import _grid_schema, _storage_schema

TRANSLATIONS = (
    Path(__file__).parent.parent / "custom_components/energyboard/translations"
)


@pytest.mark.parametrize("lang", ["de", "en"])
def test_every_field_is_translated(lang: str) -> None:
    data = json.loads((TRANSLATIONS / f"{lang}.json").read_text())
    for section, steps in (
        ("config", ("user", "storage")),
        ("options", ("init", "storage")),
    ):
        for step in steps:
            schema = (
                _grid_schema({}) if step in ("user", "init") else _storage_schema({})
            )
            fields = {str(k) for k in schema.schema}
            assert set(data[section]["step"][step]["data"]) == fields
            assert data[section]["step"][step]["title"]
            assert data[section]["step"][step]["description"]
    assert "no_source" in data["config"]["error"]
    assert "no_source" in data["options"]["error"]
