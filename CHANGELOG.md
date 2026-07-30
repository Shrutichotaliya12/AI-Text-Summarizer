# Changelog

All notable changes to **AI Text Summarizer Pro** are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [1.0.0] — 2026-07-28

### 🎉 Initial Production Release

#### Added — Core Platform
- Full JWT authentication with refresh token rotation
- OTP email verification with HTML email templates
- Google OAuth and GitHub OAuth integration
- 2FA toggle with session revocation
- Dashboard with real-time API health status and quick actions
- Text summarization via BART, T5, and DistilBART HuggingFace models
- PDF, DOCX, and TXT document upload with drag-and-drop support
- Retrieval-augmented document chat (Q&A)
- NLP document analysis (readability, sentiment, keywords, complexity)
- ROUGE-1, ROUGE-2, ROUGE-L evaluation scoring
- Performance metrics dashboard with historical charts
- Summary and document history with pagination and search
- Recycle Bin with soft delete and 30-day auto-cleanup

#### Added — User Management
- User Profile page with avatar upload, bio, and social fields
- Settings & Personalization Center (theme, language, AI preferences)
- Session management with device/browser tracking
- Login history with IP tracking

#### Added — Enterprise Features
- Admin Panel with user management, role control, and analytics
- Notification Center with real-time alerts and activity timeline
- Activity log with device, browser, IP metadata
- Audit logging for all admin actions
- User settings for notification preferences (email, toast, sound, desktop)

#### Added — Production Hardening (Phase 14)
- GZip response compression middleware
- In-memory sliding window rate limiting (auth: 10/min, API: 60/min)
- Security headers: HSTS, X-Frame-Options, X-XSS-Protection, Referrer-Policy
- Centralized error handling with standardized `{ error: { code, message } }` format
- Structured JSON request logging with duration tracking
- Database indexes on 14 frequently queried columns
- Connection pooling for SQLite and PostgreSQL
- `/health`, `/live`, `/ready` health check endpoints

#### Added — Deployment (Phase 15)
- Multi-stage backend Dockerfile (Python 3.11, non-root user, health check)
- Multi-stage frontend Dockerfile (Node 20 build → Nginx serve)
- Production docker-compose.yml with service health checks
- Development docker-compose.dev.yml with hot reload
- GitHub Actions CI/CD (5-job pipeline: lint, test, security scan, Docker push, release)
- Vite `manualChunks` code splitting (10 vendor/app chunks)
- Comprehensive documentation: README, DEPLOYMENT, API_DOCS, SECURITY, CONTRIBUTING
- .env.example with all variables documented

---

## [0.9.0] — Phase 13

### Added
- Notification Center page with 3 tabs: Notifications, Activity Timeline, Preferences
- Real-time notification bell icon in dashboard with unread badge
- Backend notifications router with full CRUD
- Activity log schema with device/browser/IP tracking

---

## [0.8.0] — Phase 12

### Added
- Enterprise Admin Panel with user management, system analytics
- Admin audit logs with action history
- Role-based access control (user / admin)

---

## [0.7.0] — Phase 11

### Added
- Settings & Personalization Center
- Theme switching (dark/light/system)
- Language selection with i18n support
- AI model preference settings
- Notification preference toggles

---

## [0.6.0] — Phase 10

### Added
- User Profile Management (full CRUD)
- Avatar upload with base64 encoding
- Password change with OTP verification
- Email change flow with verification
- Account deletion with confirmation OTP
- Login history with device/browser detection

---

## [0.5.0] — Phase 9 and Earlier

### Added
- Complete authentication system (register, verify, login, logout, refresh, forgot password)
- Dashboard with file management and activity
- Document upload, management, and soft delete
- AI summarization with model selection
- Document chat with context-aware Q&A
- ROUGE evaluation scoring
- Document NLP analysis
- Performance metrics tracking
- Summary and document history
- Recycle bin with restore functionality
