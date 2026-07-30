"""
pages/rouge_evaluation.py
--------------------------
ROUGE Evaluation page.
Standard Streamlit UI.
"""

from __future__ import annotations

import pandas as pd
import streamlit as st
import plotly.express as px

from config import AVAILABLE_MODELS, SUMMARIZATION_DEFAULTS
from services.rouge_service import RougeService
from services.summarization_service import SummarizationService
from services.dataset_service import load_cnn_dailymail, load_xsum
from utils.logger import get_logger
from utils.helpers import format_duration

logger = get_logger(__name__)

_rouge_service = RougeService()
_summ_service  = SummarizationService()


# ──────────────────────────────────────────────
# PAGE RENDER
# ──────────────────────────────────────────────

def render() -> None:
    """Render the ROUGE Evaluation page."""
    logger.debug("Rendering ROUGE Evaluation page.")
    
    st.title("📈 ROUGE Evaluation")
    st.write("Evaluate the quality of generated summaries using ROUGE-1, ROUGE-2, ROUGE-L, and ROUGE-Lsum metrics.")

    mode = st.radio(
        "Evaluation Mode:",
        options=["🔍 Single Pair", "🗂️ Batch Evaluation"],
        horizontal=True,
        key="rouge_mode",
    )

    st.markdown("---")

    # ══════════════════════════════════════════
    # MODE 1: SINGLE PAIR
    # ══════════════════════════════════════════
    if mode == "🔍 Single Pair":
        st.subheader("🔍 Single Prediction vs. Reference")

        col_pred, col_ref = st.columns(2)
        with col_pred:
            prediction = st.text_area(
                "Generated Summary (Prediction):",
                height=200,
                key="rouge_prediction",
                placeholder="Paste the machine-generated summary here…",
            )
        with col_ref:
            reference = st.text_area(
                "Reference Summary (Gold):",
                height=200,
                key="rouge_reference",
                placeholder="Paste the human-written reference summary here…",
            )

        if st.button("📊 Compute ROUGE Scores", type="primary", key="rouge_single_btn"):
            if not prediction.strip():
                st.error("❌ Please enter a prediction summary.")
                return
            if not reference.strip():
                st.error("❌ Please enter a reference summary.")
                return

            with st.spinner("Computing ROUGE scores…"):
                scores, err = _rouge_service.evaluate(prediction, reference)

            if err:
                st.error(f"❌ {err}")
                return

            report = _rouge_service.build_report(scores)

            st.markdown("### 📊 ROUGE Scores")
            badge_cols = st.columns(len(report))
            for col, r in zip(badge_cols, report):
                col.metric(r["metric"] + " F1", f"{r['fmeasure']:.4f}", delta=r["label"])

            # Detailed table
            detail = scores.summary_dict()
            rows = []
            for metric in ("rouge1", "rouge2", "rougeL"):
                d = detail[metric]
                rows.append(
                    {
                        "Metric":    metric.upper(),
                        "F1 Score":  f"{d['fmeasure']:.4f}",
                        "Precision": f"{d['precision']:.4f}",
                        "Recall":    f"{d['recall']:.4f}",
                    }
                )
            st.dataframe(pd.DataFrame(rows), use_container_width=True)

    # ══════════════════════════════════════════
    # MODE 2: BATCH EVALUATION
    # ══════════════════════════════════════════
    else:
        st.subheader("🗂️ Batch Evaluation")

        c1, c2, c3 = st.columns(3)
        with c1:
            dataset_name = st.selectbox("Dataset", options=["CNN / DailyMail", "XSum"], key="batch_dataset")
        with c2:
            batch_size = st.slider("Number of Examples", min_value=5, max_value=100, value=20, step=5, key="batch_size")
        with c3:
            model_options = {cfg.display_name: mid for mid, cfg in AVAILABLE_MODELS.items()}
            selected_display = st.selectbox("Model", options=list(model_options.keys()), key="batch_model_display")
            batch_model_id = model_options[selected_display]

        run_btn = st.button("🚀 Run Batch Evaluation", type="primary", use_container_width=True, key="batch_run_btn")

        if run_btn:
            # Load samples
            with st.spinner(f"Loading {dataset_name}…"):
                if "CNN" in dataset_name:
                    samples = load_cnn_dailymail(split="test", n=batch_size)
                else:
                    samples = load_xsum(split="test", n=batch_size)

            if not samples:
                st.error("❌ Failed to load dataset samples.")
                return

            articles   = [s["article"]    for s in samples]
            references = [s["highlights"] for s in samples]

            # Run summarization
            progress_bar = st.progress(0, text="Running inference…")
            predictions: list[str] = []

            import time
            t0 = time.perf_counter()

            for i, (article, _) in enumerate(zip(articles, references)):
                result = _summ_service.summarize(
                    text=article,
                    model_id=batch_model_id,
                    min_length=SUMMARIZATION_DEFAULTS.min_length,
                    max_length=SUMMARIZATION_DEFAULTS.max_length,
                    save_to_history=False,
                )
                predictions.append(result.summary if result.success else "")
                pct = int((i + 1) / len(articles) * 100)
                progress_bar.progress(pct, text=f"Summarizing {i+1}/{len(articles)}…")

            total_time = time.perf_counter() - t0
            progress_bar.empty()

            # Compute ROUGE
            with st.spinner("Computing ROUGE scores…"):
                agg, err = _rouge_service.evaluate_batch(predictions, references)

            if err:
                st.error(f"❌ Batch ROUGE failed: {err}")
                return

            st.success(
                f"✅ Evaluated {agg.sample_count} samples in {format_duration(total_time)} "
                f"({format_duration(total_time/agg.sample_count)}/sample)"
            )

            # Aggregated scores
            st.markdown("### 📊 Aggregated ROUGE Scores")
            agg_dict = agg.to_dict()
            metrics   = ["rouge1", "rouge2", "rougeL", "rougeLsum"]
            agg_cols  = st.columns(4)
            for col, metric in zip(agg_cols, metrics):
                val = agg_dict[metric]
                from utils.helpers import rouge_label
                lbl = rouge_label(metric, val)
                col.metric(metric.upper(), f"{val:.4f}", delta=lbl)

            # Per-sample chart
            st.markdown("### 📉 Per-Sample ROUGE-1 F1")
            per_f1 = [s.rouge1_f for s in agg.per_sample]
            chart_df = pd.DataFrame({"sample": range(1, len(per_f1)+1), "ROUGE-1 F1": per_f1})
            
            fig_rouge = px.line(chart_df, x="sample", y="ROUGE-1 F1", markers=True)
            st.plotly_chart(fig_rouge, use_container_width=True)

            # Download
            export_df = pd.DataFrame(
                [
                    {
                        "sample_index": i + 1,
                        "reference":    references[i],
                        "prediction":   predictions[i],
                        "rouge1_f":     agg.per_sample[i].rouge1_f if i < len(agg.per_sample) else 0,
                        "rouge2_f":     agg.per_sample[i].rouge2_f if i < len(agg.per_sample) else 0,
                        "rougeL_f":     agg.per_sample[i].rougeL_f if i < len(agg.per_sample) else 0,
                    }
                    for i in range(min(len(predictions), len(agg.per_sample)))
                ]
            )
            st.download_button(
                "⬇️ Download Batch Results CSV",
                data=export_df.to_csv(index=False),
                file_name="batch_rouge_results.csv",
                mime="text/csv",
                key="batch_csv_dl",
            )
