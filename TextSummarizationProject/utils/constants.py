"""
utils/constants.py
------------------
Immutable application-wide constants that do not belong in config.py
(i.e., they are never driven by environment variables or user settings).
"""

from __future__ import annotations

from typing import Final, Tuple, Dict


# ──────────────────────────────────────────────
# SUMMARIZATION CONSTRAINTS
# ──────────────────────────────────────────────
MIN_INPUT_CHARS: Final[int] = 100
MAX_INPUT_CHARS: Final[int] = 50_000
MIN_SUMMARY_TOKENS: Final[int] = 10
MAX_SUMMARY_TOKENS: Final[int] = 512

# Beam search limits
MIN_BEAMS: Final[int] = 1
MAX_BEAMS: Final[int] = 8

# Length penalty
MIN_LENGTH_PENALTY: Final[float] = 0.5
MAX_LENGTH_PENALTY: Final[float] = 5.0


# ──────────────────────────────────────────────
# FILE SIZE LIMITS
# ──────────────────────────────────────────────
MAX_UPLOAD_BYTES: Final[int] = 50 * 1024 * 1024   # 50 MB
MAX_HISTORY_RECORDS: Final[int] = 1_000


# ──────────────────────────────────────────────
# SUPPORTED INPUT FORMATS
# ──────────────────────────────────────────────
SUPPORTED_TEXT_EXTENSIONS: Final[Tuple[str, ...]] = (
    ".txt", ".md", ".rst",
)
SUPPORTED_STRUCTURED_EXTENSIONS: Final[Tuple[str, ...]] = (
    ".csv", ".json", ".jsonl",
)
SUPPORTED_DOCUMENT_EXTENSIONS: Final[Tuple[str, ...]] = (
    ".pdf",
)
ALL_SUPPORTED_EXTENSIONS: Final[Tuple[str, ...]] = (
    *SUPPORTED_TEXT_EXTENSIONS,
    *SUPPORTED_STRUCTURED_EXTENSIONS,
    *SUPPORTED_DOCUMENT_EXTENSIONS,
)


# ──────────────────────────────────────────────
# ROUGE THRESHOLDS (for visual badges)
# ──────────────────────────────────────────────
ROUGE_THRESHOLDS: Final[Dict[str, Dict[str, float]]] = {
    "rouge1": {"good": 0.40, "fair": 0.25},
    "rouge2": {"good": 0.18, "fair": 0.10},
    "rougeL": {"good": 0.35, "fair": 0.20},
}


# ──────────────────────────────────────────────
# UI STRINGS
# ──────────────────────────────────────────────
APP_TAGLINE: Final[str] = "State-of-the-art abstractive summarization powered by Transformers"
FOOTER_TEXT: Final[str] = "Built with ❤️ using Streamlit & HuggingFace Transformers"

LOADING_MESSAGES: Final[Tuple[str, ...]] = (
    "Loading model weights…",
    "Tokenizing input…",
    "Running beam search…",
    "Decoding summary…",
    "Finalizing output…",
)

ERROR_MESSAGES: Final[Dict[str, str]] = {
    "text_too_short":  f"Input text must be at least {MIN_INPUT_CHARS} characters.",
    "text_too_long":   f"Input text exceeds {MAX_INPUT_CHARS:,} characters.",
    "model_load_fail": "Failed to load the selected model. Check your internet connection.",
    "file_too_large":  f"File size exceeds {MAX_UPLOAD_BYTES // (1024*1024)} MB limit.",
    "unsupported_fmt": "Unsupported file format. Allowed: " + ", ".join(ALL_SUPPORTED_EXTENSIONS),
    "empty_file":      "The uploaded file appears to be empty.",
    "dataset_fail":    "Failed to load dataset from HuggingFace Hub.",
}

