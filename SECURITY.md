# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | ✅ Yes    |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it privately to: **security@summarizer.pro**

**Do NOT open a public GitHub issue for security vulnerabilities.**

We will respond within 48 hours and aim to resolve confirmed issues within 14 days.

---

## Security Features

### Authentication
- **JWT tokens** with configurable expiration (default: 7 days)
- **Refresh token rotation** — old token revoked on refresh
- **HTTP-only Secure cookies** for refresh tokens (prevents XSS theft)
- **PBKDF2-SHA256** password hashing (via `passlib`)
- **OTP email verification** with 5-minute expiry
- **Account lockout** after repeated invalid OTP attempts

### Authorization
- Role-based access control: `user` and `admin`
- All API routes enforce JWT authentication
- Admin routes double-check role before executing
- Database queries always scoped to `user_id`

### API Security
- **Rate limiting**: 10 req/min on auth endpoints, 60 req/min on general API
- **Input validation**: Pydantic schemas validate all request bodies
- **Standardized errors**: No internal details leaked in 500 responses
- **Request logging**: Every request logged with IP for audit trail

### Transport Security
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-Frame-Options: DENY` — prevents clickjacking
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`

### File Upload Security
- Allowed file types: PDF, DOCX, TXT only
- File size limits enforced
- Filename sanitization before storage
- Uploads stored outside web root

### CORS
- Configurable via `ALLOWED_ORIGINS` environment variable
- Default `*` only allowed in development
- Production must set explicit domain(s)

### Database
- All user-scoped queries filter by `user_id`
- Soft delete implemented — no hard data loss
- Sensitive fields (passwords, OTPs) never returned in API responses
- SQL injection protection via SQLAlchemy ORM (parameterized queries)

### Secret Management
- `JWT_SECRET` validated at startup — hard-fails in production if default dev value used
- All secrets managed via environment variables
- `.env` excluded from git via `.gitignore`

---

## Production Security Checklist

- [ ] Set `ENVIRONMENT=production`
- [ ] Set strong `JWT_SECRET` (64+ char random hex)
- [ ] Set `ALLOWED_ORIGINS` to specific domain(s)
- [ ] Configure SMTP credentials for real OTP delivery
- [ ] Enable HTTPS (use nginx + certbot)
- [ ] Change default admin password immediately
- [ ] Review `RATE_LIMIT_PER_MINUTE` for your traffic profile
- [ ] Set up log monitoring for suspicious activity
- [ ] Enable PostgreSQL with strong credentials (not default)
- [ ] Disable `/docs` and `/redoc` in production (auto-disabled when `ENVIRONMENT=production`)
