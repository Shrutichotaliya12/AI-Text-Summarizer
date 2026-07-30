"""
pages/dataset_analysis.py
--------------------------
Dataset Analysis page.
Standard Streamlit UI.
"""

from __future__ import annotations

import random
import pandas as pd
import streamlit as st
import plotly.express as px

from config import DATASET_CONFIG
from services.dataset_service import (
    load_cnn_dailymail,
    load_xsum,
    samples_to_dataframe,
    compute_dataset_stats,
    compute_word_frequency,
)
from utils.helpers import format_duration
from utils.logger import get_logger

logger = get_logger(__name__)


# ──────────────────────────────────────────────
# PAGE RENDER
# ──────────────────────────────────────────────

def render() -> None:
    """Render the Dataset Analysis page."""
    logger.debug("Rendering Dataset Analysis page.")
    
    st.title("📊 Dataset Analysis")
    st.write("Explore NLP benchmark datasets used for training and evaluating summarization models.")

    # ── Controls ──────────────────────────────
    st.markdown("### 📂 Dataset Settings")
    
    ctrl_col1, ctrl_col2, ctrl_col3, ctrl_col4 = st.columns(4)
    with ctrl_col1:
        dataset_choice = st.selectbox("Dataset", options=["CNN / DailyMail", "XSum"], key="ds_choice")
    with ctrl_col2:
        split = st.selectbox("Split", options=["test", "validation", "train"], key="ds_split")
    with ctrl_col3:
        sample_size = st.slider(
            "Sample Size",
            min_value=10, max_value=DATASET_CONFIG.max_sample_size,
            value=DATASET_CONFIG.default_sample_size, step=10, key="ds_sample_size"
        )
    with ctrl_col4:
        use_cache = st.checkbox("Use disk cache", value=True, key="ds_cache")
        st.markdown("<div style='margin-top: 10px;'></div>", unsafe_allow_html=True)
        load_btn  = st.button("📥 Load Dataset", type="primary", key="ds_load_btn", use_container_width=True)

    st.markdown("---")

    # ── Load ──────────────────────────────────
    if load_btn or "ds_dataframe" not in st.session_state:
        with st.spinner(f"Loading {dataset_choice} ({split}, n={sample_size})…"):
            try:
                import time
                t0 = time.perf_counter()

                if "CNN" in dataset_choice:
                    samples = load_cnn_dailymail(split=split, n=sample_size, use_cache=use_cache)
                else:
                    samples = load_xsum(split=split, n=sample_size, use_cache=use_cache)

                elapsed = time.perf_counter() - t0

                if not samples:
                    st.error("❌ Dataset returned empty. Check your internet connection.")
                    return

                df = samples_to_dataframe(samples)
                st.session_state["ds_dataframe"] = df
                st.session_state["ds_samples"] = samples
                st.session_state["ds_elapsed"]  = elapsed
                st.success(f"✅ Loaded {len(df):,} samples in {format_duration(elapsed)}.")
            except Exception as exc:
                st.error(f"❌ Failed to load dataset: {exc}")
                logger.exception("Dataset load failed: %s", exc)
                return

    df: pd.DataFrame = st.session_state.get("ds_dataframe", pd.DataFrame())
    samples = st.session_state.get("ds_samples", [])

    if df.empty:
        st.info("ℹ️ Configure the dataset settings above and click **Load Dataset**.")
        return

    # ── Missing Values Handling ───────────────
    st.markdown("### Dataset Quality")
    missing_vals = df.isnull().sum()
    if missing_vals.sum() > 0:
        st.warning(f"Found missing values:\n{missing_vals[missing_vals > 0]}")
    else:
        st.success("No missing values found in the loaded sample.")

    st.write(f"**Dataset Shape:** {df.shape[0]} rows, {df.shape[1]} columns.")

    # ── Stats cards ───────────────────────────
    stats = compute_dataset_stats(df)
    st.markdown("### 📈 Summary Statistics")

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Total Samples", f"{stats.get('total_samples', 0):,}")
    c2.metric("Avg Article Words", f"{stats.get('article_word_mean', 0):,.0f}")
    c3.metric("Avg Ref Words", f"{stats.get('ref_word_mean', 0):,.0f}")
    c4.metric("Compression Ratio", f"{stats.get('avg_compression_ratio', 0):.3f}")
        
    c5, c6, c7, c8 = st.columns(4)
    c5.metric("Min Article Words", f"{stats.get('article_word_min', 0):,}")
    c6.metric("Max Article Words", f"{stats.get('article_word_max', 0):,}")
    c7.metric("Min Ref Words", f"{stats.get('ref_word_min', 0):,}")
    c8.metric("Max Ref Words", f"{stats.get('ref_word_max', 0):,}")

    st.markdown("---")

    # ── Distributions ─────────────────────────
    st.markdown("### 📊 Length Distributions")
    col_left, col_right = st.columns(2)

    with col_left:
        st.write("**Article Word Count**")
        fig_art = px.histogram(df, x="article_words", nbins=20)
        st.plotly_chart(fig_art, use_container_width=True)

    with col_right:
        st.write("**Reference Summary Word Count**")
        fig_ref = px.histogram(df, x="ref_words", nbins=20)
        st.plotly_chart(fig_ref, use_container_width=True)

    st.markdown("---")

    # ── Word Frequency ────────────────────────
    st.markdown("### 🔤 Top Word Frequencies (Articles)")
    top_words = compute_word_frequency(samples, top_n=25)
    if top_words:
        wf_df = pd.DataFrame(top_words, columns=["word", "count"])
        fig_wf = px.bar(wf_df, x="word", y="count")
        st.plotly_chart(fig_wf, use_container_width=True)

    st.markdown("---")

    # ── Sample Preview ────────────────────────
    st.markdown("### 🗂️ Sample Preview")
    num_preview = st.slider("Number of rows to preview", 3, 20, 5, key="preview_n")

    random_samples = random.sample(samples, min(num_preview, len(samples)))
    preview_df = pd.DataFrame(
        [
            {
                "Article (first 200 chars)": s["article"][:200] + "…",
                "Reference (first 100 chars)": s["highlights"][:100] + "…",
            }
            for s in random_samples
        ]
    )
    st.dataframe(preview_df, use_container_width=True)

    st.markdown("---")

    # ── Export ────────────────────────────────
    st.markdown("### 📥 Export")
    csv_data = df.to_csv(index=False)
    st.download_button(
        label="⬇️ Download Dataset Stats as CSV",
        data=csv_data,
        file_name=f"dataset_stats_{dataset_choice.replace(' ', '_').lower()}.csv",
        mime="text/csv",
        key="ds_export_csv",
    )
