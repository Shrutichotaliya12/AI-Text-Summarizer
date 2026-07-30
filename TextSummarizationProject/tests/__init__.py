"""
tests/__init__.py
-----------------
Makes tests a proper Python package so pytest discovers them correctly.
Adds the project root to sys.path so imports work without installation.
"""

import sys
from pathlib import Path

# Ensure the project root is on sys.path when running pytest from any directory
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))
