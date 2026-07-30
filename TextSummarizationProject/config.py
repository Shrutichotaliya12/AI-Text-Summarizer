"""
config.py
---------
Central configuration for the Text Summarization application.
Uses pathlib for all path management and pydantic-style dataclasses
for type-safe settings with environment variable support.
"""

from __future__ import annotations

import os
from pathlib import Path
from dataclasses import dataclass, field
from typing import Dict, List, Tuple


# ──────────────────────────────────────────────
# ROOT PATHS
# ──────────────────────────────────────────────
BASE_DIR: Path = Path(__file__).resolve().parent

DATA_DIR: Path      = BASE_DIR / "data"
DATASET_DIR: Path   = DATA_DIR / "dataset"
CACHE_DIR: Path     = DATA_DIR / "cache"
DOWNLOAD_DIR: Path  = DATA_DIR / "downloads"
OUTPUT_DIR: Path    = DATA_DIR / "output"
HISTORY_DIR: Path   = DATA_DIR / "history"
LOGS_DIR: Path      = BASE_DIR / "logs"
ASSETS_DIR: Path    = BASE_DIR / "assets"
SCREENSHOTS_DIR: Path = BASE_DIR / "screenshots"
DOCS_DIR: Path      = BASE_DIR / "docs"

# Ensure all directories exist at import time
for _dir in [
    DATASET_DIR, CACHE_DIR, DOWNLOAD_DIR,
    OUTPUT_DIR, HISTORY_DIR, LOGS_DIR,
    SCREENSHOTS_DIR, DOCS_DIR,
]:
    _dir.mkdir(parents=True, exist_ok=True)


# ──────────────────────────────────────────────
# APPLICATION META
# ──────────────────────────────────────────────
APP_NAME: str    = "Text Summarization using Transformers"
APP_VERSION: str = "1.0.0"
APP_AUTHOR: str  = "AI Engineer"
APP_DESCRIPTION: str = (
    "A production-ready Streamlit application for abstractive and "
    "extractive text summarization using state-of-the-art transformer "
    "models (T5, BART) with ROUGE evaluation, dataset analytics, "
    "performance monitoring, and history tracking."
)


# (Theme settings removed to revert to Streamlit default UI)


# ──────────────────────────────────────────────
# BRANDING & SAAS SETTINGS
# ──────────────────────────────────────────────
STUDENT_NAME: str = "Jane Doe"
UNIVERSITY: str   = "Tech University"
GITHUB_LINK: str  = "https://github.com/janedoe/text-summarizer"



# ──────────────────────────────────────────────
# MODEL CONFIGURATION
# ──────────────────────────────────────────────
@dataclass(frozen=True)
class ModelConfig:
    name: str
    display_name: str
    description: str
    max_input_tokens: int
    min_summary_length: int
    max_summary_length: int
    task_prefix: str
    supports_length_penalty: bool = True

T5_SMALL_CONFIG = ModelConfig(
    name="t5-small",
    display_name="T5-Small (Fast)",
    description="Lightweight T5 model. Fast inference, good for quick summaries.",
    max_input_tokens=512,
    min_summary_length=30,
    max_summary_length=150,
    task_prefix="summarize: ",
)

T5_BASE_CONFIG = ModelConfig(
    name="t5-base",
    display_name="T5-Base (Balanced)",
    description="Standard T5 model. Balanced speed and quality.",
    max_input_tokens=512,
    min_summary_length=40,
    max_summary_length=200,
    task_prefix="summarize: ",
)

BART_LARGE_CNN_CONFIG = ModelConfig(
    name="facebook/bart-large-cnn",
    display_name="BART-Large-CNN (High Quality)",
    description="BART fine-tuned on CNN/DailyMail. Best for news article summarization.",
    max_input_tokens=1024,
    min_summary_length=56,
    max_summary_length=300,
    task_prefix="",
)

DISTILBART_CONFIG = ModelConfig(
    name="sshleifer/distilbart-cnn-12-6",
    display_name="DistilBART-CNN (Fast & Accurate)",
    description="Distilled BART. 2× faster with minimal quality loss.",
    max_input_tokens=1024,
    min_summary_length=40,
    max_summary_length=200,
    task_prefix="",
)

