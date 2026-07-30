"""
utils/helpers.py
----------------
General-purpose helper functions used across the application.

Covers:
  - Text processing (truncation, word count, reading time)
  - Timing / formatting utilities
  - Colour / badge helpers for ROUGE scores
  - Safe JSON I/O
  - Compression ratio computation
"""

from __future__ import annotations

import json
import time
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from utils.logger import get_logger
from utils.constants import ROUGE_THRESHOLDS

logger = get_logger(__name__)


# ──────────────────────────────────────────────
# TEXT HELPERS
# ──────────────────────────────────────────────

def count_words(text: str) -> int:
    """Return the number of words in *text*."""
    return len(text.split())


def count_sentences(text: str) -> int:
    """Return an approximate sentence count."""
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    return len([s for s in sentences if s])


def estimate_reading_time_seconds(text: str, wpm: int = 200) -> float:
    """Estimate reading time in seconds at *wpm* words per minute."""
    return (count_words(text) / max(wpm, 1)) * 60


def truncate_text(text: str, max_chars: int = 500, suffix: str = "…") -> str:
    """Truncate *text* to *max_chars* characters, appending *suffix*."""
    if len(text) <= max_chars:
        return text
    return text[: max_chars - len(suffix)].rstrip() + suffix


def clean_text(text: str) -> str:
    """
    Normalise whitespace in *text*:
      - Collapse multiple spaces/tabs into one
      - Normalise newlines
      - Strip leading/trailing whitespace
    """
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def compute_compression_ratio(original: str, summary: str) -> float:
    """
    Return word-level compression ratio: summary_words / original_words.
    A value of 0.2 means the summary is 20% the length of the original.
    """
    orig_words = max(count_words(original), 1)
    summ_words = count_words(summary)
    return round(summ_words / orig_words, 4)


def compute_reduction_percent(original: str, summary: str) -> float:
    """Return how much shorter the summary is as a percentage."""
    ratio = compute_compression_ratio(original, summary)
    return round((1.0 - ratio) * 100, 1)


# ──────────────────────────────────────────────
# TIME / FORMATTING
# ──────────────────────────────────────────────

def format_duration(seconds: float) -> str:
    """Human-readable duration string, e.g. '2.34 s' or '1 min 5 s'."""
    if seconds < 60:
        return f"{seconds:.2f} s"
    minutes = int(seconds // 60)
    secs = seconds % 60
    return f"{minutes} min {secs:.1f} s"


def format_bytes(size_bytes: int) -> str:
    """Human-readable file size, e.g. '4.5 MB'."""
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} PB"


def current_timestamp(fmt: str = "%Y-%m-%d %H:%M:%S") -> str:
    """Return the current local time as a formatted string."""
    return datetime.now().strftime(fmt)


def iso_timestamp() -> str:
    """Return current UTC time in ISO 8601 format."""
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')


class Timer:
    """Context manager for elapsed-time measurement."""

    def __init__(self) -> None:
        self._start: float = 0.0
        self.elapsed: float = 0.0

    def __enter__(self) -> "Timer":
        self._start = time.perf_counter()
        return self

    def __exit__(self, *_: Any) -> None:
        self.elapsed = time.perf_counter() - self._start

    @property
    def formatted(self) -> str:
        return format_duration(self.elapsed)


# ──────────────────────────────────────────────
# ROUGE COLOUR BADGES
# ──────────────────────────────────────────────

def rouge_badge_color(metric: str, score: float) -> str:
    """
    Return a CSS-compatible hex colour for a ROUGE score badge:
      - Green  → good
      - Yellow → fair
      - Red    → poor
    """
    thresholds = ROUGE_THRESHOLDS.get(metric, {"good": 0.35, "fair": 0.20})
    if score >= thresholds["good"]:
        return "#48BB78"   # green
    if score >= thresholds["fair"]:
        return "#ECC94B"   # yellow
    return "#FC8181"       # red


def rouge_label(metric: str, score: float) -> str:
    """Return a human-readable quality label for a ROUGE score."""
    thresholds = ROUGE_THRESHOLDS.get(metric, {"good": 0.35, "fair": 0.20})
    if score >= thresholds["good"]:
        return "Good"
    if score >= thresholds["fair"]:
        return "Fair"
    return "Poor"


# ──────────────────────────────────────────────
# SAFE JSON I/O
# ──────────────────────────────────────────────

def load_json(path: Union[str, Path], default: Any = None) -> Any:
    """
    Load a JSON file.  Returns *default* (None) on any error
    instead of raising, so callers don't crash on missing history.
    """
    path = Path(path)
    if not path.exists():
        return default
    try:
        with path.open("r", encoding="utf-8") as fh:
            return json.load(fh)
    except (json.JSONDecodeError, OSError) as exc:
        logger.warning("Failed to load JSON from %s: %s", path, exc)
        return default


def save_json(data: Any, path: Union[str, Path], indent: int = 2) -> bool:
    """
    Save *data* to a JSON file, creating parent directories if needed.
    Returns True on success, False on error.
    """
    path = Path(path)
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("w", encoding="utf-8") as fh:
            json.dump(data, fh, indent=indent, ensure_ascii=False, default=str)
        return True
    except (OSError, TypeError) as exc:
        logger.error("Failed to save JSON to %s: %s", path, exc)
        return False


# ──────────────────────────────────────────────
# MISC
# ──────────────────────────────────────────────

def flatten_list(nested: List[List[Any]]) -> List[Any]:
    """Flatten one level of nesting."""
    return [item for sublist in nested for item in sublist]


def safe_divide(numerator: float, denominator: float, default: float = 0.0) -> float:
    """Division that returns *default* when denominator is 0."""
    if denominator == 0:
        return default
    return numerator / denominator


def percentage(value: float, total: float) -> float:
    """Return value/total as a percentage, safe against zero division."""
    return round(safe_divide(value, total) * 100, 2)


def clamp(value: float, lo: float, hi: float) -> float:
    """Clamp *value* to [lo, hi]."""
    return max(lo, min(hi, value))
