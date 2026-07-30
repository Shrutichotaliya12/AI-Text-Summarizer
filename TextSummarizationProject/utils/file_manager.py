"""
utils/file_manager.py
---------------------
Handles all file system operations:
  - Saving / loading summarization history
  - Exporting results (TXT, JSON, CSV)
  - Uploading and extracting text from uploaded files (TXT, PDF, CSV, JSON)
  - Managing the model cache index
  - Cleaning up old output files
"""

from __future__ import annotations

import csv
import io
import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from utils.logger import get_logger
from utils.helpers import save_json, load_json, iso_timestamp
from config import HISTORY_FILE, OUTPUT_DIR
from utils.constants import MAX_HISTORY_RECORDS

logger = get_logger(__name__)


# ──────────────────────────────────────────────
# HISTORY MANAGEMENT
# ──────────────────────────────────────────────

def load_history() -> List[Dict[str, Any]]:
    """Load the summarization history list from disk."""
    data = load_json(HISTORY_FILE, default=[])
    if not isinstance(data, list):
        logger.warning("History file had unexpected format; resetting.")
        return []
    return data


def save_history_entry(entry: Dict[str, Any]) -> bool:
    """
    Append a new entry to the history file.
    Trims to MAX_HISTORY_RECORDS newest entries.
    """
    history = load_history()

    entry.setdefault("timestamp", iso_timestamp())
    history.append(entry)

    # Keep only the newest records
    if len(history) > MAX_HISTORY_RECORDS:
        history = history[-MAX_HISTORY_RECORDS:]

    return save_json(history, HISTORY_FILE)


def clear_history() -> bool:
    """Delete all history records."""
    return save_json([], HISTORY_FILE)


# ──────────────────────────────────────────────
# FILE READING (uploaded files)
# ──────────────────────────────────────────────

def read_text_file(content: bytes, encoding: str = "utf-8") -> str:
    """Decode raw bytes from a plain text upload."""
    try:
        return content.decode(encoding)
    except UnicodeDecodeError:
        return content.decode("latin-1", errors="replace")


def read_pdf_file(content: bytes) -> str:
    """
    Extract text from a PDF using PyMuPDF (fitz).
    Falls back to pdfplumber if fitz is unavailable.
    Returns extracted plain text.
    """
    try:
        import fitz  # PyMuPDF

        with fitz.open(stream=content, filetype="pdf") as doc:
            return "\n\n".join(page.get_text() for page in doc)
    except ImportError:
        pass

    try:
        import pdfplumber

        with pdfplumber.open(io.BytesIO(content)) as pdf:
            return "\n\n".join(
                page.extract_text() or "" for page in pdf.pages
            )
    except ImportError:
        pass

    raise RuntimeError(
        "PDF support requires 'PyMuPDF' or 'pdfplumber'. "
        "Install one: pip install PyMuPDF"
    )


def read_csv_file(content: bytes, text_column: Optional[str] = None) -> str:
    """
    Read a CSV file and concatenate all text.
    If *text_column* is given, only that column is used.
    """
    decoded = content.decode("utf-8", errors="replace")
    reader = csv.DictReader(io.StringIO(decoded))
    rows = list(reader)

    if not rows:
        return ""

    if text_column and text_column in rows[0]:
        texts = [row.get(text_column, "") for row in rows]
    else:
        # Auto-detect longest text column
        fieldnames = reader.fieldnames or list(rows[0].keys())
        if fieldnames:
            col = max(
                fieldnames,
                key=lambda f: sum(len(str(r.get(f, ""))) for r in rows),
            )
            texts = [row.get(col, "") for row in rows]
        else:
            texts = [" ".join(str(v) for v in row.values()) for row in rows]

    return "\n\n".join(t.strip() for t in texts if t.strip())


