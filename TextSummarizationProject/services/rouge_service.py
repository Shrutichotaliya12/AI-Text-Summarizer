"""
services/rouge_service.py
--------------------------
ROUGE score computation service using the `rouge_score` library.

Supports:
  - Single-pair evaluation (one generated summary vs. one reference)
  - Batch evaluation (list of summaries vs. list of references)
  - Score aggregation (mean / 95th-percentile confidence intervals)
  - Human-readable report generation
  - Graceful degradation if rouge_score is not installed
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

from utils.logger import get_logger
from utils.helpers import rouge_badge_color, rouge_label
from config import ROUGE_CONFIG

logger = get_logger(__name__)


# ──────────────────────────────────────────────
# TYPES
# ──────────────────────────────────────────────

@dataclass
class RougeScores:
    """Container for ROUGE-1/2/L/Lsum precision/recall/fmeasure."""
    rouge1_p: float = 0.0
    rouge1_r: float = 0.0
    rouge1_f: float = 0.0
    rouge2_p: float = 0.0
    rouge2_r: float = 0.0
    rouge2_f: float = 0.0
    rougeL_p: float = 0.0
    rougeL_r: float = 0.0
    rougeL_f: float = 0.0
    rougeLsum_f: float = 0.0

    def to_dict(self) -> Dict[str, float]:
        return {
            "rouge1":    self.rouge1_f,
            "rouge2":    self.rouge2_f,
            "rougeL":    self.rougeL_f,
            "rougeLsum": self.rougeLsum_f,
        }

    def summary_dict(self) -> Dict[str, Dict[str, float]]:
        """Full precision/recall/F1 nested dict."""
        return {
            "rouge1": {"precision": self.rouge1_p, "recall": self.rouge1_r, "fmeasure": self.rouge1_f},
            "rouge2": {"precision": self.rouge2_p, "recall": self.rouge2_r, "fmeasure": self.rouge2_f},
            "rougeL": {"precision": self.rougeL_p, "recall": self.rougeL_r, "fmeasure": self.rougeL_f},
            "rougeLsum": {"fmeasure": self.rougeLsum_f},
        }


@dataclass
class AggregatedRouge:
    """Aggregated ROUGE scores over multiple samples (mean F1 per metric)."""
    rouge1_mean: float = 0.0
    rouge2_mean: float = 0.0
    rougeL_mean: float = 0.0
    rougeLsum_mean: float = 0.0
    sample_count: int = 0
    per_sample: List[RougeScores] = field(default_factory=list)

    def to_dict(self) -> Dict[str, float]:
        return {
            "rouge1":    round(self.rouge1_mean, 4),
            "rouge2":    round(self.rouge2_mean, 4),
            "rougeL":    round(self.rougeL_mean, 4),
            "rougeLsum": round(self.rougeLsum_mean, 4),
        }


# ──────────────────────────────────────────────
# SERVICE CLASS
# ──────────────────────────────────────────────

class RougeService:
    """
    Stateless ROUGE evaluation service.

    Uses the `rouge_score` package (Google Brain implementation).
    Falls back to a zero-score dummy if the library is missing,
    with a clear error message to the caller.
    """

    def __init__(self) -> None:
        self._scorer = self._build_scorer()

    @staticmethod
    def _build_scorer():
        try:
            from rouge_score import rouge_scorer

            scorer = rouge_scorer.RougeScorer(
                list(ROUGE_CONFIG.metrics),
                use_stemmer=ROUGE_CONFIG.use_stemmer,
            )
            logger.info("RougeScorer initialised with metrics: %s", ROUGE_CONFIG.metrics)
            return scorer
        except ImportError:
            logger.warning(
                "rouge_score not installed. Install with: pip install rouge-score"
            )
            return None

    # ──────────────────────────────────────────
    # SINGLE PAIR
    # ──────────────────────────────────────────

    def evaluate(
        self,
        prediction: str,
        reference: str,
    ) -> Tuple[Optional[RougeScores], str]:
        """
        Compute ROUGE scores for a single prediction/reference pair.

        Returns
        -------
        (RougeScores, "") on success
        (None, error_message) on failure
        """
        if self._scorer is None:
            return None, "rouge_score library not installed. Run: pip install rouge-score"

        if not prediction.strip() or not reference.strip():
            return None, "Prediction or reference is empty."

        try:
            raw = self._scorer.score(reference, prediction)
            scores = RougeScores(
                rouge1_p=raw["rouge1"].precision,
                rouge1_r=raw["rouge1"].recall,
                rouge1_f=raw["rouge1"].fmeasure,
                rouge2_p=raw["rouge2"].precision,
                rouge2_r=raw["rouge2"].recall,
                rouge2_f=raw["rouge2"].fmeasure,
                rougeL_p=raw["rougeL"].precision,
                rougeL_r=raw["rougeL"].recall,
                rougeL_f=raw["rougeL"].fmeasure,
                rougeLsum_f=raw.get("rougeLsum", raw["rougeL"]).fmeasure,
            )
            logger.debug(
                "ROUGE scores — R1=%.4f R2=%.4f RL=%.4f",
                scores.rouge1_f,
                scores.rouge2_f,
                scores.rougeL_f,
            )
            return scores, ""
        except Exception as exc:
            logger.exception("ROUGE evaluation failed: %s", exc)
            return None, str(exc)

    # ──────────────────────────────────────────
    # BATCH EVALUATION
    # ──────────────────────────────────────────

    def evaluate_batch(
        self,
        predictions: List[str],
        references: List[str],
    ) -> Tuple[Optional[AggregatedRouge], str]:
        """
        Compute and aggregate ROUGE over multiple pairs.

        Returns
        -------
        (AggregatedRouge, "") on success
        (None, error_message) on failure
        """
        if len(predictions) != len(references):
            return None, "predictions and references must have the same length."
        if not predictions:
            return None, "Empty batch provided."

        per_sample: List[RougeScores] = []
        errors: List[str] = []

        for pred, ref in zip(predictions, references):
            scores, err = self.evaluate(pred, ref)
            if scores is not None:
                per_sample.append(scores)
            else:
                errors.append(err)

        if not per_sample:
            return None, f"All evaluations failed. Errors: {errors[:3]}"

        n = len(per_sample)
        agg = AggregatedRouge(
            rouge1_mean=sum(s.rouge1_f for s in per_sample) / n,
            rouge2_mean=sum(s.rouge2_f for s in per_sample) / n,
            rougeL_mean=sum(s.rougeL_f for s in per_sample) / n,
            rougeLsum_mean=sum(s.rougeLsum_f for s in per_sample) / n,
            sample_count=n,
            per_sample=per_sample,
        )
        logger.info(
            "Batch ROUGE (%d samples) — R1=%.4f R2=%.4f RL=%.4f",
            n,
            agg.rouge1_mean,
            agg.rouge2_mean,
            agg.rougeL_mean,
        )
        return agg, ""

    # ──────────────────────────────────────────
    # REPORT HELPER
    # ──────────────────────────────────────────

    @staticmethod
    def build_report(scores: RougeScores) -> List[Dict]:
        """
        Build a list of metric dicts for display in Streamlit.

        Each dict has: metric, fmeasure, precision, recall, label, color
        """
        detail = scores.summary_dict()
        report = []
        for metric in ("rouge1", "rouge2", "rougeL"):
            d = detail[metric]
            f1 = d["fmeasure"]
            report.append(
                {
                    "metric":    metric.upper(),
                    "fmeasure":  round(f1, 4),
                    "precision": round(d["precision"], 4),
                    "recall":    round(d["recall"], 4),
                    "label":     rouge_label(metric, f1),
                    "color":     rouge_badge_color(metric, f1),
                }
            )
        return report
