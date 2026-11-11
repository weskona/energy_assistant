"""Gemeinsame Fixtures."""

from unittest.mock import AsyncMock, patch

import pytest


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations):
    """Custom Integration im Test laden."""
    yield


@pytest.fixture(autouse=True)
def skip_dependencies():
    """frontend, http und panel_custom brauchen wir für die Tests nicht wirklich."""
    with (
        patch("homeassistant.config_entries.async_process_deps_reqs", AsyncMock()),
        patch("homeassistant.setup.async_process_deps_reqs", AsyncMock()),
    ):
        yield


@pytest.fixture
def mock_panel():
    """Panel-Registrierung und statische Pfade abfangen."""
    with (
        patch(
            "homeassistant.components.panel_custom.async_register_panel",
            AsyncMock(),
        ) as register,
        patch("homeassistant.components.frontend.async_remove_panel") as remove,
    ):
        yield register, remove
