"""
services/summarization_service.py
----------------------------------
Core summarization service — the single entry-point for generating summaries.

Responsibilities:
  - Delegate to ModelLoader to obtain the right HuggingFace pipeline
  - Validate parameters before inference
  - Measure wall-clock inference time
  - Compute word/token counts and compression ratio
  - Persist result to history
  - Return a rich SummarizationResult dataclass
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Dict, Optional

from models.model_loader import ModelLoader
from utils.logger import get_logger
from utils.helpers import (
    count_words,
    compute_compression_ratio,
    compute_reduction_percent,
    iso_timestamp,
    clean_text,
)
from utils.validators import validate_summarization_request
from utils.file_manager import save_history_entry
from config import AVAILABLE_MODELS

logger = get_logger(__name__)


# ──────────────────────────────────────────────
# RESULT DATACLASS
# ──────────────────────────────────────────────

@dataclass
class SummarizationResult:
    """
    Rich result object returned by SummarizationService.summarize().
    Contains the summary plus all metadata needed for evaluation and display.
    """
    success: bool
    summary: str
    error: str

    # Input metadata
    model_id: str
    input_text: str
    input_word_count: int
    input_char_count: int

    # Output metadata
    output_word_count: int
    output_char_count: int
    compression_ratio: float
    reduction_percent: float

    # Performance
    inference_time_s: float
    timestamp: str

    # Generation parameters echoed back
    params: Dict = field(default_factory=dict)

    @property
    def is_success(self) -> bool:
        return self.success

    def to_dict(self) -> Dict:
        """Serialisable representation for history / export."""
        return {
            "timestamp":        self.timestamp,
            "model_id":         self.model_id,
            "input_word_count": self.input_word_count,
            "input_char_count": self.input_char_count,
            "output_word_count": self.output_word_count,
            "output_char_count": self.output_char_count,
            "compression_ratio": self.compression_ratio,
            "reduction_percent": self.reduction_percent,
            "inference_time_s": self.inference_time_s,
            "summary":          self.summary,
            "input_text":       self.input_text,
            "params":           self.params,
        }


def _make_error_result(error_msg: str, model_id: str, text: str) -> SummarizationResult:
    """Construct a failed SummarizationResult."""
    return SummarizationResult(
        success=False,
        summary="",
        error=error_msg,
        model_id=model_id,
        input_text=text,
        input_word_count=count_words(text),
        input_char_count=len(text),
        output_word_count=0,
        output_char_count=0,
        compression_ratio=0.0,
        reduction_percent=0.0,
        inference_time_s=0.0,
        timestamp=iso_timestamp(),
    )


# ──────────────────────────────────────────────
# SERVICE CLASS
# ──────────────────────────────────────────────

class SummarizationService:
    """
    Stateless service facade for text summarization.

    Inject a ModelLoader (defaults to the global singleton) to allow
    unit testing with mock loaders.
    """

    def __init__(self, loader: Optional[ModelLoader] = None) -> None:
        self._loader = loader or ModelLoader.instance()

    # ──────────────────────────────────────────
    # PRIMARY METHOD
    # ──────────────────────────────────────────

    def summarize(
        self,
        text: str,
        model_id: str,
        min_length: int = 56,
        max_length: int = 200,
        num_beams: int = 4,
        length_penalty: float = 2.0,
        early_stopping: bool = True,
        no_repeat_ngram_size: int = 3,
        save_to_history: bool = True,
    ) -> SummarizationResult:
        """
        Summarise *text* using the specified *model_id*.

        Parameters
        ----------
        text:
            Raw input text (will be cleaned internally).
        model_id:
            Key from config.AVAILABLE_MODELS.
        min_length / max_length:
            Target summary token range.
        num_beams:
            Beam width for beam search decoding.
        length_penalty:
            Exponential penalty applied to sequence length.
        early_stopping:
            Stop beam search when all beams reach EOS.
        no_repeat_ngram_size:
            Prevent repetition of n-grams.
        save_to_history:
            If True, persist the result to the JSON history file.

        Returns
        -------
        SummarizationResult
        """
        # ── 1. Validate ──────────────────────────────
        ok, err = validate_summarization_request(
            text=text,
            min_length=min_length,
            max_length=max_length,
            num_beams=num_beams,
            length_penalty=length_penalty,
            model_id=model_id,
            available_models=AVAILABLE_MODELS,
        )
        if not ok:
            return _make_error_result(err, model_id, text)

        # ── 2. Clean text ────────────────────────────
        text = clean_text(text)

        # ── 3. Prepend task prefix if needed (T5) ───
        cfg = AVAILABLE_MODELS[model_id]
        pipeline_input = cfg.task_prefix + text if cfg.task_prefix else text

        # ── 4. Load model & infer ─────────────────
        try:
            model, tokenizer = self._loader.get_model_and_tokenizer(model_id)
            
            # Determine the device the model is on
            device = next(model.parameters()).device

            t0 = time.perf_counter()
            
            inputs = tokenizer(pipeline_input, return_tensors="pt", max_length=cfg.max_input_tokens, truncation=True).to(device)
            
            outputs = model.generate(
                **inputs,
                min_length=min_length,
                max_length=max_length,
                num_beams=num_beams,
                length_penalty=length_penalty,
                early_stopping=early_stopping,
                no_repeat_ngram_size=no_repeat_ngram_size,
            )
            
            summary = tokenizer.decode(outputs[0], skip_special_tokens=True).strip()
            
            inference_time = time.perf_counter() - t0

        except Exception as exc:
            logger.exception("Summarization failed for model '%s': %s", model_id, exc)
            return _make_error_result(str(exc), model_id, text)

        # ── 5. Compute metrics ───────────────────────
        result = SummarizationResult(
            success=True,
            summary=summary,
            error="",
            model_id=model_id,
            input_text=text,
            input_word_count=count_words(text),
            input_char_count=len(text),
            output_word_count=count_words(summary),
            output_char_count=len(summary),
            compression_ratio=compute_compression_ratio(text, summary),
            reduction_percent=compute_reduction_percent(text, summary),
            inference_time_s=round(inference_time, 4),
            timestamp=iso_timestamp(),
            params={
                "min_length": min_length,
                "max_length": max_length,
                "num_beams": num_beams,
                "length_penalty": length_penalty,
                "early_stopping": early_stopping,
                "no_repeat_ngram_size": no_repeat_ngram_size,
            },
        )

        logger.info(
            "Summarized %d words → %d words in %.2f s [%s]",
            result.input_word_count,
            result.output_word_count,
            result.inference_time_s,
            model_id,
        )

        # ── 6. Persist ───────────────────────────────
        if save_to_history and result.success:
            save_history_entry(result.to_dict())

        return result

    # ──────────────────────────────────────────
    # BATCH SUMMARIZATION
    # ──────────────────────────────────────────

    def summarize_batch(
        self,
        texts: list[str],
        model_id: str,
        **kwargs,
    ) -> list[SummarizationResult]:
        """
        Summarise a list of texts sequentially.
        Passes all *kwargs* to each summarize() call.
        History is not saved per-item in batch mode.
        """
        results = []
        for i, text in enumerate(texts, start=1):
            logger.info("Batch item %d/%d", i, len(texts))
            result = self.summarize(
                text,
                model_id=model_id,
                save_to_history=False,
                **kwargs,
            )
            results.append(result)
        return results
