"""
pages/settings.py
-----------------
Application Settings page.

Allows the user to configure:
  - Default model
  - Default summarization parameters
  - Theme preferences (display only — Streamlit theme is set in config)
  - Cache management (clear model cache, clear disk cache)
  - Model unloading
  - Logging level
  - History management
"""

from __future__ import annotations

import streamlit as st

from config import AVAILABLE_MODELS, SUMMARIZATION_DEFAULTS, CACHE_DIR, HISTORY_DIR
from models.model_loader import ModelLoader
from utils.file_manager import clear_history, load_history
from utils.helpers import format_bytes
from utils.logger import get_logger

logger = get_logger(__name__)


def render() -> None:
    """Render the Settings page."""
    logger.debug("Rendering Settings page.")
    st.title("⚙️ Settings")
    st.write("Configure application defaults, manage cached models, and control data retention.")

    loader = ModelLoader.instance()

    # ══════════════════════════════════════════
    # SECTION: DEFAULT MODEL
    # ══════════════════════════════════════════
    st.subheader("🤖 Default Model")
    model_options = {cfg.display_name: mid for mid, cfg in AVAILABLE_MODELS.items()}
    current_default = st.session_state.get("settings_default_model", "facebook/bart-large-cnn")

    new_default_display = st.selectbox(
        "Default model used in the Summarizer:",
        options=list(model_options.keys()),
        index=list(model_options.values()).index(current_default)
        if current_default in model_options.values()
        else 0,
        key="settings_model_selector",
    )
    new_default = model_options[new_default_display]
    if new_default != current_default:
        st.session_state["settings_default_model"] = new_default
        st.session_state["selected_model"] = new_default
        st.success(f"✅ Default model updated to {new_default}.")

    # ══════════════════════════════════════════
    # SECTION: DEFAULT PARAMETERS
    # ══════════════════════════════════════════
    st.markdown("---")
    st.subheader("⚙️ Default Generation Parameters")

    col1, col2 = st.columns(2)
    with col1:
        default_min_len = st.number_input(
            "Default Min Length (tokens)",
            min_value=10, max_value=200,
            value=int(st.session_state.get("settings_min_len", SUMMARIZATION_DEFAULTS.min_length)),
            step=5,
            key="settings_min_len_input",
        )
        default_beams = st.number_input(
            "Default Beam Width",
            min_value=1, max_value=8,
            value=int(st.session_state.get("settings_beams", SUMMARIZATION_DEFAULTS.num_beams)),
            step=1,
            key="settings_beams_input",
        )
    with col2:
        default_max_len = st.number_input(
            "Default Max Length (tokens)",
            min_value=50, max_value=512,
            value=int(st.session_state.get("settings_max_len", SUMMARIZATION_DEFAULTS.max_length)),
            step=10,
            key="settings_max_len_input",
        )
        default_penalty = st.number_input(
            "Default Length Penalty",
            min_value=0.5, max_value=5.0,
            value=float(st.session_state.get("settings_penalty", SUMMARIZATION_DEFAULTS.length_penalty)),
            step=0.25,
            key="settings_penalty_input",
        )

    if st.button("💾 Save Parameter Defaults", key="settings_save_params"):
        if default_min_len >= default_max_len:
            st.error("❌ Min length must be less than max length.")
        else:
            st.session_state["settings_min_len"]  = default_min_len
            st.session_state["settings_max_len"]  = default_max_len
            st.session_state["settings_beams"]    = default_beams
            st.session_state["settings_penalty"]  = default_penalty
            # Propagate to summarizer sliders via session state keys
            st.session_state["param_min_len"]     = default_min_len
            st.session_state["param_max_len"]     = default_max_len
            st.session_state["param_beams"]       = default_beams
            st.session_state["param_len_penalty"] = default_penalty
            st.success("✅ Generation parameters saved.")

    # ══════════════════════════════════════════
    # SECTION: LOADED MODELS
    # ══════════════════════════════════════════
    st.markdown("---")
    st.subheader("🧠 Loaded Models")

    loaded = loader.loaded_models()
    if loaded:
        st.markdown(f"**{len(loaded)} model(s) currently in memory:**")
        for mid in loaded:
            c1, c2 = st.columns([4, 1])
            info = loader.get_model_info(mid)
            with c1:
                st.markdown(
                    f"• **{info.get('display_name', mid)}** — "
                    f"`{mid}`"
                )
            with c2:
                if st.button("🗑️ Unload", key=f"unload_{mid.replace('/', '_')}"):
                    loader.unload_model(mid)
                    st.success(f"✅ Unloaded {mid}.")
                    st.rerun()

        if st.button("🗑️ Unload All Models", key="unload_all"):
            loader.unload_all()
            st.success("✅ All models unloaded.")
            st.rerun()
    else:
        st.info("ℹ️ No models currently loaded in memory.")

    # ══════════════════════════════════════════
    # SECTION: CACHE MANAGEMENT
    # ══════════════════════════════════════════
    st.markdown("---")
    st.subheader("🗂️ Cache Management")

    # Disk cache size
    cache_size = sum(f.stat().st_size for f in CACHE_DIR.rglob("*") if f.is_file())
    st.markdown(f"**Disk cache size:** `{format_bytes(cache_size)}`  (`{CACHE_DIR}`)")

    if st.button("🧹 Clear Disk Cache", key="clear_cache"):
        for f in CACHE_DIR.glob("*.json"):
            try:
                f.unlink()
            except OSError:
                pass
        st.success("✅ Disk cache cleared.")

    # ══════════════════════════════════════════
    # SECTION: HISTORY
    # ══════════════════════════════════════════
    st.markdown("---")
    st.subheader("🕑 Summarization History")

    history = load_history()
    st.markdown(f"**Total records:** `{len(history)}`")

    if history:
        if st.button("🗑️ Clear All History", key="clear_history_btn"):
            clear_history()
            st.success("✅ History cleared.")
            st.rerun()
    else:
        st.info("ℹ️ No history records found.")

    # ══════════════════════════════════════════
    # SECTION: LOGGING
    # ══════════════════════════════════════════
    st.markdown("---")
    st.subheader("📋 Logging")

    log_level = st.selectbox(
        "Log Level",
        options=["DEBUG", "INFO", "WARNING", "ERROR"],
        index=1,
        key="settings_log_level",
    )
    st.caption(
        "Log level applies to this session. Logs are written to `logs/app.log`."
    )

    from config import LOG_FILE
    st.code(str(LOG_FILE), language="bash")

    if LOG_FILE.exists():
        tail_lines = LOG_FILE.read_text(encoding="utf-8").splitlines()[-50:]
        with st.expander("📜 View Last 50 Log Lines"):
            st.code("\n".join(tail_lines), language="log")
