"""
main.py
-------
Application entry-point for the Text Summarization application.

Run with:
    streamlit run main.py

Responsibilities:
  - Streamlit page configuration
  - Navigation sidebar with page routing
  - Delegates rendering to individual page modules
"""

from __future__ import annotations

import streamlit as st

from config import (
    APP_NAME,
    APP_VERSION,
    PAGES,
    DEFAULT_PAGE,
    STREAMLIT_CONFIG,
)
from utils.logger import get_logger

logger = get_logger(__name__)


# ──────────────────────────────────────────────
# PAGE CONFIGURATION (must be the first Streamlit call)
# ──────────────────────────────────────────────
st.set_page_config(**STREAMLIT_CONFIG)


# ──────────────────────────────────────────────
# SESSION STATE INITIALISATION
# ──────────────────────────────────────────────

def _init_session_state() -> None:
    """Initialise all session-state keys once per browser session."""
    defaults = {
        "current_page":       DEFAULT_PAGE,
        "selected_model":     "facebook/bart-large-cnn",
        "prefill_text":       None,
        "last_result":        None,
        "ds_dataframe":       None,
        "theme_mode":         "dark",
    }
    from config import SUMMARIZATION_DEFAULTS
    if "theme_mode" not in st.session_state:
        st.session_state["theme_mode"] = "dark"
    if "current_page" not in st.session_state:
        st.session_state["current_page"] = DEFAULT_PAGE
    if "selected_model" not in st.session_state:
        st.session_state["selected_model"] = "facebook/bart-large-cnn"
    if "settings_min_len" not in st.session_state:
        st.session_state["settings_min_len"] = SUMMARIZATION_DEFAULTS.min_length
    if "settings_max_len" not in st.session_state:
        st.session_state["settings_max_len"] = SUMMARIZATION_DEFAULTS.max_length
    if "settings_beams" not in st.session_state:
        st.session_state["settings_beams"]   = SUMMARIZATION_DEFAULTS.num_beams
    if "settings_penalty" not in st.session_state:
        st.session_state["settings_penalty"] = SUMMARIZATION_DEFAULTS.length_penalty


# ──────────────────────────────────────────────
# PAGE ROUTER
# ──────────────────────────────────────────────

def _render_page(page_id: str) -> None:
    """Import and render the requested page module."""
    try:
        if page_id == "home":
            from views.home import render
        elif page_id == "summarizer":
            from views.summarizer import render
        elif page_id == "dataset_analysis":
            from views.dataset_analysis import render
        elif page_id == "rouge_evaluation":
            from views.rouge_evaluation import render
        elif page_id == "performance":
            from views.performance import render
        elif page_id == "settings":
            from views.settings import render
        elif page_id == "about":
            from views.about import render
        else:
            st.error(f"Unknown page: {page_id}")
            return

        render()

    except Exception as exc:
        logger.exception("Error rendering page '%s': %s", page_id, exc)
        st.error(f"❌ Failed to load page **{page_id}**: {exc}")
        st.exception(exc)


# ──────────────────────────────────────────────
# APPLICATION ENTRY-POINT
# ──────────────────────────────────────────────

def main() -> None:
    """Bootstrap and run the Streamlit application."""
    logger.info("Application started.")

    # Initialise session state
    _init_session_state()

    # Sidebar Navigation
    st.sidebar.title("Navigation")
    
    # Map labels to ids for the radio button
    page_options = {p["label"]: p["id"] for p in PAGES}
    
    # Get index of current page to set as default
    current_page = st.session_state.get("current_page", DEFAULT_PAGE)
    current_label = next((p["label"] for p in PAGES if p["id"] == current_page), PAGES[0]["label"])
    
    selected_label = st.sidebar.radio(
        "Go to",
        options=list(page_options.keys()),
        index=list(page_options.keys()).index(current_label)
    )
    
    selected_page_id = page_options[selected_label]
    st.session_state["current_page"] = selected_page_id

    # Render active page
    _render_page(selected_page_id)


if __name__ == "__main__":
    main()
