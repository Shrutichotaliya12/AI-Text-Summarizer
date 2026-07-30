"""
pages/home.py
-------------
Home / Dashboard page.
Standard Streamlit UI.
"""

from __future__ import annotations

import streamlit as st
import pandas as pd

from config import APP_NAME, APP_DESCRIPTION
from services.performance_service import PerformanceService

def render() -> None:
    """Render the Home page."""
    st.title(f"🏠 {APP_NAME}")
    st.markdown(APP_DESCRIPTION)
    
    st.markdown("---")

    st.header("Workflow")
    st.markdown("""
    1. **Upload or Paste** text on the *Summarizer* page.
    2. **Select a Model** (e.g. T5 or DistilBART).
    3. **Generate** the summary.
    4. **Evaluate** results against a reference using *ROUGE Evaluation*.
    5. **Analyze** your performance history on the *Performance* page.
    """)

    st.header("Supported Models")
    col1, col2 = st.columns(2)
    with col1:
        st.subheader("T5 Small / Base")
        st.write("Google's Text-to-Text Transfer Transformer. Good for rapid abstractive summarization.")
    with col2:
        st.subheader("DistilBART")
        st.write("Distilled version of Facebook's BART, fine-tuned on CNN/DailyMail for high quality news summarization.")

    st.header("Technology Stack")
    st.markdown("""
    - **UI**: Streamlit
    - **Models**: HuggingFace Transformers, PyTorch
    - **Data**: Datasets (CNN/DailyMail, XSum)
    - **Metrics**: ROUGE
    """)

    st.markdown("---")
    st.header("Recent Activity")
    
    svc = PerformanceService()
    history = svc.get_history()
    
    if not history:
        st.info("No recent summarizations found. Head over to the Summarizer page to get started.")
    else:
        # Show top 5 recent
        recent = list(reversed(history))[:5]
        for item in recent:
            with st.expander(f"{item.timestamp} - {item.model_id} ({item.inference_time_s:.2f}s)"):
                st.write("**Original Text (truncated):**")
                st.write(item.input_text[:300] + "...")
                st.write("**Summary:**")
                st.write(item.summary)
