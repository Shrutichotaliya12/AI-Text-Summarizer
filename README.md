<div align="center">

# 🧠 AI Text Summarizer Pro

### Enterprise-Grade AI Document Intelligence Platform

[![CI/CD](https://github.com/Shrutichotaliya12/AI-Text-Summarizer/actions/workflows/deploy.yml/badge.svg)](https://github.com/Shrutichotaliya12/AI-Text-Summarizer/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](CHANGELOG.md)
[![Python](https://img.shields.io/badge/Python-3.11-blue)](https://python.org)
[![React](https://img.shields.io/badge/React-19-61DAFB)](https://react.dev)

**AI Text Summarizer Pro** is a full-stack, production-ready AI platform for intelligent document understanding, text summarization, ROUGE evaluation, and multi-document chat — built with FastAPI, React 19, and state-of-the-art HuggingFace NLP models.

[Live Demo](http://localhost:3000) · [API Docs](https://ai-text-summarizer-backend-qpqk.onrender.com/docs) · [Report Bug](https://github.com/Shrutichotaliya12/AI-Text-Summarizer/issues) · [Request Feature](https://github.com/Shrutichotaliya12/AI-Text-Summarizer/issues)

</div>

---

## 📸 Screenshots

> Authentication → Dashboard → Upload → Summarize → Chat → Analyze → ROUGE → Admin

---

## ✨ Features

| Module | Description |
|--------|-------------|
| **🔐 Authentication** | JWT + Refresh Token rotation, OTP email verification, Google/GitHub OAuth, 2FA |
| **📊 Dashboard** | Real-time stats, recent documents, API health status, quick actions |
| **📁 Document Upload** | PDF, DOCX, TXT support; drag-and-drop; duplicate detection; file validation |
| **✍️ AI Summarization** | Extractive + abstractive via HuggingFace Transformers; adjustable parameters |
| **💬 Document Chat** | Retrieval-augmented Q&A with document context |
| **🔬 Document Analysis** | NLP metrics: reading time, complexity, keyword extraction, sentiment |
| **📏 ROUGE Evaluation** | ROUGE-1, ROUGE-2, ROUGE-L scoring against reference summaries |
| **📈 Performance** | Charts and metrics tracking across all AI operations |
| **🗂️ History** | Full summary/document history with search, filter, export |
| **🧹 Recycle Bin** | Soft delete with 30-day auto-cleanup |
| **👤 Profile** | Full user profile management, avatar upload, security settings |
| **⚙️ Settings** | Theme, language, AI parameters, notification preferences |
| **🛡️ Admin Panel** | User management, system analytics, audit logs, role control |
| **🔔 Notification Center** | Real-time notifications, activity timeline, preference management |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React 19 Frontend                        │
│          (Vite + TypeScript + TailwindCSS + Zustand)         │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API (HTTP/JSON)
┌────────────────────────▼────────────────────────────────────┐
│                   FastAPI Backend                            │
│         (Python 3.11 + SQLAlchemy + JWT Auth)               │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │   Auth   │ │Summarize │ │   Chat   │ │  Notifications│  │
│  │  Router  │ │  Router  │ │  Router  │ │    Router    │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │  Upload  │ │ Analysis │ │  ROUGE   │ │    Admin     │  │
│  │  Router  │ │  Router  │ │  Router  │ │    Router    │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │
        ┌─────────────────┴──────────────┐
        │                                │
┌───────▼────────┐              ┌────────▼───────┐
│  SQLite (dev)  │              │ HuggingFace AI  │
│ PostgreSQL     │              │    Models       │
│   (prod)       │              │  (Transformers) │
└────────────────┘              └────────────────┘
```

---

## 🚀 Quick Start

### Option 1 — Docker (Recommended)

```bash
# Clone repository
git clone https://github.com/Shrutichotaliya12/AI-Text-Summarizer.git
cd AI-Text-Summarizer

# Copy and configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your settings

# Start all services
docker-compose up -d

# Access:
# Frontend → http://localhost:3000
# API      → http://localhost:8000
# API Docs → http://localhost:8000/docs
```

### Option 2 — Local Development

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate     # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

---

## 🔧 Environment Variables

See [`backend/.env.example`](backend/.env.example) for the full reference.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | **YES** (prod) | dev-secret | Signing key for JWT tokens |
| `ENVIRONMENT` | YES | `development` | `development` \| `production` |
| `DATABASE_URL` | NO | SQLite | PostgreSQL connection string |
| `ALLOWED_ORIGINS` | YES (prod) | `*` | Comma-separated CORS origins |
| `SMTP_HOST` | NO | — | SMTP server for OTP emails |
| `RATE_LIMIT_PER_MINUTE` | NO | `60` | General API rate limit |
| `AUTH_RATE_LIMIT_PER_MINUTE` | NO | `10` | Auth endpoint rate limit |

---

## 📦 Tech Stack

### Backend
- **FastAPI** 0.110+ — High-performance ASGI web framework
- **SQLAlchemy** 2.0 — ORM with SQLite (dev) / PostgreSQL (prod)
- **HuggingFace Transformers** — BART, T5, DistilBART for summarization
- **python-jose** — JWT authentication
- **passlib** (PBKDF2-SHA256) — Secure password hashing
- **GZip Middleware** — Automatic response compression

### Frontend
- **React 19** — UI framework
- **TypeScript** — Type safety
- **Vite 5** — Build tool with code splitting
- **TailwindCSS** — Utility-first styling
- **Framer Motion** — Animations
- **Zustand** — State management
- **Lucide React** — Icons
- **React Router 6** — Client-side routing

### Infrastructure
- **Docker** + **Docker Compose** — Containerization
- **Nginx** — Frontend serving + reverse proxy
- **GitHub Actions** — CI/CD pipeline
- **PostgreSQL 15** — Production database
- **Redis 7** — Caching and task queue

---

## 📁 Project Structure

```
ai-text-summarizer-pro/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD pipeline
├── backend/
│   ├── app/
│   │   ├── features/           # Feature-based modules
│   │   │   ├── authentication/
│   │   │   ├── summarization/
│   │   │   ├── chat/
│   │   │   ├── document_upload/
│   │   │   ├── document_analysis/
│   │   │   ├── rouge/
│   │   │   ├── analytics/
│   │   │   ├── history/
│   │   │   ├── models/
│   │   │   ├── admin/
│   │   │   └── notifications/
│   │   ├── infrastructure/
│   │   │   ├── config.py       # App configuration
│   │   │   └── logger.py       # Structured JSON logger
│   │   ├── shared/
│   │   │   ├── database.py     # DB engine + session
│   │   │   └── models.py       # SQLAlchemy ORM models
│   │   └── main.py             # FastAPI app entrypoint
│   ├── tests/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/                # API client layer
│   │   ├── components/         # Shared UI components
│   │   ├── presentation/
│   │   │   ├── layout/         # DashboardLayout
│   │   │   ├── pages/          # All route pages
│   │   │   └── router/         # React Router config
│   │   └── state/              # Zustand stores
│   ├── Dockerfile
│   ├── nginx.conf
│   └── vite.config.ts
├── docker-compose.yml          # Production
├── docker-compose.dev.yml      # Development
└── README.md
```

---

## 🔐 Security

- JWT access tokens (1 week) + refresh token rotation (30 days)
- HTTP-only secure cookies for refresh tokens
- PBKDF2-SHA256 password hashing
- OTP email verification (5-minute expiry)
- Rate limiting: 10 req/min (auth), 60 req/min (API)
- Security headers: HSTS, X-Frame-Options, CSP, Referrer-Policy
- Admin role enforcement on protected routes
- Soft delete with audit trails
- See [SECURITY.md](SECURITY.md) for full security documentation

---

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest tests/ -v

# Frontend type-check
cd frontend
npx tsc --noEmit
npm run build
```

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [DEPLOYMENT.md](DEPLOYMENT.md) | Complete deployment guide |
| [API_DOCS.md](API_DOCS.md) | Full API endpoint reference |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture |
| [SECURITY.md](SECURITY.md) | Security policies |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution guide |
| [CHANGELOG.md](CHANGELOG.md) | Version history |

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

---

## 👩‍💻 Author

**Shruti Chotaliya**
- GitHub: [@Shrutichotaliya12](https://github.com/Shrutichotaliya12)

## 🎓 Academic Note

This project was developed as a Final Year Computer Science Project demonstrating:
- Full-stack enterprise web application development
- Integration of state-of-the-art NLP/AI models
- Production-ready software engineering practices
- Security-first architecture and design
