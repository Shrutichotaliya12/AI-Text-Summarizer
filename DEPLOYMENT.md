# Deployment Guide

## Table of Contents
1. [Local Development](#local-development)
2. [Docker Deployment](#docker-deployment)
3. [Production Deployment](#production-deployment)
4. [Cloud Deployment](#cloud-deployment)
5. [Environment Variables](#environment-variables)
6. [Health Checks](#health-checks)

---

## Local Development

### Prerequisites
- Python 3.11+
- Node.js 20+
- Git

### Backend Setup

```bash
cd backend
python -m venv venv
# Activate venv:
source venv/bin/activate        # macOS/Linux
venv\Scripts\activate.bat       # Windows

pip install -r requirements.txt
cp .env.example .env            # Configure your .env

# Run development server (hot reload)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
# → Open http://localhost:3000
```

### First Login
- Register an account at `/auth`
- Check terminal output for the debug OTP code if SMTP is not configured
- Or use the pre-seeded admin: `admin@summarizer.pro` / `password123` (change immediately in production)

---

## Docker Deployment

### Production (Full Stack)

```bash
# 1. Clone repo
git clone https://github.com/yourusername/ai-text-summarizer-pro.git
cd ai-text-summarizer-pro

# 2. Configure backend environment
cp backend/.env.example backend/.env
nano backend/.env   # Set JWT_SECRET, ALLOWED_ORIGINS, SMTP settings

# 3. Build and launch
docker-compose up -d --build

# 4. Check health
docker-compose ps
curl http://localhost:8000/ready

# Access:
# Frontend  → http://localhost:3000
# API       → http://localhost:8000
# API Docs  → http://localhost:8000/docs  (disabled in production)
```

### Development (Hot Reload)

```bash
docker-compose -f docker-compose.dev.yml up
```

### Useful Docker Commands

```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart a service
docker-compose restart backend

# Stop everything
docker-compose down

# Stop and remove volumes (WARNING: deletes database)
docker-compose down -v
```

---

## Production Deployment

### Minimum Requirements
| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 cores | 4 cores |
| RAM | 4 GB | 8 GB |
| Storage | 20 GB | 50 GB |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

### Server Setup (Ubuntu)

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt-get install docker-compose-plugin

# Clone and configure
git clone https://github.com/yourusername/ai-text-summarizer-pro.git
cd ai-text-summarizer-pro
cp backend/.env.example backend/.env

# Generate a strong JWT secret
python3 -c "import secrets; print(secrets.token_hex(64))"
# Copy output → JWT_SECRET in .env

# Set ENVIRONMENT=production in .env
# Set ALLOWED_ORIGINS=https://yourdomain.com in .env

# Start services
docker-compose up -d --build
```

### Nginx Reverse Proxy (Optional)

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Get SSL certificate: `certbot --nginx -d yourdomain.com`

---

## Cloud Deployment

### Render.com (Easy)

**Backend:**
1. New Web Service → Connect GitHub repo
2. Build command: `pip install -r requirements.txt`
3. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables from `.env.example`

**Frontend:**
1. New Static Site → Connect GitHub repo
2. Build command: `npm install && npm run build`
3. Publish directory: `dist`

### Railway.app

```bash
railway login
railway new
railway add postgres
railway add redis
railway deploy
```

### AWS EC2

1. Launch Ubuntu 22.04 t3.medium instance
2. Configure Security Groups: 80, 443, 22
3. Follow [Server Setup](#server-setup-ubuntu) above
4. Point Route 53 domain to EC2 Elastic IP

---

## Health Checks

| Endpoint | Purpose | Expected Response |
|----------|---------|------------------|
| `GET /health` | Application health | `{"status": "healthy"}` |
| `GET /live` | Liveness probe | `{"status": "alive"}` |
| `GET /ready` | Readiness (DB check) | `{"status": "ready", "database": "connected"}` |

Monitor with:
```bash
watch -n 5 "curl -s http://localhost:8000/ready | python3 -m json.tool"
```
