"""
utils/logger.py
---------------
Professional rotating-file + console logger for the entire application.

Features:
  - RotatingFileHandler (10 MB per file, 5 backups)
  - StreamHandler (coloured console output via colorlog)
  - Separate DEBUG / INFO / WARNING / ERROR / CRITICAL levels
  - Structured format with timestamp, level, module, line number
  - Exception traceback capture via logger.exception()
  - Single get_logger() factory — never creates duplicate handlers
"""

from __future__ import annotations

import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Optional

# Try coloured console output; graceful fallback if colorlog not installed
try:
    import colorlog
    _HAS_COLORLOG = True
except ImportError:
    _HAS_COLORLOG = False


# ──────────────────────────────────────────────
# FORMATS
# ──────────────────────────────────────────────
_FILE_FORMAT = (
    "%(asctime)s | %(levelname)-8s | %(name)s:%(lineno)d | %(message)s"
)
_CONSOLE_FORMAT = (
    "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
)
_COLOR_FORMAT = (
    "%(log_color)s%(asctime)s | %(levelname)-8s%(reset)s | "
    "%(blue)s%(name)s%(reset)s | %(message)s"
)
_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

_COLOR_MAP = {
    "DEBUG":    "cyan",
    "INFO":     "green",
    "WARNING":  "yellow",
    "ERROR":    "red",
    "CRITICAL": "bold_red",
}


def _build_file_handler(log_file: Path, max_bytes: int, backup_count: int) -> RotatingFileHandler:
    """Create and configure the rotating file handler."""
    log_file.parent.mkdir(parents=True, exist_ok=True)
    handler = RotatingFileHandler(
        filename=str(log_file),
        maxBytes=max_bytes,
        backupCount=backup_count,
        encoding="utf-8",
    )
    handler.setLevel(logging.DEBUG)
    handler.setFormatter(logging.Formatter(_FILE_FORMAT, datefmt=_DATE_FORMAT))
    return handler


def _build_console_handler(level: int = logging.INFO) -> logging.Handler:
    """Create a coloured (or plain) console handler."""
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)

    if _HAS_COLORLOG:
        formatter = colorlog.ColoredFormatter(
            _COLOR_FORMAT,
            datefmt=_DATE_FORMAT,
            log_colors=_COLOR_MAP,
            reset=True,
            style="%",
        )
    else:
        formatter = logging.Formatter(_CONSOLE_FORMAT, datefmt=_DATE_FORMAT)

    handler.setFormatter(formatter)
    return handler


# ──────────────────────────────────────────────
# PUBLIC API
# ──────────────────────────────────────────────
def get_logger(
    name: str,
    *,
    log_file: Optional[Path] = None,
    level: str = "INFO",
    max_bytes: int = 10 * 1024 * 1024,
    backup_count: int = 5,
) -> logging.Logger:
    """
    Return a fully configured logger.  Calling this function multiple times
    with the same *name* returns the same logger instance without adding
    duplicate handlers (idempotent).

    Parameters
    ----------
    name:
        Logger name — usually ``__name__`` of the calling module.
    log_file:
        Absolute path to the log file.  Defaults to ``logs/app.log``
        (resolved relative to the project root).
    level:
        Root log level string: DEBUG | INFO | WARNING | ERROR | CRITICAL.
    max_bytes:
        Maximum size of a single log file before rotation.
    backup_count:
        Number of rotated backup files to keep.
    """
    # Resolve default log path from config to avoid circular imports
    if log_file is None:
        _project_root = Path(__file__).resolve().parent.parent
        log_file = _project_root / "logs" / "app.log"

    logger = logging.getLogger(name)

    # Avoid adding duplicate handlers if logger already configured
    if logger.handlers:
        return logger

    numeric_level = getattr(logging, level.upper(), logging.INFO)
    logger.setLevel(logging.DEBUG)   # Capture everything; handlers filter

    logger.addHandler(_build_file_handler(log_file, max_bytes, backup_count))
    logger.addHandler(_build_console_handler(level=numeric_level))

    # Prevent messages from propagating to the root logger
    logger.propagate = False

    return logger


# ──────────────────────────────────────────────
# MODULE-LEVEL DEFAULT LOGGER
# ──────────────────────────────────────────────
logger = get_logger("text_summarizer")
