"""
tests/test_services.py
-----------------------
Unit tests for the services layer.
Uses mocking to avoid loading actual transformer models during CI.
"""

from __future__ import annotations

import pytest
from unittest.mock import MagicMock, patch

from services.summarization_service import SummarizationService, SummarizationResult
from services.rouge_service import RougeService, RougeScores
from services.performance_service import PerformanceService


# ──────────────────────────────────────────────
# SUMMARIZATION SERVICE
# ──────────────────────────────────────────────

class TestSummarizationService:
    """Tests for SummarizationService.summarize()."""

    def _make_mock_loader(self, summary_text: str = "This is a mock summary."):
        """Create a ModelLoader mock that returns a fake model and tokenizer."""
        mock_model = MagicMock()
        mock_model.generate.return_value = [[1, 2, 3]]
        
        # mock device for next(model.parameters()).device
        mock_param = MagicMock()
        mock_param.device = "cpu"
        mock_model.parameters.return_value = iter([mock_param])

        mock_tokenizer = MagicMock()
        mock_tokenizer.return_value = {"input_ids": [[4, 5, 6]]}
        mock_tokenizer.return_value.to = MagicMock(return_value={"input_ids": [[4, 5, 6]]})
        mock_tokenizer.decode.return_value = summary_text

        mock_loader = MagicMock()
        mock_loader.get_model_and_tokenizer.return_value = (mock_model, mock_tokenizer)
        return mock_loader

    def _long_text(self, words: int = 60) -> str:
        return ("The quick brown fox jumps over the lazy dog. " * words)

    def test_successful_summarization(self):
        loader = self._make_mock_loader("A concise summary.")
        svc    = SummarizationService(loader=loader)
        text   = self._long_text()

        result = svc.summarize(
            text=text,
            model_id="facebook/bart-large-cnn",
            save_to_history=False,
        )

        assert result.success is True
        assert result.summary == "A concise summary."
        assert result.error   == ""
        assert result.model_id == "facebook/bart-large-cnn"
        assert result.input_word_count > 0
        assert result.inference_time_s >= 0

    def test_invalid_text_too_short(self):
        loader = self._make_mock_loader()
        svc    = SummarizationService(loader=loader)

        result = svc.summarize(
            text="Too short",
            model_id="facebook/bart-large-cnn",
            save_to_history=False,
        )
        assert result.success is False
        assert result.error != ""

    def test_invalid_model_id(self):
        loader = self._make_mock_loader()
        svc    = SummarizationService(loader=loader)

        result = svc.summarize(
            text=self._long_text(),
            model_id="nonexistent-model-xyz",
            save_to_history=False,
        )
        assert result.success is False

    def test_min_max_length_validation(self):
        loader = self._make_mock_loader()
        svc    = SummarizationService(loader=loader)

        result = svc.summarize(
            text=self._long_text(),
            model_id="facebook/bart-large-cnn",
            min_length=200,
            max_length=50,   # max < min → invalid
            save_to_history=False,
        )
        assert result.success is False

    def test_pipeline_exception_returns_error_result(self):
        mock_loader   = MagicMock()
        mock_loader.get_model_and_tokenizer.side_effect = RuntimeError("CUDA OOM")
        svc = SummarizationService(loader=mock_loader)

        result = svc.summarize(
            text=self._long_text(),
            model_id="facebook/bart-large-cnn",
            save_to_history=False,
        )
        assert result.success is False
        assert "CUDA OOM" in result.error

    def test_compression_ratio_is_computed(self):
        loader = self._make_mock_loader("Short summary text.")
        svc    = SummarizationService(loader=loader)

        result = svc.summarize(
            text=self._long_text(words=100),
            model_id="facebook/bart-large-cnn",
            save_to_history=False,
        )
        assert result.success is True
        assert 0.0 < result.compression_ratio < 1.0
        assert 0.0 < result.reduction_percent < 100.0

    def test_result_to_dict(self):
        loader = self._make_mock_loader("A summary.")
        svc    = SummarizationService(loader=loader)
        result = svc.summarize(
            text=self._long_text(),
            model_id="facebook/bart-large-cnn",
            save_to_history=False,
        )
        d = result.to_dict()
        assert "summary"     in d
        assert "model_id"    in d
        assert "timestamp"   in d
        assert "compression_ratio" in d

    def test_batch_summarize(self):
        loader = self._make_mock_loader("Batch summary.")
        svc    = SummarizationService(loader=loader)
        texts  = [self._long_text()] * 3

        results = svc.summarize_batch(
            texts=texts,
            model_id="facebook/bart-large-cnn",
        )
        assert len(results) == 3
        for r in results:
            assert r.success is True


