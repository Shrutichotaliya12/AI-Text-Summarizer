"""
pages/about.py
--------------
About page — project overview, architecture, model details, and credits.
"""

from __future__ import annotations

import streamlit as st

from config import APP_NAME, APP_VERSION, APP_AUTHOR, APP_DESCRIPTION, AVAILABLE_MODELS
from utils.constants import FOOTER_TEXT
from utils.logger import get_logger

logger = get_logger(__name__)


def render() -> None:
    """Render the About page."""
    logger.debug("Rendering About page.")
    st.title("ℹ️ About")

    # ── Hero description ──────────────────────
    st.markdown(f"## 📝 {APP_NAME}")
    st.write(APP_DESCRIPTION)
    st.markdown(f"**Version:** {APP_VERSION} | **Python:** 3.11+ | **Framework:** HuggingFace Transformers")

    # ── Architecture ──────────────────────────
    st.subheader("🏗️ Architecture")
    st.markdown(
        """
        The project follows **Clean Architecture** with **SOLID** principles:

        | Layer | Description |
        |---|---|
        | **`config.py`** | Single source of truth for all settings and paths |
        | **`utils/`** | Pure utility functions: logger, validators, helpers, file I/O |
        | **`models/`** | Thin wrappers around HuggingFace pipelines (T5, BART) |
        | **`services/`** | Business logic: summarization, ROUGE, dataset, performance |
        | **`pages/`** | Streamlit UI pages — depend only on services, never on models directly |
        | **`main.py`** | App entry-point: page router + global CSS injection |

        **Key design decisions:**
        - `ModelLoader` is a **singleton** — prevents duplicate model loads across reruns
        - All services are **stateless** (except `PerformanceService` which holds a rolling list)
        - Validators follow a consistent `(bool, str)` contract
        - JSON history is append-only with a hard cap to prevent unbounded growth
        """
    )

    # ── Models ────────────────────────────────
    st.markdown("---")
    st.subheader("🤖 Available Models")

    for mid, cfg in AVAILABLE_MODELS.items():
        with st.expander(f"{cfg.display_name} — `{mid}`"):
            c1, c2, c3, c4 = st.columns(4)
            c1.metric("Max Input Tokens", cfg.max_input_tokens)
            c2.metric("Min Summary Tokens", cfg.min_summary_length)
            c3.metric("Max Summary Tokens", cfg.max_summary_length)
            c4.metric("Task Prefix", f'"{cfg.task_prefix}"' if cfg.task_prefix else "—")
            st.markdown(f"**Description:** {cfg.description}")
            st.markdown(f"**HuggingFace Hub:** https://huggingface.co/{mid}")

    # ── Evaluation Metrics ────────────────────
    st.markdown("---")
    st.subheader("📈 Evaluation Metrics")
    st.markdown(
        """
        | Metric | Description |
        |---|---|
        | **ROUGE-1** | Unigram (word) overlap between prediction and reference |
        | **ROUGE-2** | Bigram overlap — captures phrase-level similarity |
        | **ROUGE-L** | Longest common subsequence — captures sentence structure |
        | **ROUGE-Lsum** | ROUGE-L applied at summary level (multi-sentence) |

        Scores are F1 (harmonic mean of precision and recall) unless otherwise specified.
        Range: 0.0 (no overlap) → 1.0 (perfect match).

        **Quality thresholds used in this app:**

        | Metric | Good ✅ | Fair ⚠️ | Poor ❌ |
        |---|---|---|---|
        | ROUGE-1 | ≥ 0.40 | ≥ 0.25 | < 0.25 |
        | ROUGE-2 | ≥ 0.18 | ≥ 0.10 | < 0.10 |
        | ROUGE-L | ≥ 0.35 | ≥ 0.20 | < 0.20 |
        """
    )

    # ── Dependencies ─────────────────────────
    st.markdown("---")
    st.subheader("📦 Key Dependencies")
    st.markdown(
        """
        | Package | Purpose |
        |---|---|
        | `streamlit` | Web UI framework |
        | `transformers` | HuggingFace model hub & inference |
        | `torch` | Deep learning backend (CPU/CUDA/MPS) |
        | `datasets` | HuggingFace dataset loading |
        | `rouge-score` | ROUGE metric computation |
        | `psutil` | System resource monitoring |
        | `pandas` | Data manipulation |
        | `PyMuPDF` | PDF text extraction |
        """
    )

    # ── Credits ───────────────────────────────
    st.markdown("---")
    st.subheader("🙏 Credits")
    st.markdown(
        f"""
        - **Author:** {APP_AUTHOR}
        - **Transformer Models:** [HuggingFace](https://huggingface.co)
        - **ROUGE Implementation:** [Google Brain / rouge-score](https://github.com/google-research/google-research/tree/master/rouge)
        - **Datasets:** CNN/DailyMail, XSum via [HuggingFace Datasets](https://huggingface.co/datasets)
        - **UI Framework:** [Streamlit](https://streamlit.io)
        """
    )

    st.markdown("---")
    st.caption(FOOTER_TEXT)
