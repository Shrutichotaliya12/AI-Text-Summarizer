"""
pages/summarizer.py
-------------------
Main summarization page.
Standard Streamlit UI.
"""

from __future__ import annotations

import streamlit as st

from config import AVAILABLE_MODELS, SUMMARIZATION_DEFAULTS
from services.summarization_service import SummarizationService
from services.rouge_service import RougeService
from utils.constants import (
    SAMPLE_TEXT_SHORT,
    SAMPLE_TEXT_MEDIUM,
    SAMPLE_TEXT_LONG,
    SUCCESS_MESSAGES,
)
from utils.helpers import (
    count_words,
    estimate_reading_time_seconds,
    format_duration,
)
from utils.validators import validate_input_text
from utils.file_manager import (
    extract_text_from_upload,
    build_export_txt,
    build_export_json,
)
from utils.logger import get_logger

logger = get_logger(__name__)

_summarization_service = SummarizationService()
_rouge_service = RougeService()


# ──────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────

_SAMPLE_OPTIONS = {
    "Short (AI overview)":  SAMPLE_TEXT_SHORT,
    "Medium (AI history)":  SAMPLE_TEXT_MEDIUM,
    "Long (ML deep-dive)":  SAMPLE_TEXT_LONG,
    "Custom — type below":  "",
}

def _render_result(result) -> None:
    """Display the summarization result panel."""
    st.success(SUCCESS_MESSAGES["summary_done"])

    # Summary text
    st.info(result.summary)

    # Metrics row
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Inference Time", format_duration(result.inference_time_s))
    c2.metric("Input Words", f"{result.input_word_count:,}")
    c3.metric("Output Words", f"{result.output_word_count:,}")
    c4.metric("Reduction", f"{result.reduction_percent:.1f}%")

    # Export buttons
    st.markdown("### Export")
    ec1, ec2 = st.columns(2)
    with ec1:
        st.download_button(
            label="Download as TXT",
            data=build_export_txt(result.to_dict()),
            file_name="summary.txt",
            mime="text/plain",
            key="dl_txt",
            use_container_width=True
        )
    with ec2:
        st.download_button(
            label="Download as JSON",
            data=build_export_json(result.to_dict()),
            file_name="summary.json",
            mime="application/json",
            key="dl_json",
            use_container_width=True
        )


# ──────────────────────────────────────────────
# PAGE RENDER
# ──────────────────────────────────────────────

