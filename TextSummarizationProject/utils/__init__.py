"""
utils/__init__.py
-----------------
Makes utils a proper Python package and re-exports the most commonly used
symbols so callers can write:

    from utils import get_logger, validate_input_text, Timer
"""

from utils.logger import get_logger, logger
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
    current_timestamp,
    iso_timestamp,
    Timer,
    load_json,
    save_json,
    rouge_badge_color,
    rouge_label,
)
from utils.validators import (
    validate_input_text,
    validate_reference_summary,
    validate_summary_length,
    validate_num_beams,
    validate_length_penalty,
    validate_upload_file,
    validate_model_id,
    validate_sample_size,
    validate_summarization_request,
)
from utils.constants import (
    MIN_INPUT_CHARS,
    MAX_INPUT_CHARS,
    SAMPLE_TEXT_SHORT,
    SAMPLE_TEXT_MEDIUM,
    SAMPLE_TEXT_LONG,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    APP_TAGLINE,
    FOOTER_TEXT,
)
from utils.file_manager import (
    load_history,
    save_history_entry,
    clear_history,
    extract_text_from_upload,
    build_export_txt,
    build_export_json,
    build_export_csv,
    save_output_file,
    cleanup_old_outputs,
)

__all__ = [
    # Logger
    "get_logger", "logger",
    # Helpers
    "count_words", "count_sentences", "estimate_reading_time_seconds",
    "truncate_text", "clean_text", "compute_compression_ratio",
    "compute_reduction_percent", "format_duration", "format_bytes",
    "current_timestamp", "iso_timestamp", "Timer",
    "load_json", "save_json", "rouge_badge_color", "rouge_label",
    # Validators
    "validate_input_text", "validate_reference_summary",
    "validate_summary_length", "validate_num_beams", "validate_length_penalty",
    "validate_upload_file", "validate_model_id", "validate_sample_size",
    "validate_summarization_request",
    # Constants
    "MIN_INPUT_CHARS", "MAX_INPUT_CHARS",
    "SAMPLE_TEXT_SHORT", "SAMPLE_TEXT_MEDIUM", "SAMPLE_TEXT_LONG",
    "ERROR_MESSAGES", "SUCCESS_MESSAGES", "APP_TAGLINE", "FOOTER_TEXT",
    # File manager
    "load_history", "save_history_entry", "clear_history",
    "extract_text_from_upload", "build_export_txt", "build_export_json",
    "build_export_csv", "save_output_file", "cleanup_old_outputs",
]