AVAILABLE_MODELS: Dict[str, ModelConfig] = {
    "t5-small":                         T5_SMALL_CONFIG,
    "t5-base":                          T5_BASE_CONFIG,
    "facebook/bart-large-cnn":          BART_LARGE_CNN_CONFIG,
    "sshleifer/distilbart-cnn-12-6":    DISTILBART_CONFIG,
}

DEFAULT_MODEL: str = "facebook/bart-large-cnn"


# ──────────────────────────────────────────────
# SUMMARIZATION DEFAULTS
# ──────────────────────────────────────────────
@dataclass
class SummarizationDefaults:
    min_length: int        = 56
    max_length: int        = 200
    num_beams: int         = 4
    length_penalty: float  = 2.0
    early_stopping: bool   = True
    no_repeat_ngram_size: int = 3
    do_sample: bool        = False
    temperature: float     = 1.0
    top_k: int             = 50
    top_p: float           = 0.95

SUMMARIZATION_DEFAULTS = SummarizationDefaults()


# ──────────────────────────────────────────────
# DATASET CONFIGURATION
# ──────────────────────────────────────────────
@dataclass(frozen=True)
class DatasetConfig:
    cnn_dailymail_name: str  = "cnn_dailymail"
    cnn_dailymail_version: str = "3.0.0"
    xsum_name: str           = "xsum"
    default_sample_size: int = 100
    max_sample_size: int     = 1000
    supported_formats: Tuple[str, ...] = (".txt", ".csv", ".json", ".jsonl", ".pdf")
    max_file_size_mb: int    = 50

DATASET_CONFIG = DatasetConfig()


# ──────────────────────────────────────────────
# ROUGE EVALUATION
# ──────────────────────────────────────────────
@dataclass(frozen=True)
class RougeConfig:
    metrics: Tuple[str, ...] = ("rouge1", "rouge2", "rougeL", "rougeLsum")
    use_stemmer: bool        = True
    use_aggregator: bool     = True

ROUGE_CONFIG = RougeConfig()


# ──────────────────────────────────────────────
# PERFORMANCE MONITORING
# ──────────────────────────────────────────────
@dataclass(frozen=True)
class PerformanceConfig:
    metrics_history_limit: int = 500
    log_interval_seconds: int  = 5
    benchmark_sample_texts: Tuple[str, ...] = (
        "short",   # < 100 tokens
        "medium",  # 100-300 tokens
        "long",    # > 300 tokens
    )

PERFORMANCE_CONFIG = PerformanceConfig()


# ──────────────────────────────────────────────
# LOGGING
# ──────────────────────────────────────────────
LOG_FILE: Path      = LOGS_DIR / "app.log"
LOG_LEVEL: str      = os.getenv("LOG_LEVEL", "INFO")
LOG_MAX_BYTES: int  = 10 * 1024 * 1024   # 10 MB
LOG_BACKUP_COUNT: int = 5


# ──────────────────────────────────────────────
# FILE PATHS
# ──────────────────────────────────────────────
HISTORY_FILE: Path  = HISTORY_DIR / "summarization_history.json"
CACHE_INDEX_FILE: Path = CACHE_DIR / "model_cache_index.json"


# ──────────────────────────────────────────────
# PAGE NAVIGATION
# ──────────────────────────────────────────────
PAGES: List[Dict[str, str]] = [
    {"id": "home",             "label": "🏠 Home",              "icon": "🏠"},
    {"id": "summarizer",       "label": "✍️ Summarizer",        "icon": "✍️"},
    {"id": "dataset_analysis", "label": "📊 Dataset Analysis",  "icon": "📊"},
    {"id": "rouge_evaluation", "label": "📈 ROUGE Evaluation",  "icon": "📈"},
    {"id": "performance",      "label": "⚡ Performance",        "icon": "⚡"},
    {"id": "settings",         "label": "⚙️ Settings",           "icon": "⚙️"},
    {"id": "about",            "label": "ℹ️ About",              "icon": "ℹ️"},
]

DEFAULT_PAGE: str = "home"


# ──────────────────────────────────────────────
# STREAMLIT PAGE CONFIG
# ──────────────────────────────────────────────
STREAMLIT_CONFIG: Dict = {
    "page_title": APP_NAME,
    "page_icon": "📝",
    "layout": "wide",
    "initial_sidebar_state": "expanded",
    "menu_items": {
        "Get Help": "https://huggingface.co/docs",
        "Report a bug": None,
        "About": f"**{APP_NAME}** v{APP_VERSION}",
    },
}
