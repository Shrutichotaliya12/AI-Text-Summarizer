"""
utils/validators.py
-------------------
Input validation functions used across the application.

All validators follow a consistent contract:
  - Return (True, "") on success
  - Return (False, error_message) on failure
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Tuple, Optional

from utils.constants import (
    MIN_INPUT_CHARS,
    MAX_INPUT_CHARS,
    MIN_SUMMARY_TOKENS,
    MAX_SUMMARY_TOKENS,
    MIN_BEAMS,
    MAX_BEAMS,
    MIN_LENGTH_PENALTY,
    MAX_LENGTH_PENALTY,
    MAX_UPLOAD_BYTES,
    ALL_SUPPORTED_EXTENSIONS,
    ERROR_MESSAGES,
)
from utils.logger import get_logger

logger = get_logger(__name__)

ValidationResult = Tuple[bool, str]


# ──────────────────────────────────────────────
# TEXT VALIDATION
# ──────────────────────────────────────────────

def validate_input_text(text: str) -> ValidationResult:
    """Validate raw input text for summarization."""
    if not isinstance(text, str):
        return False, "Input must be a string."

    text = text.strip()

    if len(text) < MIN_INPUT_CHARS:
        return False, ERROR_MESSAGES["text_too_short"]

    if len(text) > MAX_INPUT_CHARS:
        return False, ERROR_MESSAGES["text_too_long"]

    # Reject texts that are mostly whitespace / special characters
    printable_ratio = sum(c.isprintable() for c in text) / max(len(text), 1)
    if printable_ratio < 0.70:
        return False, "Input text contains too many non-printable characters."

    return True, ""


def validate_reference_summary(summary: str) -> ValidationResult:
    """Validate a reference summary used for ROUGE evaluation."""
    if not isinstance(summary, str):
        return False, "Reference summary must be a string."

    summary = summary.strip()
    if len(summary) < 10:
        return False, "Reference summary is too short (minimum 10 characters)."
    if len(summary) > MAX_INPUT_CHARS:
        return False, f"Reference summary exceeds {MAX_INPUT_CHARS:,} characters."

    return True, ""


# ──────────────────────────────────────────────
# PARAMETER VALIDATION
# ──────────────────────────────────────────────

def validate_summary_length(
    min_length: int,
    max_length: int,
) -> ValidationResult:
    """Validate min/max summary length parameters."""
    if not (MIN_SUMMARY_TOKENS <= min_length <= MAX_SUMMARY_TOKENS):
        return (
            False,
            f"min_length must be between {MIN_SUMMARY_TOKENS} and {MAX_SUMMARY_TOKENS}.",
        )
    if not (MIN_SUMMARY_TOKENS <= max_length <= MAX_SUMMARY_TOKENS):
        return (
            False,
            f"max_length must be between {MIN_SUMMARY_TOKENS} and {MAX_SUMMARY_TOKENS}.",
        )
    if min_length >= max_length:
        return False, "min_length must be strictly less than max_length."

    return True, ""


def validate_num_beams(num_beams: int) -> ValidationResult:
    """Validate beam search width."""
    if not isinstance(num_beams, int) or not (MIN_BEAMS <= num_beams <= MAX_BEAMS):
        return (
            False,
            f"num_beams must be an integer between {MIN_BEAMS} and {MAX_BEAMS}.",
        )
    return True, ""


def validate_length_penalty(penalty: float) -> ValidationResult:
    """Validate length penalty."""
    if not (MIN_LENGTH_PENALTY <= penalty <= MAX_LENGTH_PENALTY):
        return (
            False,
            f"length_penalty must be between {MIN_LENGTH_PENALTY} and {MAX_LENGTH_PENALTY}.",
        )
    return True, ""


# ──────────────────────────────────────────────
# FILE VALIDATION
# ──────────────────────────────────────────────

def validate_upload_file(
    file_name: str,
    file_size_bytes: int,
    content: Optional[bytes] = None,
) -> ValidationResult:
    """Validate an uploaded file before processing."""
    path = Path(file_name)

    if path.suffix.lower() not in ALL_SUPPORTED_EXTENSIONS:
        return False, ERROR_MESSAGES["unsupported_fmt"]

    if file_size_bytes == 0:
        return False, ERROR_MESSAGES["empty_file"]

    if file_size_bytes > MAX_UPLOAD_BYTES:
        return False, ERROR_MESSAGES["file_too_large"]

    if content is not None and len(content) == 0:
        return False, ERROR_MESSAGES["empty_file"]

    return True, ""


# ──────────────────────────────────────────────
# MODEL VALIDATION
# ──────────────────────────────────────────────

def validate_model_id(model_id: str, available_models: dict) -> ValidationResult:
    """Validate that a model ID is in the registry."""
    if model_id not in available_models:
        supported = ", ".join(available_models.keys())
        return False, f"Unknown model '{model_id}'. Supported: {supported}"
    return True, ""


# ──────────────────────────────────────────────
# DATASET VALIDATION
# ──────────────────────────────────────────────

def validate_sample_size(size: int, min_size: int = 1, max_size: int = 1000) -> ValidationResult:
    """Validate dataset sample size."""
    if not isinstance(size, int) or size < min_size or size > max_size:
        return False, f"Sample size must be an integer between {min_size} and {max_size}."
    return True, ""


# ──────────────────────────────────────────────
# COMPOUND VALIDATOR
# ──────────────────────────────────────────────

def validate_summarization_request(
    text: str,
    min_length: int,
    max_length: int,
    num_beams: int,
    length_penalty: float,
    model_id: str,
    available_models: dict,
) -> ValidationResult:
    """
    Run all validation checks for a summarization request.
    Returns on first failure.
    """
    checks = [
        validate_input_text(text),
        validate_summary_length(min_length, max_length),
        validate_num_beams(num_beams),
        validate_length_penalty(length_penalty),
        validate_model_id(model_id, available_models),
    ]
    for ok, msg in checks:
        if not ok:
            logger.warning("Validation failed: %s", msg)
            return False, msg

    return True, ""
