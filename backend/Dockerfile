FROM python:3.11-slim AS builder

WORKDIR /build

# System dependencies for building Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install all Python dependencies into user space
RUN pip install --no-cache-dir --user -r requirements.txt

# ─── Runtime Image ────────────────────────────────────────────────────────────
FROM python:3.11-slim AS runner

# Create a non-root user for security
RUN useradd -m -u 1001 appuser

WORKDIR /app

# Runtime system dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /root/.local /home/appuser/.local

# Copy application source
COPY --chown=appuser:appuser . /app

# Create uploads directory with correct permissions
RUN mkdir -p /app/uploads && chown appuser:appuser /app/uploads

USER appuser

ENV PATH=/home/appuser/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV ENVIRONMENT=production

EXPOSE 8000

# Health check using the /live endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:8000/live || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2", "--log-level", "info"]
