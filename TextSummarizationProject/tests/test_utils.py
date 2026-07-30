"""
tests/test_utils.py
--------------------
Unit tests for the utils package (no model loading required).
"""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

import pytest

from utils.helpers import (
    count_words,
    count_sentences,
    estimate_reading_time_seconds,
    truncate_text,
    clean_text,
    compute_compression_ratio,
    compute_reduction_percent,
    format_duration,
    format_bytes,
    rouge_badge_color,
    rouge_label,
    load_json,
    save_json,
    Timer,
    safe_divide,
    percentage,
    clamp,
)
from utils.validators import (
    validate_input_text,
    validate_summary_length,
    validate_num_beams,
    validate_length_penalty,
    validate_upload_file,
    validate_summarization_request,
)
from utils.constants import MIN_INPUT_CHARS, MAX_INPUT_CHARS


# ──────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────

class TestCountWords:
    def test_basic(self):
        assert count_words("Hello world") == 2

    def test_empty(self):
        assert count_words("") == 0

    def test_multiple_spaces(self):
        assert count_words("one  two   three") == 3


class TestCountSentences:
    def test_basic(self):
        assert count_sentences("Hello. World.") == 2

    def test_single(self):
        assert count_sentences("No end") == 1


class TestTruncateText:
    def test_short_text_unchanged(self):
        assert truncate_text("short", 100) == "short"

    def test_long_text_truncated(self):
        result = truncate_text("a" * 200, 50)
        assert len(result) <= 50 + 1  # suffix is 1 char
        assert result.endswith("…")


class TestCleanText:
    def test_multiple_spaces(self):
        assert clean_text("hello   world") == "hello world"

    def test_strips_whitespace(self):
        assert clean_text("  hello  ") == "hello"


class TestCompressionRatio:
    def test_half_compression(self):
        original = " ".join(["word"] * 100)
        summary  = " ".join(["word"] * 50)
        assert compute_compression_ratio(original, summary) == pytest.approx(0.5, abs=0.01)

    def test_reduction_percent(self):
        original = " ".join(["word"] * 100)
        summary  = " ".join(["word"] * 20)
        assert compute_reduction_percent(original, summary) == pytest.approx(80.0, abs=0.1)


class TestFormatDuration:
    def test_seconds(self):
        assert "s" in format_duration(3.14)

    def test_minutes(self):
        result = format_duration(65.0)
        assert "min" in result


class TestFormatBytes:
    def test_bytes(self):
        assert "B" in format_bytes(512)

    def test_megabytes(self):
        result = format_bytes(5 * 1024 * 1024)
        assert "MB" in result


class TestRougeBadge:
    def test_good_score(self):
        assert rouge_badge_color("rouge1", 0.5) == "#48BB78"

    def test_fair_score(self):
        assert rouge_badge_color("rouge1", 0.30) == "#ECC94B"

    def test_poor_score(self):
        assert rouge_badge_color("rouge1", 0.10) == "#FC8181"

    def test_label_good(self):
        assert rouge_label("rouge1", 0.5) == "Good"

    def test_label_poor(self):
        assert rouge_label("rouge1", 0.05) == "Poor"


class TestJsonIO:
    def test_save_and_load(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            p = Path(tmpdir) / "test.json"
            data = {"key": "value", "num": 42}
            assert save_json(data, p) is True
            loaded = load_json(p)
            assert loaded == data

    def test_load_missing_file(self):
        assert load_json("/nonexistent/path/file.json", default="fallback") == "fallback"

    def test_load_corrupted_file(self):
        with tempfile.NamedTemporaryFile(suffix=".json", mode="w", delete=False) as f:
            f.write("not valid json {{")
            path = Path(f.name)
        result = load_json(path, default=[])
        assert result == []
        path.unlink(missing_ok=True)


class TestTimer:
    def test_elapsed(self):
        import time
        with Timer() as t:
            time.sleep(0.05)
        assert t.elapsed >= 0.04

    def test_formatted(self):
        with Timer() as t:
            pass
        assert "s" in t.formatted


class TestMath:
    def test_safe_divide_zero(self):
        assert safe_divide(10, 0) == 0.0

    def test_percentage(self):
        assert percentage(50, 200) == 25.0

    def test_clamp(self):
        assert clamp(5, 1, 10) == 5
        assert clamp(-5, 1, 10) == 1
        assert clamp(15, 1, 10) == 10


# ──────────────────────────────────────────────
# VALIDATORS
# ──────────────────────────────────────────────

class TestValidateInputText:
    def _long_text(self, n=200):
        return "word " * n

    def test_valid(self):
        ok, msg = validate_input_text(self._long_text())
        assert ok is True
        assert msg == ""

    def test_too_short(self):
        ok, msg = validate_input_text("too short")
        assert ok is False
        assert msg != ""

    def test_too_long(self):
        ok, msg = validate_input_text("a" * (MAX_INPUT_CHARS + 1))
        assert ok is False

    def test_not_string(self):
        ok, msg = validate_input_text(12345)  # type: ignore
        assert ok is False


class TestValidateSummaryLength:
    def test_valid(self):
        ok, _ = validate_summary_length(30, 150)
        assert ok is True

    def test_min_ge_max(self):
        ok, msg = validate_summary_length(150, 50)
        assert ok is False

    def test_equal(self):
        ok, _ = validate_summary_length(100, 100)
        assert ok is False


class TestValidateNumBeams:
    def test_valid(self):
        ok, _ = validate_num_beams(4)
        assert ok is True

    def test_zero(self):
        ok, _ = validate_num_beams(0)
        assert ok is False

    def test_too_high(self):
        ok, _ = validate_num_beams(100)
        assert ok is False


class TestValidateLengthPenalty:
    def test_valid(self):
        ok, _ = validate_length_penalty(2.0)
        assert ok is True

    def test_too_low(self):
        ok, _ = validate_length_penalty(0.1)
        assert ok is False


class TestValidateUploadFile:
    def test_valid_txt(self):
        ok, _ = validate_upload_file("doc.txt", 1024)
        assert ok is True

    def test_unsupported_ext(self):
        ok, _ = validate_upload_file("doc.exe", 100)
        assert ok is False

    def test_empty_file(self):
        ok, _ = validate_upload_file("doc.txt", 0)
        assert ok is False

    def test_too_large(self):
        ok, _ = validate_upload_file("doc.txt", 100 * 1024 * 1024)
        assert ok is False


class TestCompoundValidator:
    def _dummy_models(self):
        from config import AVAILABLE_MODELS
        return AVAILABLE_MODELS

    def test_valid_request(self):
        text = "word " * 50  # 250 chars
        ok, _ = validate_summarization_request(
            text, 30, 150, 4, 2.0, "facebook/bart-large-cnn",
            self._dummy_models(),
        )
        assert ok is True

    def test_unknown_model(self):
        text = "word " * 50
        ok, _ = validate_summarization_request(
            text, 30, 150, 4, 2.0, "nonexistent-model",
            self._dummy_models(),
        )
        assert ok is False
