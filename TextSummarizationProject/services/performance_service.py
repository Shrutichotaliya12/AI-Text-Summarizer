"""
services/performance_service.py
--------------------------------
Tracks and reports runtime performance of the summarization pipeline.

Metrics tracked per inference run:
  - Inference wall-clock time
  - CPU usage (%)
  - RAM usage (MB)
  - GPU VRAM if available
  - Tokens per second (throughput)

Stores a rolling history of up to PERFORMANCE_CONFIG.metrics_history_limit entries.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional

import psutil

from utils.logger import get_logger
from utils.helpers import iso_timestamp, format_duration
from config import PERFORMANCE_CONFIG

logger = get_logger(__name__)


# ──────────────────────────────────────────────
# DATA CLASSES
# ──────────────────────────────────────────────

@dataclass
class SystemSnapshot:
    """Point-in-time snapshot of system resource usage."""
    cpu_percent: float        = 0.0
    ram_used_mb: float        = 0.0
    ram_total_mb: float       = 0.0
    ram_percent: float        = 0.0
    gpu_vram_used_mb: float   = 0.0
    gpu_vram_total_mb: float  = 0.0
    timestamp: str            = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class InferenceMetrics:
    """Metrics collected for a single summarization run."""
    model_id: str
    input_words: int
    output_words: int
    input_tokens: int
    output_tokens: int
    inference_time_s: float
    tokens_per_second: float
    cpu_before: float
    cpu_after: float
    ram_before_mb: float
    ram_after_mb: float
    ram_delta_mb: float
    gpu_vram_used_mb: float
    timestamp: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ──────────────────────────────────────────────
# SERVICE CLASS
# ──────────────────────────────────────────────

class PerformanceService:
    """
    Collects system + inference metrics and maintains a rolling history.

    Usage::

        svc = PerformanceService()
        svc.record(
            model_id="facebook/bart-large-cnn",
            input_words=300,
            output_words=80,
            input_tokens=410,
            output_tokens=110,
            inference_time_s=3.2,
        )
        history = svc.get_history()
    """

    def __init__(self) -> None:
        self._history: List[InferenceMetrics] = []
        self._limit = PERFORMANCE_CONFIG.metrics_history_limit
        self._process = psutil.Process()

    # ──────────────────────────────────────────
    # SYSTEM SNAPSHOT
    # ──────────────────────────────────────────

    def snapshot(self) -> SystemSnapshot:
        """Capture current system resource usage."""
        mem = psutil.virtual_memory()
        snap = SystemSnapshot(
            cpu_percent=psutil.cpu_percent(interval=0.1),
            ram_used_mb=round(mem.used / 1024 ** 2, 1),
            ram_total_mb=round(mem.total / 1024 ** 2, 1),
            ram_percent=mem.percent,
            timestamp=iso_timestamp(),
        )

        # Attempt GPU metrics via torch
        try:
            import torch

            if torch.cuda.is_available():
                props = torch.cuda.get_device_properties(0)
                snap.gpu_vram_total_mb = round(props.total_memory / 1024 ** 2, 1)
                snap.gpu_vram_used_mb  = round(
                    torch.cuda.memory_allocated(0) / 1024 ** 2, 1
                )
        except Exception:
            pass

        return snap

    def process_memory_mb(self) -> float:
        """Return the current process RSS in MB."""
        try:
            return round(self._process.memory_info().rss / 1024 ** 2, 1)
        except psutil.NoSuchProcess:
            return 0.0

    # ──────────────────────────────────────────
    # RECORD
    # ──────────────────────────────────────────

    def record(
        self,
        model_id: str,
        input_words: int,
        output_words: int,
        input_tokens: int,
        output_tokens: int,
        inference_time_s: float,
        snap_before: Optional[SystemSnapshot] = None,
        snap_after: Optional[SystemSnapshot] = None,
    ) -> InferenceMetrics:
        """
        Record a completed inference run and append to history.

        If snap_before/snap_after are not provided, the method
        captures them at call time (not ideal but acceptable for
        Streamlit's single-threaded context).
        """
        if snap_before is None:
            snap_before = self.snapshot()
        if snap_after is None:
            snap_after = self.snapshot()

        tps = round(output_tokens / max(inference_time_s, 0.001), 2)

        metrics = InferenceMetrics(
            model_id=model_id,
            input_words=input_words,
            output_words=output_words,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            inference_time_s=round(inference_time_s, 4),
            tokens_per_second=tps,
            cpu_before=snap_before.cpu_percent,
            cpu_after=snap_after.cpu_percent,
            ram_before_mb=snap_before.ram_used_mb,
            ram_after_mb=snap_after.ram_used_mb,
            ram_delta_mb=round(snap_after.ram_used_mb - snap_before.ram_used_mb, 1),
            gpu_vram_used_mb=snap_after.gpu_vram_used_mb,
            timestamp=iso_timestamp(),
        )

        self._history.append(metrics)
        if len(self._history) > self._limit:
            self._history = self._history[-self._limit:]

        logger.info(
            "Perf recorded — %.2f s | %.1f tok/s | ΔRAM %.1f MB [%s]",
            metrics.inference_time_s,
            metrics.tokens_per_second,
            metrics.ram_delta_mb,
            model_id,
        )
        return metrics

    # ──────────────────────────────────────────
    # HISTORY & AGGREGATION
    # ──────────────────────────────────────────

    def get_history(self) -> List[InferenceMetrics]:
        """Return all recorded metrics."""
        return list(self._history)

    def clear_history(self) -> None:
        """Reset the in-memory history."""
        self._history.clear()
        logger.info("Performance history cleared.")

    def aggregate(self) -> Dict[str, Any]:
        """Compute summary statistics over the recorded history."""
        if not self._history:
            return {}

        times  = [m.inference_time_s    for m in self._history]
        tps    = [m.tokens_per_second    for m in self._history]
        indeltas = [m.ram_delta_mb       for m in self._history]
        cpu    = [m.cpu_after            for m in self._history]

        def _avg(lst):
            return round(sum(lst) / len(lst), 4)

        return {
            "total_runs":        len(self._history),
            "avg_time_s":        _avg(times),
            "min_time_s":        round(min(times), 4),
            "max_time_s":        round(max(times), 4),
            "avg_tokens_per_s":  _avg(tps),
            "avg_ram_delta_mb":  _avg(indeltas),
            "avg_cpu_after":     _avg(cpu),
        }

    def history_as_dicts(self) -> List[Dict[str, Any]]:
        """Return history as a list of plain dicts (for DataFrame / export)."""
        return [m.to_dict() for m in self._history]