SUCCESS_MESSAGES: Final[Dict[str, str]] = {
    "summary_done":  "✅ Summary generated successfully!",
    "history_saved": "✅ Result saved to history.",
    "export_done":   "✅ Results exported.",
    "model_loaded":  "✅ Model loaded and cached.",
}


# ──────────────────────────────────────────────
# SAMPLE TEXTS FOR DEMO / BENCHMARK
# ──────────────────────────────────────────────
SAMPLE_TEXT_SHORT: Final[str] = (
    "Artificial intelligence (AI) is intelligence demonstrated by machines, "
    "as opposed to the natural intelligence displayed by animals including humans. "
    "AI research has been defined as the field of study of intelligent agents, "
    "which refers to any system that perceives its environment and takes actions "
    "that maximize its chance of achieving its goals."
)

SAMPLE_TEXT_MEDIUM: Final[str] = (
    "The history of artificial intelligence began in antiquity, with myths, stories and rumors "
    "of artificial beings endowed with intelligence or consciousness by master craftsmen. "
    "The seeds of modern AI were planted by classical philosophers who attempted to describe "
    "the process of human thinking as the mechanical manipulation of symbols. "
    "This work culminated in the invention of the programmable digital computer in the 1940s, "
    "a machine based on the abstract essence of mathematical reasoning. "
    "This device and the ideas behind it inspired a handful of scientists to begin seriously "
    "discussing the possibility of building an electronic brain. The field of AI research was "
    "founded at a workshop held on the campus of Dartmouth College, USA during the summer of 1956. "
    "Those who attended would become the leaders of AI research for decades. "
    "Many of them predicted that a machine as intelligent as a human being would exist in no more "
    "than a generation, and they were given millions of dollars to make this vision come true. "
    "Eventually it became obvious that commercial developers and researchers had grossly "
    "underestimated the difficulty of the project. In 1974, in response to the criticism of "
    "Sir James Lighthill and ongoing pressure from the US Congress to fund more productive projects, "
    "both the U.S. and British governments cut off exploratory research in AI."
)

SAMPLE_TEXT_LONG: Final[str] = (
    "Machine learning (ML) is a type of artificial intelligence (AI) that allows software applications "
    "to become more accurate at predicting outcomes without being explicitly programmed to do so. "
    "Machine learning algorithms use historical data as input to predict new output values. "
    "Recommendation engines are a common use case for machine learning. Other popular uses include "
    "fraud detection, spam filtering, malware threat detection, business process automation (BPA) "
    "and predictive maintenance.\n\n"
    "Machine learning is important because it gives enterprises a view of trends in customer behavior "
    "and business operational patterns, as well as supports the development of new products. "
    "Many of today's leading companies, such as Facebook, Google and Uber, make machine learning "
    "a central part of their operations. Machine learning has become a significant competitive "
    "differentiator for many businesses.\n\n"
    "Machine learning algorithms are typically created using frameworks that accelerate solution "
    "development, such as TensorFlow and PyTorch. IBM Watson, which may be the most well-known "
    "ML environment, is a question-answering computer system capable of answering questions posed "
    "in natural language, developed in IBM's DeepQA research project by a research team led by "
    "principal investigator David Ferrucci. Watson was named after IBM's founder and first CEO, "
    "industrialist Thomas J. Watson.\n\n"
    "Deep learning is a subset of machine learning, which is essentially a neural network with "
    "three or more layers. These neural networks attempt to simulate the behavior of the human "
    "brain—albeit far from matching its ability—allowing it to 'learn' from large amounts of data. "
    "While a neural network with a single layer can still make approximate predictions, "
    "additional hidden layers can help to optimize and refine for accuracy. Deep learning drives "
    "many artificial intelligence (AI) applications and services that improve automation, "
    "performing analytical and physical tasks without human intervention. Deep learning technology "
    "lies behind everyday products and services (such as digital assistants, voice-enabled TV "
    "remotes, and credit card fraud detection) as well as emerging technologies (such as "
    "self-driving cars)."
)
