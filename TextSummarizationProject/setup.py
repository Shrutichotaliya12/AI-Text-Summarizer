"""
setup.py
--------
Package setup for the Text Summarization project.

Allows installation in development mode:
    pip install -e .

This makes the project importable from anywhere without PYTHONPATH hacks.
"""

from setuptools import setup, find_packages
from pathlib import Path

# Read long description from README
long_description = (Path(__file__).parent / "README.md").read_text(encoding="utf-8")

# Read requirements (exclude comments and blank lines)
requirements = [
    line.strip()
    for line in (Path(__file__).parent / "requirements.txt").read_text().splitlines()
    if line.strip() and not line.startswith("#")
]

setup(
    name="text-summarization-transformers",
    version="1.0.0",
    description="Production-ready text summarization using HuggingFace Transformers and Streamlit",
    long_description=long_description,
    long_description_content_type="text/markdown",
    author="AI Engineer",
    python_requires=">=3.11",
    packages=find_packages(
        exclude=["tests", "tests.*", "docs", "screenshots", "assets"]
    ),
    install_requires=requirements,
    entry_points={
        "console_scripts": [
            "text-summarizer=main:main",
        ],
    },
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Intended Audience :: Science/Research",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
        "Topic :: Text Processing :: Linguistic",
    ],
    keywords=[
        "nlp", "text-summarization", "transformers", "huggingface",
        "t5", "bart", "streamlit", "rouge", "deep-learning"
    ],
)
