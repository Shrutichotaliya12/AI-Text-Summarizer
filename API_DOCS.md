# API Documentation — AI Text Summarizer Pro

Base URL: `http://localhost:8000/api/v1`

All protected endpoints require: `Authorization: Bearer <access_token>`

---

## Authentication

### POST /auth/register
Register a new user. Sends OTP to email for verification.

**Request:**
```json
{ "email": "user@example.com", "password": "Str0ng!Pass", "name": "John Doe" }
```
**Response:** `200`
```json
{ "status": "verification_required", "email": "user@example.com", "debug_otp": "123456" }
```

---

### POST /auth/verify-otp
Verify OTP and complete registration or action.

**Request:**
```json
{ "email": "user@example.com", "otp": "123456", "action": "signup" }
```
**Response:** `200`
```json
{ "access_token": "eyJ...", "refresh_token": "abc...", "token_type": "bearer", "email": "user@example.com" }
```

---

### POST /auth/login
Authenticate and receive tokens.

**Request:**
```json
{ "email": "user@example.com", "password": "Str0ng!Pass", "remember_me": true }
```
**Response:** `200`
```json
{ "access_token": "eyJ...", "refresh_token": "abc...", "token_type": "bearer", "email": "user@example.com" }
```
**Errors:** `401` Wrong password · `403` Email not verified · `404` Account not found

---

### POST /auth/refresh
Rotate access token using refresh token.

**Request:** `{ "refresh_token": "abc..." }` or via HTTP-only cookie
**Response:** `200` → new `access_token` + `refresh_token`

---

### POST /auth/logout
Revoke current session.
**Response:** `200 { "status": "success" }`

---

### POST /auth/forgot-password
Send password reset OTP.
**Request:** `{ "email": "user@example.com" }`
**Response:** `200 { "status": "success", "debug_otp": "..." }`

---

### POST /auth/resend-otp
Resend OTP (rate limited: 60s cooldown).
**Request:** `{ "email": "user@example.com", "action": "signup" }`

---

### GET /auth/me 🔒
Get current authenticated user profile.
**Response:** `200` → user + profile + settings JSON object

---

### PUT /auth/profile 🔒
Update user profile fields.
**Request:** `{ "first_name": "John", "bio": "...", "country": "US", ... }`

---

### PUT /auth/preferences 🔒
Update notification and AI preferences.

---

### POST /auth/sessions/revoke 🔒
Revoke a specific session by ID.

---

## Summarization

### POST /summary/summarize 🔒
Generate AI summary from text.
**Request:**
```json
{
  "text": "Long document text...",
  "model": "facebook/bart-large-cnn",
  "length": "medium",
  "temperature": 0.7,
  "max_tokens": 512
}
```
**Response:** `200`
```json
{
  "summary": "Generated summary...",
  "model_used": "facebook/bart-large-cnn",
  "processing_time": 2.34,
  "word_count": { "original": 1200, "summary": 180 }
}
```

---

### POST /summary/summarize-document 🔒
Summarize an uploaded document by ID.
**Request:** `{ "document_id": "uuid", "length": "short" }`

---

### GET /summary/history 🔒
Get paginated summary history.
**Query:** `?page=1&limit=20&search=keyword`

---

## Document Upload

### POST /upload/upload 🔒
Upload a document file (PDF, DOCX, TXT).
**Content-Type:** `multipart/form-data`
**Form field:** `file`
**Response:** `200`
```json
{
  "document_id": "uuid",
  "filename": "report.pdf",
  "size_bytes": 204800,
  "pages": 12,
  "word_count": 3400
}
```
**Errors:** `400` Unsupported format · `413` File too large

---

### GET /upload/documents 🔒
List all user documents.
**Query:** `?page=1&limit=20&deleted=false`

---

### DELETE /upload/documents/{id} 🔒
Soft-delete a document (moves to Recycle Bin).

---

### POST /upload/documents/{id}/restore 🔒
Restore a soft-deleted document.

---

## Document Chat

### POST /chat/ask 🔒
Ask a question about a document.
**Request:** `{ "document_id": "uuid", "question": "What is the main argument?" }`
**Response:** `200 { "answer": "...", "sources": [...] }`

---

### GET /chat/sessions 🔒
List all chat sessions.

---

### GET /chat/sessions/{id}/messages 🔒
Get messages for a chat session.

---

## Document Analysis

### POST /analysis/analyze 🔒
Run NLP analysis on a document.
**Request:** `{ "document_id": "uuid" }`
**Response:**
```json
{
  "reading_time_minutes": 8,
  "complexity_score": 72,
  "sentiment": { "positive": 0.6, "neutral": 0.3, "negative": 0.1 },
  "top_keywords": ["AI", "machine learning", "NLP"],
  "sentence_count": 142,
  "avg_sentence_length": 18.4
}
```

---

## ROUGE Evaluation

### POST /rouge/evaluate 🔒
Evaluate summary quality against reference.
**Request:**
```json
{
  "hypothesis": "Generated summary...",
  "reference": "Reference summary..."
}
```
**Response:**
```json
{
  "rouge1": { "precision": 0.82, "recall": 0.78, "f1": 0.80 },
  "rouge2": { "precision": 0.61, "recall": 0.58, "f1": 0.59 },
  "rougeL": { "precision": 0.79, "recall": 0.75, "f1": 0.77 }
}
```

---

## Notifications

### GET /notifications/ 🔒
List notifications with filters.
**Query:** `?unread_only=false&priority=high&limit=50`

### POST /notifications/mark-all-read 🔒
Mark all notifications as read.

### PUT /notifications/{id}/read 🔒
Mark a specific notification as read.

### PUT /notifications/{id}/archive 🔒
Archive a notification.

### DELETE /notifications/{id} 🔒
Delete a notification.

### GET /notifications/activity 🔒
Get user activity timeline.
**Query:** `?limit=50&skip=0`

---

## Admin

### GET /admin/users 🔒🛡️
List all users (admin only).

### PUT /admin/users/{id}/role 🔒🛡️
Change a user's role.

### DELETE /admin/users/{id} 🔒🛡️
Delete a user account (admin only).

### GET /admin/stats 🔒🛡️
System-wide statistics.

### GET /admin/audit-logs 🔒🛡️
Full audit log with filters.

---

## Health

### GET /health
Application health status (no auth required).

### GET /live
Liveness check (no auth required).

### GET /ready
Readiness check with DB ping (no auth required).

---

## Error Response Format

All errors follow:
```json
{
  "error": {
    "code": 422,
    "message": "Validation Error",
    "details": [...]
  }
}
```

## Standard HTTP Status Codes
| Code | Meaning |
|------|---------|
| `200` | Success |
| `400` | Bad Request / Validation Error |
| `401` | Unauthorized (invalid/missing token) |
| `403` | Forbidden (insufficient permissions) |
| `404` | Resource not found |
| `422` | Unprocessable Entity (schema error) |
| `429` | Too Many Requests (rate limited) |
| `500` | Internal Server Error |
| `503` | Service Unavailable (DB disconnected) |