def read_json_file(content: bytes, text_key: Optional[str] = None) -> str:
    """
    Read a JSON or JSONL file and concatenate all text fields.
    If *text_key* is given, uses that key; otherwise auto-detects.
    """
    decoded = content.decode("utf-8", errors="replace")

    # Try JSONL first
    records: List[Any] = []
    try:
        records = [json.loads(line) for line in decoded.splitlines() if line.strip()]
    except json.JSONDecodeError:
        pass

    # Fall back to standard JSON
    if not records:
        try:
            data = json.loads(decoded)
            records = data if isinstance(data, list) else [data]
        except json.JSONDecodeError as exc:
            raise ValueError(f"Could not parse JSON file: {exc}") from exc

    texts: List[str] = []
    for rec in records:
        if isinstance(rec, str):
            texts.append(rec)
        elif isinstance(rec, dict):
            if text_key and text_key in rec:
                texts.append(str(rec[text_key]))
            else:
                # Pick the key with the longest string value
                best = max(rec, key=lambda k: len(str(rec[k])), default=None)
                if best:
                    texts.append(str(rec[best]))

    return "\n\n".join(t.strip() for t in texts if t.strip())


def read_docx_file(content: bytes) -> str:
    """Extract text from a DOCX file using python-docx."""
    import docx
    
    doc = docx.Document(io.BytesIO(content))
    return "\n\n".join(paragraph.text for paragraph in doc.paragraphs if paragraph.text.strip())


def extract_text_from_upload(
    file_name: str,
    content: bytes,
) -> str:
    """
    Route the uploaded file to the appropriate reader based on extension.
    Returns extracted plain text.
    """
    ext = Path(file_name).suffix.lower()

    if ext in (".txt", ".md", ".rst"):
        return read_text_file(content)
    if ext == ".pdf":
        return read_pdf_file(content)
    if ext == ".docx":
        return read_docx_file(content)
    if ext == ".csv":
        return read_csv_file(content)
    if ext in (".json", ".jsonl"):
        return read_json_file(content)

    raise ValueError(f"Unsupported file extension: {ext}")


# ──────────────────────────────────────────────
# EXPORT HELPERS
# ──────────────────────────────────────────────

def build_export_txt(result: Dict[str, Any]) -> str:
    """Build a plain-text export string from a summarization result."""
    lines = [
        f"Text Summarization Result",
        f"=" * 50,
        f"Timestamp  : {result.get('timestamp', 'N/A')}",
        f"Model      : {result.get('model_id', 'N/A')}",
        f"Inference  : {result.get('inference_time_s', 0):.2f} s",
        f"Words (in) : {result.get('input_word_count', 'N/A')}",
        f"Words (out): {result.get('output_word_count', 'N/A')}",
        f"Compression: {result.get('compression_ratio', 0):.2%}",
        "",
        "── ORIGINAL TEXT ──",
        result.get("input_text", ""),
        "",
        "── GENERATED SUMMARY ──",
        result.get("summary", ""),
    ]
    return "\n".join(lines)


def build_export_json(result: Dict[str, Any]) -> str:
    """Build a JSON export string from a summarization result."""
    return json.dumps(result, indent=2, ensure_ascii=False, default=str)


def build_export_csv(results: List[Dict[str, Any]]) -> str:
    """Build a CSV export string from a list of summarization results."""
    if not results:
        return ""

    fieldnames = [
        "timestamp", "model_id", "input_word_count", "output_word_count",
        "compression_ratio", "inference_time_s", "summary",
    ]
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(results)
    return buf.getvalue()


def save_output_file(content: str, filename: str) -> Path:
    """Save an export file to OUTPUT_DIR and return its path."""
    output_path = OUTPUT_DIR / filename
    output_path.write_text(content, encoding="utf-8")
    logger.info("Saved output file: %s", output_path)
    return output_path


# ──────────────────────────────────────────────
# CLEANUP
# ──────────────────────────────────────────────

def cleanup_old_outputs(max_files: int = 50) -> int:
    """
    Delete the oldest files from OUTPUT_DIR if more than *max_files* exist.
    Returns the number of files deleted.
    """
    files = sorted(OUTPUT_DIR.glob("*"), key=lambda p: p.stat().st_mtime)
    to_delete = files[: max(0, len(files) - max_files)]
    for f in to_delete:
        try:
            f.unlink()
        except OSError as exc:
            logger.warning("Could not delete %s: %s", f, exc)
    if to_delete:
        logger.info("Deleted %d old output files.", len(to_delete))
    return len(to_delete)
