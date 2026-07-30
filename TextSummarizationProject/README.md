# Text Summarization using Transformers

<div align="center">

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python)
![Streamlit](https://img.shields.io/badge/Streamlit-1.32+-FF4B4B?style=for-the-badge&logo=streamlit)
![HuggingFace](https://img.shields.io/badge/🤗-HuggingFace-FFD21E?style=for-the-badge)
![PyTorch](https://img.shields.io/badge/PyTorch-2.2+-EE4C2C?style=for-the-badge&logo=pytorch)

A production-ready **abstractive text summarization** application powered by
state-of-the-art Transformer models (T5, BART) with a beautiful Streamlit UI.

</div>

---

## 🌟 Features

| Feature | Description |
|---|---|
| **Multi-Model Summarization** | T5-Small, T5-Base, BART-Large-CNN, DistilBART |
| **Configurable Parameters** | Beam width, min/max length, length penalty, n-gram blocking |
| **File Upload Support** | TXT, PDF, CSV, JSON, JSONL |
| **ROUGE Evaluation** | Single-pair and batch ROUGE-1/2/L/Lsum scoring |
| **Dataset Analysis** | CNN/DailyMail & XSum with distribution charts |
| **Performance Monitor** | CPU, RAM, GPU VRAM, tokens/second |
| **History & Export** | JSON history with TXT/JSON/CSV export |
| **Dark Mode UI** | Premium dark theme with gradient accents |

---

## 📁 Project Structure

```
TextSummarizationProject/
│
├── main.py                    # App entry-point (streamlit run main.py)
├── config.py                  # Central configuration (paths, models, theme)
├── requirements.txt
├── README.md
├── .gitignore
├── setup.py
│
├── assets/
│   ├── css/
│   ├── icons/
│   └── images/
│
├── pages/                     # Streamlit UI pages
│   ├── home.py
│   ├── summarizer.py
│   ├── dataset_analysis.py
│   ├── rouge_evaluation.py
│   ├── performance.py
│   ├── settings.py
│   └── about.py
│
├── models/                    # HuggingFace model wrappers
│   ├── model_loader.py        # Singleton pipeline cache
│   ├── t5_model.py
│   └── bart_model.py
│
├── services/                  # Business logic layer
│   ├── summarization_service.py
│   ├── dataset_service.py
│   ├── rouge_service.py
│   └── performance_service.py
│
├── utils/                     # Pure utility functions
│   ├── logger.py
│   ├── helpers.py
│   ├── validators.py
│   ├── constants.py
│   └── file_manager.py
│
├── data/
│   ├── dataset/
│   ├── cache/               # Model download cache + dataset JSON cache
│   ├── downloads/
│   ├── output/              # Exported summary files
│   └── history/             # summarization_history.json
│
├── logs/                    # Rotating log files
├── tests/                   # pytest test suite
└── docs/
```

---

## 🚀 Installation

### 1. Clone / download the project

```bash
git clone <repo-url>
cd TextSummarizationProject
```

### 2. Create a virtual environment (recommended)

```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# macOS / Linux
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

> **GPU users:** Replace the PyTorch line in `requirements.txt` with the CUDA wheel:
> ```bash
> pip install torch --index-url https://download.pytorch.org/whl/cu121
> ```

### 4. Run the application

```bash
streamlit run main.py
```

The app will open at **http://localhost:8501** in your default browser.

---

## 🖥️ Usage

### Summarizer Page
1. Select a model from the sidebar (BART-Large-CNN recommended for news)
2. Adjust generation parameters (beam width, min/max length)
3. Paste text or upload a file
4. Click **Generate Summary**
5. View the summary, word counts, and compression ratio
6. Optionally paste a reference summary to compute ROUGE scores

### ROUGE Evaluation
- **Single Pair**: Compare one generated summary against a reference
- **Batch**: Run the full pipeline on CNN/DailyMail or XSum and compute aggregate scores

### Dataset Analysis
- Load CNN/DailyMail or XSum with configurable sample size
- View length distributions, word frequencies, and sample previews

### Performance Monitor
- Live CPU / RAM gauges
- Inference time and tokens/second charts over runs
- Per-model comparison table

---

## 📦 Key Dependencies

| Package | Version | Purpose |
|---|---|---|
| `streamlit` | ≥ 1.32 | UI framework |
| `transformers` | ≥ 4.38 | T5 & BART inference |
| `torch` | ≥ 2.2 | Deep learning backend |
| `datasets` | ≥ 2.18 | HuggingFace dataset loading |
| `rouge-score` | ≥ 0.1.2 | ROUGE metric computation |
| `pandas` | ≥ 2.2 | Data manipulation |
| `psutil` | ≥ 5.9 | System resource monitoring |
| `PyMuPDF` | ≥ 1.23 | PDF text extraction |
| `colorlog` | ≥ 6.8 | Coloured console logging |

---

## 🔧 Troubleshooting

| Problem | Solution |
|---|---|
| `ModuleNotFoundError: transformers` | Run `pip install -r requirements.txt` |
| Model download fails | Check internet connection; models are ~1-6 GB |
| `OSError: [Errno 28] No space left` | Free disk space; models cache to `data/cache/` |
| Slow inference | Use `t5-small` or `distilbart-cnn-12-6`; add GPU for 5-10× speedup |
| `rouge_score not installed` | Run `pip install rouge-score` |
| PDF extraction fails | Run `pip install PyMuPDF` |
| Port 8501 already in use | `streamlit run main.py --server.port 8502` |

---

## 🏗️ Architecture

The project follows **Clean Architecture** and **SOLID** principles:

- **Config layer** (`config.py`) — single source of truth, no circular deps
- **Utils layer** — pure functions, no Streamlit or model imports
- **Models layer** — thin wrappers around HuggingFace; singleton loader
- **Services layer** — business logic; depends on models + utils only
- **Pages layer** — Streamlit UI; depends on services + utils only
- **main.py** — wires everything together, no business logic

---

## 🧪 Running Tests

```bash
# From the project root
pytest tests/ -v

# With coverage report
pytest tests/ -v --cov=. --cov-report=term-missing
```

---

## 📄 License

MIT License — see `LICENSE` file for details.

---

<div align="center">Built with ❤️ using Streamlit & HuggingFace Transformers</div>
