"""
services/__init__.py
--------------------
Makes services a proper Python package and re-exports public symbols.
"""

from services.summarization_service import SummarizationService, SummarizationResult
from services.dataset_service import (
    DatasetSample,
    load_cnn_dailymail,
    load_xsum,
    load_local_dataset,
    samples_to_dataframe,
    compute_dataset_stats,
    compute_word_frequency,
)
from services.rouge_service import RougeService, RougeScores, AggregatedRouge
from services.performance_service import (
    PerformanceService,
    InferenceMetrics,
    SystemSnapshot,
)

__all__ = [
    # Summarization
    "SummarizationService",
    "SummarizationResult",
    # Dataset
    "DatasetSample",
    "load_cnn_dailymail",
    "load_xsum",
    "load_local_dataset",
    "samples_to_dataframe",
    "compute_dataset_stats",
    "compute_word_frequency",
    # ROUGE
    "RougeService",
    "RougeScores",
    "AggregatedRouge",
    # Performance
    "PerformanceService",
    "InferenceMetrics",
    "SystemSnapshot",
]
