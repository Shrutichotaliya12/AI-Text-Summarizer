"""
tests/test_ui.py
-----------------
Smoke tests for the Streamlit page modules.

These tests verify that each page's render() function:
  - Can be imported without error
  - Can be called without crashing (using streamlit.testing.v1)
"""

from __future__ import annotations

import pytest


# We attempt to import streamlit AppTest.
# If the Streamlit version doesn't support it, tests are skipped.
try:
    from streamlit.testing.v1 import AppTest
    _HAS_APPTEST = True
except ImportError:
    _HAS_APPTEST = False


def _require_apptest(fn):
    """Decorator to skip tests when AppTest is unavailable."""
    return pytest.mark.skipif(
        not _HAS_APPTEST,
        reason="streamlit.testing.v1 not available (requires Streamlit ≥ 1.18)",
    )(fn)


# ──────────────────────────────────────────────
# IMPORT SMOKE TESTS (always run)
# ──────────────────────────────────────────────

class TestPageImports:
    """Ensure all page modules import without error."""

    def test_import_home(self):
        from pages import home
        assert hasattr(home, "render")

    def test_import_summarizer(self):
        from pages import summarizer
        assert hasattr(summarizer, "render")

    def test_import_dataset_analysis(self):
        from pages import dataset_analysis
        assert hasattr(dataset_analysis, "render")

    def test_import_rouge_evaluation(self):
        from pages import rouge_evaluation
        assert hasattr(rouge_evaluation, "render")

    def test_import_performance(self):
        from pages import performance
        assert hasattr(performance, "render")

    def test_import_settings(self):
        from pages import settings
        assert hasattr(settings, "render")

    def test_import_about(self):
        from pages import about
        assert hasattr(about, "render")


class TestConfigImport:
    """Ensure config imports cleanly and paths exist."""

    def test_config_import(self):
        import config
        assert config.APP_NAME != ""
        assert config.APP_VERSION != ""

    def test_paths_exist(self):
        from config import LOGS_DIR, CACHE_DIR, OUTPUT_DIR, HISTORY_DIR
        for p in [LOGS_DIR, CACHE_DIR, OUTPUT_DIR, HISTORY_DIR]:
            assert p.exists(), f"Path does not exist: {p}"

    def test_available_models_not_empty(self):
        from config import AVAILABLE_MODELS
        assert len(AVAILABLE_MODELS) > 0

    def test_pages_list_not_empty(self):
        from config import PAGES
        assert len(PAGES) > 0
        for p in PAGES:
            assert "id" in p and "label" in p


# ──────────────────────────────────────────────
# APPTEST RENDER TESTS (requires Streamlit ≥ 1.18)
# ──────────────────────────────────────────────

@_require_apptest
def test_main_app_loads():
    """Ensure main.py loads without raising an exception."""
    import os
    from pathlib import Path

    app_path = Path(__file__).parent.parent / "main.py"
    at = AppTest.from_file(str(app_path), default_timeout=30)
    at.run()
    assert not at.exception, f"App raised: {at.exception}"
