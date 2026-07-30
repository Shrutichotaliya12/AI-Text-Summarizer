"""
models/bart_model.py
--------------------
BART-specific wrapper around HuggingFace's BartForConditionalGeneration.

Provides a higher-level summarize() method with:
  - Explicit tokenisation and decoding for full control
  - Support for facebook/bart-large-cnn and distilbart variants
  - Typed result dataclass
  - Metadata for performance tracking
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Dict

from utils.logger import get_logger
from config import AVAILABLE_MODELS, CACHE_DIR

logger = get_logger(__name__)

# BART model IDs registered in config
_BART_MODEL_IDS = {
    k for k in AVAILABLE_MODELS
    if "bart" in k.lower()
}


@dataclass
class BARTSummarizationResult:
    """Typed result object returned by BARTModel.summarize()."""
    summary: str
    model_id: str
    input_tokens: int
    output_tokens: int
    inference_time_s: float
    metadata: Dict = field(default_factory=dict)


class BARTModel:
    """
    Wrapper for BART-based summarization models.

    Parameters
    ----------
    model_id:
        One of 'facebook/bart-large-cnn' or 'sshleifer/distilbart-cnn-12-6'.
    device:
        'cpu', 'cuda', or 'mps'.  Defaults to CPU.
    """

    def __init__(
        self,
        model_id: str = "facebook/bart-large-cnn",
        device: str = "cpu",
    ) -> None:
        if model_id not in _BART_MODEL_IDS:
            raise ValueError(
                f"'{model_id}' is not a supported BART model. "
                f"Supported: {_BART_MODEL_IDS}"
            )
        self.model_id = model_id
        self.device = device
        self._tokenizer = None
        self._model = None

        cfg = AVAILABLE_MODELS[model_id]
        self._max_input_tokens = cfg.max_input_tokens

    # ──────────────────────────────────────────
    # LAZY LOAD
    # ──────────────────────────────────────────

    def _ensure_loaded(self) -> None:
        """Load tokenizer and model on first use."""
        if self._tokenizer is not None:
            return

        from transformers import BartTokenizer, BartForConditionalGeneration
        import torch

        logger.info("Loading BART tokenizer/model: %s", self.model_id)
        t0 = time.perf_counter()

        self._tokenizer = BartTokenizer.from_pretrained(
            self.model_id,
            cache_dir=str(CACHE_DIR),
        )
        self._model = BartForConditionalGeneration.from_pretrained(
            self.model_id,
            cache_dir=str(CACHE_DIR),
        )

        if self.device != "cpu":
            try:
                self._model = self._model.to(self.device)
            except Exception as exc:
                logger.warning(
                    "Could not move BART model to %s: %s. Falling back to CPU.",
                    self.device,
                    exc,
                )
                self.device = "cpu"

        self._model.eval()
        logger.info(
            "BART model '%s' ready in %.2f s.", self.model_id, time.perf_counter() - t0
        )

    # ──────────────────────────────────────────
    # PUBLIC API
    # ──────────────────────────────────────────

    def summarize(
        self,
        text: str,
        min_length: int = 56,
        max_length: int = 200,
        num_beams: int = 4,
        length_penalty: float = 2.0,
        early_stopping: bool = True,
        no_repeat_ngram_size: int = 3,
    ) -> BARTSummarizationResult:
        """
        Summarise *text* using BART beam-search decoding.

        Returns a BARTSummarizationResult with summary text and metadata.
        """
        import torch

        self._ensure_loaded()

        t0 = time.perf_counter()

        inputs = self._tokenizer(
            text.strip(),
            return_tensors="pt",
            max_length=self._max_input_tokens,
            truncation=True,
        )

        input_token_count = inputs["input_ids"].shape[1]

        if self.device != "cpu":
            inputs = {k: v.to(self.device) for k, v in inputs.items()}

        with torch.no_grad():
            output_ids = self._model.generate(
                **inputs,
                min_length=min_length,
                max_length=max_length,
                num_beams=num_beams,
                length_penalty=length_penalty,
                early_stopping=early_stopping,
                no_repeat_ngram_size=no_repeat_ngram_size,
            )

        summary = self._tokenizer.decode(output_ids[0], skip_special_tokens=True)
        elapsed = time.perf_counter() - t0

        logger.debug(
            "BART summarized %d tokens → %d tokens in %.2f s",
            input_token_count,
            output_ids.shape[1],
            elapsed,
        )

        return BARTSummarizationResult(
            summary=summary,
            model_id=self.model_id,
            input_tokens=input_token_count,
            output_tokens=output_ids.shape[1],
            inference_time_s=elapsed,
            metadata={
                "num_beams": num_beams,
                "length_penalty": length_penalty,
                "min_length": min_length,
                "max_length": max_length,
                "device": self.device,
            },
        )

    def get_token_count(self, text: str) -> int:
        """Return token count for *text* without running inference."""
        self._ensure_loaded()
        ids = self._tokenizer(
            text,
            return_tensors="pt",
            truncation=False,
        )["input_ids"]
        return ids.shape[1]
