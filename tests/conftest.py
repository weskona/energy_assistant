"""Shared fixtures."""

from unittest.mock import AsyncMock, patch

import pytest


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations):
    """Custom Integration im Test laden."""
    yield


@pytest.fixture(autouse=True)
def skip_dependencies():
    """The tests do not need frontend, http and panel_custom to be set up."""
    with (
        patch("homeassistant.config_entries.async_process_deps_reqs", AsyncMock()),
        patch("homeassistant.setup.async_process_deps_reqs", AsyncMock()),
    ):
        yield


@pytest.fixture
def mock_panel():
    """Intercept panel registration."""
    with (
        patch(
            "homeassistant.components.panel_custom.async_register_panel",
            AsyncMock(),
        ) as register,
        patch("homeassistant.components.frontend.async_remove_panel") as remove,
    ):
        yield register, remove
