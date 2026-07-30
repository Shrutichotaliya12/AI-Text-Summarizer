"""
tests/test_models.py
---------------------
Unit tests for model-layer code that can be tested without
loading actual transformer weights.

The ModelLoader singleton, T5Model, and BARTModel are tested
with mocked transformers to keep CI fast.
"""

from __future__ import annotations

import pytest
from unittest.mock import MagicMock, patch, PropertyMock


# ──────────────────────────────────────────────
# MODEL LOADER
# ──────────────────────────────────────────────

class TestModelLoader:
    """Tests for the ModelLoader singleton."""

    def test_singleton_identity(self):
        from models.model_loader import ModelLoader
        a = ModelLoader.instance()
        b = ModelLoader.instance()
        assert a is b

    def test_is_loaded_false_initially(self):
        from models.model_loader import ModelLoader
        loader = ModelLoader.instance()
        # Use a unique fake ID to avoid collision with any real run
        assert loader.is_loaded("fake-model-xyz-not-real") is False

    def test_get_model_info_valid(self):
        from models.model_loader import ModelLoader
        info = ModelLoader.get_model_info("facebook/bart-large-cnn")
        assert info["model_id"] == "facebook/bart-large-cnn"
        assert "max_input_tokens" in info
        assert "display_name" in info

    def test_get_model_info_unknown(self):
        from models.model_loader import ModelLoader
        info = ModelLoader.get_model_info("unknown-model")
        assert info == {}

    def test_loaded_models_returns_list(self):
        from models.model_loader import ModelLoader
        loader = ModelLoader.instance()
        assert isinstance(loader.loaded_models(), list)

    def test_unload_nonexistent_returns_false(self):
        from models.model_loader import ModelLoader
        loader = ModelLoader.instance()
        result = loader.unload_model("definitely-not-loaded-xyz")
        assert result is False

    def test_get_pipeline_caches_result(self):
        """Calling get_pipeline twice should only load once."""
        from models.model_loader import ModelLoader

        # Fresh loader for isolation
        loader = ModelLoader()
        loader._pipelines = {}  # clear cache

        with patch("models.model_loader.ModelLoader._load_pipeline") as mock_load:
            mock_load.return_value = MagicMock()
            loader.get_pipeline("t5-small")
            loader.get_pipeline("t5-small")
            assert mock_load.call_count == 1


# ──────────────────────────────────────────────
# T5 MODEL WRAPPER
# ──────────────────────────────────────────────

class TestT5Model:
    """Tests for T5Model wrapper (mocked tokenizer/model)."""

    def _make_t5(self, model_id="t5-small"):
        from models.t5_model import T5Model
        m = T5Model(model_id=model_id, device="cpu")
        return m

    def test_invalid_model_id(self):
        from models.t5_model import T5Model
        with pytest.raises(ValueError, match="not a supported T5"):
            T5Model(model_id="facebook/bart-large-cnn")

    def test_task_prefix(self):
        m = self._make_t5("t5-small")
        assert m._task_prefix == "summarize: "

    @patch("transformers.T5Tokenizer")
    @patch("transformers.T5ForConditionalGeneration")
    def test_summarize_returns_result(self, mock_model_cls, mock_tok_cls):
        import torch
        from models.t5_model import T5Model, T5SummarizationResult

        # Mock tokenizer
        mock_tokenizer = MagicMock()
        mock_tokenizer.return_value = {"input_ids": torch.ones(1, 10, dtype=torch.long)}
        mock_tokenizer.decode.return_value = "Mock T5 summary."
        mock_tok_cls.from_pretrained.return_value = mock_tokenizer

        # Mock model
        mock_model = MagicMock()
        mock_model.generate.return_value = torch.ones(1, 5, dtype=torch.long)
        mock_model.eval.return_value = None
        mock_model_cls.from_pretrained.return_value = mock_model

        t5 = T5Model("t5-small", device="cpu")
        t5._tokenizer = mock_tokenizer
        t5._model     = mock_model

        result = t5.summarize("Some input text for testing.", min_length=5, max_length=30)
        assert isinstance(result, T5SummarizationResult)
        assert result.model_id == "t5-small"
        assert result.inference_time_s >= 0


# ──────────────────────────────────────────────
# BART MODEL WRAPPER
# ──────────────────────────────────────────────

class TestBARTModel:
    """Tests for BARTModel wrapper (mocked tokenizer/model)."""

    def test_invalid_model_id(self):
        from models.bart_model import BARTModel
        with pytest.raises(ValueError, match="not a supported BART"):
            BARTModel(model_id="t5-small")

    def test_valid_model_ids(self):
        from models.bart_model import BARTModel
        for mid in ["facebook/bart-large-cnn", "sshleifer/distilbart-cnn-12-6"]:
            m = BARTModel(model_id=mid)
            assert m.model_id == mid

    @patch("transformers.BartTokenizer")
    @patch("transformers.BartForConditionalGeneration")
    def test_summarize_returns_result(self, mock_model_cls, mock_tok_cls):
        import torch
        from models.bart_model import BARTModel, BARTSummarizationResult

        mock_tokenizer = MagicMock()
        mock_tokenizer.return_value = {"input_ids": torch.ones(1, 15, dtype=torch.long)}
        mock_tokenizer.decode.return_value = "Mock BART summary."
        mock_tok_cls.from_pretrained.return_value = mock_tokenizer

        mock_model = MagicMock()
        mock_model.generate.return_value = torch.ones(1, 8, dtype=torch.long)
        mock_model.eval.return_value = None
        mock_model_cls.from_pretrained.return_value = mock_model

        bart = BARTModel("facebook/bart-large-cnn", device="cpu")
        bart._tokenizer = mock_tokenizer
        bart._model     = mock_model

        result = bart.summarize("Test article for summarization.", min_length=5, max_length=50)
        assert isinstance(result, BARTSummarizationResult)
        assert result.model_id == "facebook/bart-large-cnn"
        assert result.inference_time_s >= 0
