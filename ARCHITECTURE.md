# Architecture Overview — AI Text Summarizer Pro

## System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        USER (Browser)                                  │
└───────────────────────────┬────────────────────────────────────────────┘
                            │ HTTPS
                ┌───────────▼────────────┐
                │    Nginx Reverse Proxy  │
                │  (SSL termination,      │
                │   static file serving)  │
                └──┬─────────────────┬───┘
                   │                 │
        ┌──────────▼──┐    ┌─────────▼──────────┐
        │  React 19   │    │   FastAPI Backend   │
        │  (SPA,      │    │   Port 8000         │
        │  Port 3000) │    │   Python 3.11       │
        └─────────────┘    └──┬──────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
    ┌─────────▼────┐  ┌──────▼──────┐  ┌────▼──────────────┐
    │ SQLite (dev) │  │ PostgreSQL  │  │  HuggingFace AI   │
    │    or        │  │  (prod)     │  │  Models (local)   │
    │ PostgreSQL 15│  │  Port 5432  │  │  BART, T5, etc.   │
    └──────────────┘  └─────────────┘  └───────────────────┘
```

---

## Backend Architecture — Feature-Based Modules

```
app/
├── main.py                    # FastAPI app: middleware, routers, health
├── infrastructure/
│   ├── config.py              # Pydantic Settings (env vars, validation)
│   └── logger.py              # Structured JSON logger
├── shared/
│   ├── database.py            # SQLAlchemy engine + session + connection pool
│   └── models.py              # All ORM models (15 tables)
└── features/
    ├── authentication/        # JWT, OTP, OAuth, sessions, password, profile
    ├── summarization/         # AI text summarization via Transformers
    ├── document_upload/       # File upload, validation, storage
    ├── chat/                  # RAG-based document Q&A
    ├── document_analysis/     # NLP metrics (readability, sentiment, keywords)
    ├── rouge/                 # ROUGE-1, ROUGE-2, ROUGE-L evaluation
    ├── analytics/             # Dataset and usage analytics
    ├── history/               # Summary and document history
    ├── models/                # AI model catalog and management
    ├── admin/                 # Admin panel, user management, audit logs
    └── notifications/         # Real-time notifications, activity timeline
```

### Key Design Patterns

| Pattern | Where Used |
|---------|-----------|
| Feature-based modules | All routers — each feature is self-contained |
| Dependency Injection | `get_db()` and `get_current_user()` injected per-request |
| Repository Pattern | DB queries always scoped to `user_id` (no cross-user leakage) |
| Middleware Chain | GZip → CORS → Rate Limiter → Security Headers → Business Logic |
| Structured Logging | All requests and errors logged as JSON |

---

## Frontend Architecture — Presentation Layer

```
src/
├── api/
│   └── index.ts               # Axios client with auth interceptors
├── state/
│   └── index.ts               # Zustand global store
├── components/
│   └── ui/                    # Shared reusable UI components
│       ├── Card.tsx
│       ├── Badge.tsx
│       ├── ProgressBar.tsx
│       └── Models/
├── presentation/
│   ├── layout/
│   │   └── DashboardLayout.tsx # App shell: sidebar, header, notifications
│   ├── pages/                  # Route-level page components
│   │   ├── Auth.tsx
│   │   ├── Home.tsx
│   │   ├── DocumentUpload.tsx
│   │   ├── DocChat.tsx
│   │   ├── DocumentAnalysis.tsx
│   │   ├── ROUGEEvaluation.tsx
│   │   ├── Performance.tsx
│   │   ├── SummaryHistory.tsx
│   │   ├── Trash.tsx
│   │   ├── Profile.tsx
│   │   ├── SettingsPage.tsx
│   │   ├── AdminPanel.tsx
│   │   ├── NotificationCenter.tsx
│   │   └── AboutProject.tsx
│   └── router/
│       └── index.tsx           # React Router with lazy loading
└── index.css                   # Design system tokens + utilities
```

### State Management

| State | Tool | Where |
|-------|------|-------|
| Auth token | Zustand + localStorage | `state/index.ts` |
| User profile | Zustand | `state/index.ts` |
| API client | Axios singleton | `api/index.ts` |
| Page state | React `useState` | Per component |
| Form state | React Hook Form | Upload, Auth pages |

---

## Database Schema (SQLite / PostgreSQL)

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `users` | Authentication | email, hashed_password, is_verified, otp_secret |
| `profiles` | User metadata | user_id, name, bio, company, avatar_data |
| `user_settings` | Preferences | user_id, theme, language, model_id, notification flags |
| `documents` | Uploaded files | user_id, filename, content, word_count, deleted_at |
| `summaries` | AI outputs | user_id, document_id, summary_text, model_used |
| `chat_sessions` | Q&A sessions | user_id, document_id, title |
| `chat_messages` | Q&A history | chat_id, role, content |
| `rouge_reports` | ROUGE scores | user_id, rouge1/2/L, reference, hypothesis |
| `activity_logs` | Audit trail | user_id, action, module, device, browser, ip_address |
| `login_history` | Session history | user_id, browser, os, country, ip_address |
| `refresh_tokens` | Session store | user_id, token, device_info, expires_at, is_revoked |
| `password_history` | Reuse prevention | user_id, hashed_password |
| `notifications` | Alerts | user_id, title, message, priority, is_read, is_archived |

### Entity Relationships

```
User (1) ──── (N) Document
User (1) ──── (N) Summary
User (1) ──── (N) ChatSession
ChatSession (1) ── (N) ChatMessage
User (1) ──── (N) Notification
User (1) ──── (N) ActivityLog
User (1) ──── (N) RefreshToken
User (1) ──── (1) Profile
User (1) ──── (1) UserSettings
```

---

## Security Architecture

```
Request →
  [Rate Limiter: 10/min auth, 60/min API]
    → [CORS: origin allowlist]
      → [JWT Validation: bearer token]
        → [Role Check: user/admin]
          → [DB Query: scoped to user_id]
            → Response
              → [Security Headers: HSTS, X-Frame, etc.]
                → [GZip Compression]
```

---

## AI Processing Pipeline

```
User submits text/document
        │
        ▼
Input validation (Pydantic)
        │
        ▼
Model selection (BART / T5 / DistilBART)
        │
        ▼
HuggingFace Transformers pipeline()
        │
        ▼
Post-processing (trim, decode)
        │
        ▼
Store to DB (summaries table)
        │
        ▼
Return to user + optional ROUGE evaluation
```

---

## Middleware Stack (Order Matters)

```
1. GZipMiddleware          → compress large responses
2. CORSMiddleware          → allow configured origins
3. request_middleware()    → rate limiting, security headers, logging
4. exception_handler()     → catch and format all errors
5. Router                  → feature business logic
```

---

## Deployment Architecture

```
[GitHub] ──push──► [GitHub Actions CI/CD]
                         │
            ┌────────────┼────────────┐
            ▼            ▼            ▼
     Frontend CI    Backend CI   Security Scan
      (tsc + build) (pytest)    (safety + bandit)
            │
            ▼ (on tag v*)
     [Docker Build & Push → GHCR]
            │
            ▼
     [Docker Compose on Production Server]
     ┌──────────────────────────────────┐
     │  nginx (frontend:80)             │
     │  uvicorn (backend:8000)          │
     │  postgres (5432)                 │
     │  redis (6379)                    │
     └──────────────────────────────────┘
```
