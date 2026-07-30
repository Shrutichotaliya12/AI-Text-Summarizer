"""
models/t5_model.py
------------------
T5-specific wrapper around HuggingFace's T5ForConditionalGeneration.

Provides a higher-level summarize() method that:
  - Prepends the "summarize: " task prefix required by T5
  - Handles tokenisation and decoding explicitly for fine-grained control
  - Returns both the summary text and timing metadata
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from utils.logger import get_logger
from config import AVAILABLE_MODELS, CACHE_DIR

logger = get_logger(__name__)

# T5 model IDs registered in config
_T5_MODEL_IDS = {k for k, v in AVAILABLE_MODELS.items() if k.startswith("t5")}


@dataclass
class T5SummarizationResult:
    """Typed result object returned by T5Model.summarize()."""
    summary: str
    model_id: str
    input_tokens: int
    output_tokens: int
    inference_time_s: float
    metadata: Dict = field(default_factory=dict)


class T5Model:
    """
    Wrapper for T5ForConditionalGeneration models.

    Parameters
    ----------
    model_id:
        One of 't5-small' or 't5-base' (must be in AVAILABLE_MODELS).
    device:
        'cpu', 'cuda', or 'mps'.  Defaults to CPU.
    """

    def __init__(self, model_id: str = "t5-small", device: str = "cpu") -> None:
        if model_id not in _T5_MODEL_IDS:
            raise ValueError(
                f"'{model_id}' is not a supported T5 model. "
                f"Supported: {_T5_MODEL_IDS}"
            )
        self.model_id = model_id
        self.device = device
        self._tokenizer = None
        self._model = None

        cfg = AVAILABLE_MODELS[model_id]
        self._task_prefix = cfg.task_prefix
        self._max_input_tokens = cfg.max_input_tokens

    # ──────────────────────────────────────────
    # LAZY LOAD
    # ──────────────────────────────────────────

    def _ensure_loaded(self) -> None:
        """Load the tokenizer and model if not already in memory."""
        if self._tokenizer is not None:
            return

        from transformers import T5Tokenizer, T5ForConditionalGeneration
        import torch

        logger.info("Loading T5 tokenizer/model: %s", self.model_id)
        t0 = time.perf_counter()

        self._tokenizer = T5Tokenizer.from_pretrained(
            self.model_id,
            cache_dir=str(CACHE_DIR),
            legacy=False,
        )
        self._model = T5ForConditionalGeneration.from_pretrained(
            self.model_id,
            cache_dir=str(CACHE_DIR),
        )

        if self.device != "cpu":
            try:
                self._model = self._model.to(self.device)
            except Exception as exc:
                logger.warning("Could not move model to %s: %s. Using CPU.", self.device, exc)
                self.device = "cpu"

        self._model.eval()
        logger.info(
            "T5 model '%s' ready in %.2f s.", self.model_id, time.perf_counter() - t0
        )

    # ──────────────────────────────────────────
    # PUBLIC API
    # ──────────────────────────────────────────

    def summarize(
        self,
        text: str,
        min_length: int = 30,
        max_length: int = 150,
        num_beams: int = 4,
        length_penalty: float = 2.0,
        early_stopping: bool = True,
        no_repeat_ngram_size: int = 3,
    ) -> T5SummarizationResult:
        """
        Summarise *text* using T5 beam-search decoding.

        Returns a T5SummarizationResult with summary text and metadata.
        """
        import torch

        self._ensure_loaded()

        input_text = self._task_prefix + text.strip()
        t0 = time.perf_counter()

        inputs = self._tokenizer(
            input_text,
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
            "T5 summarized %d tokens → %d tokens in %.2f s",
            input_token_count,
            output_ids.shape[1],
            elapsed,
        )

        return T5SummarizationResult(
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
            self._task_prefix + text,
            return_tensors="pt",
            truncation=False,
        )["input_ids"]
        return ids.shape[1]