def render() -> None:
    """Render the Summarizer page."""
    logger.debug("Rendering Summarizer page.")
    
    st.title("✍️ Text Summarizer")
    st.write("Generate abstractive summaries using state-of-the-art transformer models.")

    st.markdown("### Model Configuration")
    with st.expander("Adjust Generation Parameters", expanded=False):
        c_mod, c_params = st.columns([1, 2])
        
        with c_mod:
            model_options = {cfg.display_name: mid for mid, cfg in AVAILABLE_MODELS.items()}
            selected_display = st.selectbox(
                "Model",
                options=list(model_options.keys()),
                index=list(model_options.values()).index(
                    st.session_state.get("selected_model", "facebook/bart-large-cnn")
                ),
                key="model_display_select",
            )
            model_id = model_options[selected_display]
            st.session_state["selected_model"] = model_id
            model_cfg = AVAILABLE_MODELS[model_id]
            st.caption(model_cfg.description)
            
        with c_params:
            p1, p2 = st.columns(2)
            with p1:
                min_len = st.slider("Min Length", 10, 100, SUMMARIZATION_DEFAULTS.min_length, 5, key="param_min_len")
                max_len = st.slider("Max Length", 50, 512, SUMMARIZATION_DEFAULTS.max_length, 10, key="param_max_len")
            with p2:
                num_beams = st.slider("Beam Width", 1, 8, SUMMARIZATION_DEFAULTS.num_beams, key="param_beams")
                length_penalty = st.slider("Length Penalty", 0.5, 5.0, SUMMARIZATION_DEFAULTS.length_penalty, 0.25, key="param_len_penalty")
                no_repeat_ngram = st.slider("No-Repeat N-Gram", 0, 5, SUMMARIZATION_DEFAULTS.no_repeat_ngram_size, key="param_ngram")

    st.markdown("---")

    # ── Input area ────────────────────────────
    st.markdown("### Input Text")

    # Tab: manual entry vs upload
    tab_type, tab_upload = st.tabs(["✏️ Type / Paste", "📂 Upload File"])

    with tab_type:
        sample_choice = st.selectbox(
            "Load sample text:",
            options=list(_SAMPLE_OPTIONS.keys()),
            index=1,
            key="sample_choice",
        )
        prefill = st.session_state.pop("prefill_text", None)
        default_text = prefill if prefill else _SAMPLE_OPTIONS[sample_choice]

        input_text = st.text_area(
            "Enter text to summarize:",
            value=default_text,
            height=280,
            max_chars=50_000,
            key="main_input_text",
            placeholder="Paste your article, document, or any text here…",
            label_visibility="collapsed"
        )

    with tab_upload:
        uploaded = st.file_uploader(
            "Upload a file (TXT, PDF, DOCX, CSV, JSON, JSONL):",
            type=["txt", "pdf", "docx", "csv", "json", "jsonl", "md"],
            key="file_uploader",
        )
        if uploaded is not None:
            try:
                extracted = extract_text_from_upload(uploaded.name, uploaded.read())
                if extracted:
                    input_text = extracted
                    st.success(f"Extracted {count_words(extracted):,} words from {uploaded.name}")
                    st.text_area(
                        "Extracted text preview:",
                        value=extracted[:1000] + ("…" if len(extracted) > 1000 else ""),
                        height=150,
                        disabled=True,
                        key="upload_preview",
                    )
            except Exception as exc:
                st.error(f"Could not read file: {exc}")
                input_text = st.session_state.get("main_input_text", "")

    # Live word count
    word_count = count_words(input_text) if input_text else 0
    read_time  = estimate_reading_time_seconds(input_text) if input_text else 0
    st.caption(f"{word_count:,} words · {len(input_text):,} chars · ~{read_time/60:.1f} min read")

    # ── Optional reference summary ────────────
    st.markdown("<br>", unsafe_allow_html=True)
    with st.expander("Add reference summary for quick ROUGE evaluation (optional)"):
        reference_text = st.text_area(
            "Reference summary:",
            height=120,
            key="reference_summary",
            placeholder="Paste the gold/reference summary here to compute ROUGE after generation…",
            label_visibility="collapsed"
        )

    # ── Generate button ───────────────────────
    st.markdown("<br>", unsafe_allow_html=True)
    generate_btn = st.button(
        "Generate Summary",
        type="primary",
        use_container_width=True,
        key="generate_btn",
    )

    if generate_btn:
        ok, err = validate_input_text(input_text)
        if not ok:
            st.error(f"❌ {err}")
            return

        if min_len >= max_len:
            st.error("❌ Min summary length must be less than max length.")
            return

        with st.spinner("Generating summary… (first run loads the model)"):
            result = _summarization_service.summarize(
                text=input_text,
                model_id=model_id,
                min_length=min_len,
                max_length=max_len,
                num_beams=num_beams,
                length_penalty=length_penalty,
                no_repeat_ngram_size=no_repeat_ngram,
                save_to_history=True,
            )

        st.markdown("---")
        st.markdown("### Generated Summary")

        if not result.success:
            st.error(f"❌ Summarization failed: {result.error}")
            return

        _render_result(result)
        st.session_state["last_result"] = result

        # Quick ROUGE
        if reference_text.strip():
            st.markdown("### Quick ROUGE Evaluation")
            scores, err = _rouge_service.evaluate(result.summary, reference_text)
            if scores:
                report = _rouge_service.build_report(scores)
                cols = st.columns(len(report))
                for col, r in zip(cols, report):
                    with col:
                        st.metric(r["metric"] + " F1", f"{r['fmeasure']:.4f}", delta=r["label"])
            elif err:
                st.warning(f"⚠️ ROUGE evaluation failed: {err}")
