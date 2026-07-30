"""
models/__init__.py
------------------
Makes models a proper Python package and re-exports public symbols.
"""

from models.model_loader import ModelLoader
from models.t5_model import T5Model, T5SummarizationResult
from models.bart_model import BARTModel, BARTSummarizationResult

__all__ = [
    "ModelLoader",
    "T5Model",
    "T5SummarizationResult",
    "BARTModel",
    "BARTSummarizationResult",
]
