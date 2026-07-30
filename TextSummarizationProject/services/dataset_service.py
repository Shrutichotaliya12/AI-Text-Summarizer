"""
services/dataset_service.py
----------------------------
Handles loading, sampling, and basic analysis of NLP datasets.

Supports:
  - HuggingFace Datasets Hub (CNN/DailyMail, XSum)
  - Local file uploads (TXT, CSV, JSON/JSONL)
  - Vocabulary, length, and sentence-count statistics
  - Caching dataset samples to disk to avoid re-downloading
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd

from utils.logger import get_logger
from utils.helpers import (
    count_words,
    count_sentences,
    estimate_reading_time_seconds,
    iso_timestamp,
    load_json,
    save_json,
)
from config import DATASET_CONFIG, CACHE_DIR, DATASET_DIR

logger = get_logger(__name__)


# ──────────────────────────────────────────────
# TYPES
# ──────────────────────────────────────────────

DatasetSample = Dict[str, str]          # {"article": "...", "highlights": "..."}
DatasetStats  = Dict[str, Any]


# ──────────────────────────────────────────────
# CACHE HELPERS
# ──────────────────────────────────────────────

def _cache_path(dataset_name: str, split: str, n: int) -> Path:
    safe = dataset_name.replace("/", "_").replace(" ", "_")
    return CACHE_DIR / f"{safe}_{split}_{n}.json"


def _save_cached_samples(
    samples: List[DatasetSample],
    dataset_name: str,
    split: str,
    n: int,
) -> None:
    save_json(
        {"cached_at": iso_timestamp(), "samples": samples},
        _cache_path(dataset_name, split, n),
    )


def _load_cached_samples(
    dataset_name: str, split: str, n: int
) -> Optional[List[DatasetSample]]:
    data = load_json(_cache_path(dataset_name, split, n))
    if data and isinstance(data.get("samples"), list):
        logger.info("Loaded %d samples from disk cache.", len(data["samples"]))
        return data["samples"]
    return None


# ──────────────────────────────────────────────
# HuggingFace Dataset Loading
# ──────────────────────────────────────────────

def load_cnn_dailymail(
    split: str = "test",
    n: int = 100,
    use_cache: bool = True,
) -> List[DatasetSample]:
    """
    Load n samples from CNN/DailyMail 3.0.0.

    Returns a list of dicts with keys 'article' and 'highlights'.
    """
    if use_cache:
        cached = _load_cached_samples("cnn_dailymail", split, n)
        if cached is not None:
            return cached

    try:
        from datasets import load_dataset

        logger.info("Downloading CNN/DailyMail (split=%s, n=%d) …", split, n)
        ds = load_dataset(
            DATASET_CONFIG.cnn_dailymail_name,
            DATASET_CONFIG.cnn_dailymail_version,
            split=split,
            trust_remote_code=True,
        )
        ds = ds.select(range(min(n, len(ds))))
        samples = [
            {"article": row["article"], "highlights": row["highlights"]}
            for row in ds
        ]
        _save_cached_samples(samples, "cnn_dailymail", split, n)
        return samples

    except Exception as exc:
        logger.error("Failed to load CNN/DailyMail: %s", exc)
        return []


def load_xsum(
    split: str = "test",
    n: int = 100,
    use_cache: bool = True,
) -> List[DatasetSample]:
    """
    Load n samples from XSum.

    Returns a list of dicts with keys 'document' and 'summary'.
    """
    if use_cache:
        cached = _load_cached_samples("xsum", split, n)
        if cached is not None:
            return cached

    try:
        from datasets import load_dataset

        logger.info("Downloading XSum (split=%s, n=%d) …", split, n)
        ds = load_dataset(DATASET_CONFIG.xsum_name, split=split, trust_remote_code=True)
        ds = ds.select(range(min(n, len(ds))))
        samples = [
            {"article": row["document"], "highlights": row["summary"]}
            for row in ds
        ]
        _save_cached_samples(samples, "xsum", split, n)
        return samples

    except Exception as exc:
        logger.error("Failed to load XSum: %s", exc)
        return []


# ──────────────────────────────────────────────
# LOCAL FILE LOADING
# ──────────────────────────────────────────────

def load_local_dataset(file_path: Path) -> List[DatasetSample]:
    """
    Load a locally saved dataset file (JSON list of dicts).
    Expects each record to have 'article' and optionally 'highlights'.
    """
    data = load_json(file_path, default=[])
    if not isinstance(data, list):
        return []
    samples = []
    for rec in data:
        if isinstance(rec, dict) and "article" in rec:
            samples.append(
                {
                    "article":    rec.get("article", ""),
                    "highlights": rec.get("highlights", rec.get("summary", "")),
                }
            )
    return samples


def samples_to_dataframe(samples: List[DatasetSample]) -> pd.DataFrame:
    """Convert samples list to a Pandas DataFrame with derived columns."""
    rows = []
    for s in samples:
        article   = s.get("article", "")
        reference = s.get("highlights", "")
        rows.append(
            {
                "article":           article,
                "reference_summary": reference,
                "article_words":     count_words(article),
                "article_sentences": count_sentences(article),
                "ref_words":         count_words(reference),
                "read_time_s":       round(estimate_reading_time_seconds(article), 1),
            }
        )
    return pd.DataFrame(rows)


# ──────────────────────────────────────────────
# STATISTICS
# ──────────────────────────────────────────────

def compute_dataset_stats(df: pd.DataFrame) -> DatasetStats:
    """
    Compute summary statistics over a dataset DataFrame.
    Returns a dict ready for display.
    """
    if df.empty:
        return {}

    art_words = df["article_words"]
    ref_words = df["ref_words"]

    return {
        "total_samples":         len(df),
        "article_word_mean":     round(art_words.mean(), 1),
        "article_word_median":   round(art_words.median(), 1),
        "article_word_std":      round(art_words.std(), 1),
        "article_word_min":      int(art_words.min()),
        "article_word_max":      int(art_words.max()),
        "ref_word_mean":         round(ref_words.mean(), 1),
        "ref_word_median":       round(ref_words.median(), 1),
        "ref_word_min":          int(ref_words.min()),
        "ref_word_max":          int(ref_words.max()),
        "avg_compression_ratio": round((ref_words / art_words.replace(0, 1)).mean(), 4),
        "total_article_words":   int(art_words.sum()),
    }


def compute_word_frequency(
    samples: List[DatasetSample],
    top_n: int = 30,
    field: str = "article",
) -> List[Tuple[str, int]]:
    """
    Count the most frequent words across all *samples[field]* texts.

    Returns a list of (word, count) tuples sorted descending by count.
    """
    from collections import Counter
    import re

    _STOP = {
        "the", "a", "an", "and", "or", "but", "in", "on", "at",
        "to", "for", "of", "with", "by", "from", "is", "was",
        "are", "were", "be", "been", "being", "have", "has", "had",
        "do", "does", "did", "will", "would", "could", "should",
        "may", "might", "that", "this", "it", "its", "i", "he",
        "she", "they", "we", "you", "s", "said",
    }

    counter: Counter = Counter()
    for s in samples:
        text = s.get(field, "")
        words = re.findall(r"\b[a-zA-Z]{3,}\b", text.lower())
        counter.update(w for w in words if w not in _STOP)

    return counter.most_common(top_n)