# ──────────────────────────────────────────────
# ROUGE SERVICE
# ──────────────────────────────────────────────

class TestRougeService:
    """Tests for RougeService."""

    @pytest.fixture()
    def svc(self):
        return RougeService()

    def test_evaluate_identical_texts(self, svc):
        if svc._scorer is None:
            pytest.skip("rouge_score not installed")
        text = "The cat sat on the mat."
        scores, err = svc.evaluate(text, text)
        assert err == ""
        assert scores is not None
        assert scores.rouge1_f == pytest.approx(1.0, abs=0.01)

    def test_evaluate_empty_prediction(self, svc):
        scores, err = svc.evaluate("", "some reference")
        assert scores is None
        assert err != ""

    def test_evaluate_empty_reference(self, svc):
        scores, err = svc.evaluate("some prediction", "")
        assert scores is None
        assert err != ""

    def test_batch_evaluate(self, svc):
        if svc._scorer is None:
            pytest.skip("rouge_score not installed")
        preds = ["The cat sat.", "Machine learning is great."]
        refs  = ["The cat sat on the mat.", "ML is an amazing field."]
        agg, err = svc.evaluate_batch(preds, refs)
        assert err == ""
        assert agg is not None
        assert agg.sample_count == 2
        assert 0.0 <= agg.rouge1_mean <= 1.0

    def test_batch_mismatched_lengths(self, svc):
        agg, err = svc.evaluate_batch(["pred"], ["ref1", "ref2"])
        assert agg is None
        assert "length" in err.lower()

    def test_build_report(self, svc):
        if svc._scorer is None:
            pytest.skip("rouge_score not installed")
        scores = RougeScores(
            rouge1_f=0.45, rouge1_p=0.5, rouge1_r=0.4,
            rouge2_f=0.20, rouge2_p=0.25, rouge2_r=0.18,
            rougeL_f=0.38, rougeL_p=0.42, rougeL_r=0.35,
        )
        report = svc.build_report(scores)
        assert len(report) == 3
        metrics = [r["metric"] for r in report]
        assert "ROUGE1" in metrics
        assert "ROUGE2" in metrics
        assert "ROUGEL" in metrics


# ──────────────────────────────────────────────
# PERFORMANCE SERVICE
# ──────────────────────────────────────────────

class TestPerformanceService:
    """Tests for PerformanceService."""

    @pytest.fixture()
    def svc(self):
        return PerformanceService()

    def test_snapshot(self, svc):
        snap = svc.snapshot()
        assert snap.cpu_percent >= 0
        assert snap.ram_used_mb > 0
        assert snap.ram_total_mb > 0
        assert snap.timestamp != ""

    def test_record(self, svc):
        metrics = svc.record(
            model_id="test-model",
            input_words=300,
            output_words=80,
            input_tokens=420,
            output_tokens=110,
            inference_time_s=3.5,
        )
        assert metrics.model_id == "test-model"
        assert metrics.tokens_per_second > 0
        assert len(svc.get_history()) == 1

    def test_clear_history(self, svc):
        svc.record(
            model_id="m",
            input_words=100, output_words=30,
            input_tokens=140, output_tokens=45,
            inference_time_s=1.0,
        )
        svc.clear_history()
        assert svc.get_history() == []

    def test_aggregate(self, svc):
        for i in range(5):
            svc.record(
                model_id="m",
                input_words=200, output_words=50,
                input_tokens=280, output_tokens=70,
                inference_time_s=float(i + 1),
            )
        agg = svc.aggregate()
        assert agg["total_runs"] == 5
        assert agg["avg_time_s"] == pytest.approx(3.0, abs=0.01)

    def test_history_as_dicts(self, svc):
        svc.record(
            model_id="m",
            input_words=200, output_words=50,
            input_tokens=280, output_tokens=70,
            inference_time_s=2.0,
        )
        dicts = svc.history_as_dicts()
        assert len(dicts) == 1
        assert "model_id" in dicts[0]
        assert "inference_time_s" in dicts[0]
