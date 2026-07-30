"""
models/model_loader.py
----------------------
Central model registry and lazy-loading cache.

Design:
  - ModelLoader is a singleton that holds one loaded pipeline per model ID.
  - Models are loaded on first use and stored in session-scoped memory.
  - Supports T5 and BART family models via HuggingFace Transformers pipelines.
  - Provides a get_pipeline() method that always returns a ready-to-use pipeline.
"""

from __future__ import annotations

import gc
import time
from typing import Dict, Optional

from utils.logger import get_logger
from config import AVAILABLE_MODELS, CACHE_DIR

logger = get_logger(__name__)


class ModelLoader:
    """
    Thread-safe singleton model registry.

    Usage::

        loader = ModelLoader.instance()
        pipeline = loader.get_pipeline("facebook/bart-large-cnn")
        result = pipeline("Some text...", max_length=200, ...)
    """

    _instance: Optional["ModelLoader"] = None
    _pipelines: Dict[str, object] = {}

    def __new__(cls) -> "ModelLoader":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._pipelines = {}
            logger.info("ModelLoader singleton created.")
        return cls._instance

    @classmethod
    def instance(cls) -> "ModelLoader":
        """Return (or create) the singleton instance."""
        return cls()

    # ──────────────────────────────────────────
    # PUBLIC API
    # ──────────────────────────────────────────

    def get_model_and_tokenizer(self, model_id: str):
        """
        Return a tuple of (model, tokenizer) for *model_id*.
        Loads and caches the model on first call; subsequent calls return
        the cached instance.
        """
        if model_id not in self._pipelines:
            self._pipelines[model_id] = self._load_model_and_tokenizer(model_id)
        return self._pipelines[model_id]

    def is_loaded(self, model_id: str) -> bool:
        """Return True if *model_id* is already in memory."""
        return model_id in self._pipelines

    def loaded_models(self):
        """Return the list of currently cached model IDs."""
        return list(self._pipelines.keys())

    def unload_model(self, model_id: str) -> bool:
        """
        Remove a model from the cache and free GPU/CPU memory.
        Returns True if the model was present.
        """
        if model_id in self._pipelines:
            del self._pipelines[model_id]
            gc.collect()
            try:
                import torch
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
            except ImportError:
                pass
            logger.info("Unloaded model: %s", model_id)
            return True
        return False

    def unload_all(self) -> None:
        """Unload every cached model."""
        for model_id in list(self._pipelines.keys()):
            self.unload_model(model_id)

    # ──────────────────────────────────────────
    # PRIVATE
    # ──────────────────────────────────────────

    @staticmethod
    def _load_model_and_tokenizer(model_id: str):
        """
        Load a HuggingFace Seq2Seq model and tokenizer.
        """
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

        logger.info("Loading model: %s", model_id)
        t0 = time.perf_counter()

        device = ModelLoader._select_device()
        device_map = "auto" if device == 0 else ("mps" if device == "mps" else "cpu")

        tokenizer = AutoTokenizer.from_pretrained(model_id, cache_dir=str(CACHE_DIR))
        model = AutoModelForSeq2SeqLM.from_pretrained(model_id, cache_dir=str(CACHE_DIR)).to(device_map if device_map != "auto" else "cuda")

        elapsed = time.perf_counter() - t0
        logger.info(
            "Model '%s' loaded in %.2f s on device=%s",
            model_id,
            elapsed,
            device_map,
        )
        return model, tokenizer

    @staticmethod
    def _select_device():
        """Return the best available device identifier."""
        try:
            import torch

            if torch.cuda.is_available():
                logger.info("Using CUDA GPU for inference.")
                return 0
            if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                logger.info("Using Apple MPS for inference.")
                return "mps"
        except ImportError:
            pass

        logger.info("Using CPU for inference.")
        return -1

    @staticmethod
    def get_model_info(model_id: str) -> Dict:
        """Return metadata for a registered model ID."""
        cfg = AVAILABLE_MODELS.get(model_id)
        if cfg is None:
            return {}
        return {
            "model_id":          cfg.name,
            "display_name":      cfg.display_name,
            "description":       cfg.description,
            "max_input_tokens":  cfg.max_input_tokens,
            "min_summary_length": cfg.min_summary_length,
            "max_summary_length": cfg.max_summary_length,
        }
