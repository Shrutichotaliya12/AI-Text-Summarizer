"""
pages/performance.py
---------------------
Performance Monitoring page.
Standard Streamlit UI.
"""

from __future__ import annotations

import time

import pandas as pd
import streamlit as st
import plotly.express as px

from services.performance_service import PerformanceService, SystemSnapshot
from utils.helpers import format_duration, format_bytes
from utils.logger import get_logger

logger = get_logger(__name__)

# One shared PerformanceService per Streamlit session
@st.cache_resource
def _get_perf_service() -> PerformanceService:
    return PerformanceService()


# ──────────────────────────────────────────────
# PAGE RENDER
# ──────────────────────────────────────────────

def render() -> None:
    """Render the Performance Monitoring page."""
    logger.debug("Rendering Performance page.")
    svc = _get_perf_service()
    
    st.title("⚡ Performance Monitor")
    st.write("Monitor CPU, RAM, GPU usage and track inference performance across runs.")

    # ── Live resource gauges ──────────────────
    st.markdown("### 🖥️ System Resources (Live)")

    auto_refresh = st.checkbox("Auto-refresh every 5 s", value=False, key="perf_auto_refresh")

    snap: SystemSnapshot = svc.snapshot()

    col_sys1, col_sys2, col_sys3 = st.columns(3)

    col_sys1.metric("CPU Usage", f"{snap.cpu_percent:.1f}%")
    col_sys2.metric(
        "RAM Used", 
        f"{snap.ram_used_mb / 1024:.1f} GB", 
        f"{snap.ram_percent:.1f}% of {snap.ram_total_mb/1024:.1f} GB", 
        delta_color="off"
    )

    if snap.gpu_vram_total_mb > 0:
        col_sys3.metric(
            "GPU VRAM", 
            f"{snap.gpu_vram_used_mb:.1f} MB", 
            f"Total: {snap.gpu_vram_total_mb:.1f} MB", 
            delta_color="off"
        )
    else:
        col_sys3.info("ℹ️ No GPU detected — running on CPU.")

    if auto_refresh:
        time.sleep(5)
        st.rerun()

    st.markdown("---")

    # ── Inference history ─────────────────────
    history = svc.get_history()

    if not history:
        st.info(
            "ℹ️ No inference runs recorded yet. "
            "Generate summaries on the **Summarizer** page to populate this chart."
        )
        return

    history_df = pd.DataFrame(svc.history_as_dicts())

    # ── Summary stats cards ───────────────────
    st.markdown("### 📊 Inference Statistics")
    agg = svc.aggregate()

    c1, c2, c3, c4, c5 = st.columns(5)
    c1.metric("Total Runs", str(agg.get("total_runs", 0)))
    c2.metric("Avg Time", format_duration(agg.get("avg_time_s", 0)))
    c3.metric("Min Time", format_duration(agg.get("min_time_s", 0)))
    c4.metric("Max Time", format_duration(agg.get("max_time_s", 0)))
    c5.metric("Avg Tok/s", f"{agg.get('avg_tokens_per_s', 0):.1f}")

    st.markdown("---")

    # ── Inference time chart ──────────────────
    st.markdown("### 📈 Inference Time Over Runs")
    time_df = pd.DataFrame(
        {
            "run": range(1, len(history) + 1),
            "inference_time_s": history_df["inference_time_s"],
        }
    )
    fig_time = px.line(time_df, x="run", y="inference_time_s", markers=True)
    st.plotly_chart(fig_time, use_container_width=True)

    # ── Tokens/s chart ────────────────────────
    st.markdown("### 🚀 Tokens per Second")
    tps_df = pd.DataFrame(
        {
            "run": range(1, len(history) + 1),
            "tokens_per_second": history_df["tokens_per_second"],
        }
    )
    fig_tps = px.line(tps_df, x="run", y="tokens_per_second", markers=True)
    st.plotly_chart(fig_tps, use_container_width=True)

    st.markdown("---")

    # ── Per-model table ───────────────────────
    st.markdown("### 🤖 Per-Model Breakdown")
    model_group = (
        history_df.groupby("model_id")
        .agg(
            runs=("inference_time_s", "count"),
            avg_time=("inference_time_s", "mean"),
            avg_tps=("tokens_per_second", "mean"),
            avg_ram_delta=("ram_delta_mb", "mean"),
        )
        .reset_index()
        .rename(columns={
            "model_id":    "Model",
            "runs":        "Runs",
            "avg_time":    "Avg Time (s)",
            "avg_tps":     "Avg Tok/s",
            "avg_ram_delta": "Avg ΔRAM (MB)",
        })
    )
    model_group["Avg Time (s)"] = model_group["Avg Time (s)"].round(3)
    model_group["Avg Tok/s"]    = model_group["Avg Tok/s"].round(1)
    model_group["Avg ΔRAM (MB)"] = model_group["Avg ΔRAM (MB)"].round(1)
    st.dataframe(model_group, use_container_width=True)

    st.markdown("---")

    # ── Full history table ────────────────────
    st.markdown("### 🗂️ Full History")
    display_cols = [
        "timestamp", "model_id", "input_words", "output_words",
        "inference_time_s", "tokens_per_second", "ram_delta_mb",
    ]
    available_cols = [c for c in display_cols if c in history_df.columns]
    st.dataframe(history_df[available_cols], use_container_width=True, height=300)

    # Export + clear
    e1, e2 = st.columns(2)
    with e1:
        st.download_button(
            "⬇️ Export History CSV",
            data=history_df.to_csv(index=False),
            file_name="performance_history.csv",
            mime="text/csv",
            key="perf_export",
        )
    with e2:
        if st.button("🗑️ Clear History", key="perf_clear"):
            svc.clear_history()
            st.success("✅ Performance history cleared.")
            st.rerun()
