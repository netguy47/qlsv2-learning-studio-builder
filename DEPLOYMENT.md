# Learning Studio Builder - Deployment Guide

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and npm
- **Python** 3.8+
- **Git** (optional)

### Development Setup

1. **Clone or navigate to the project directory**
   ```bash
   cd D:\QLSV2-Learning-Studio-Builder
   ```

2. **Set up environment variables**
   ```bash
   # Copy the example environment file
   cp .env.example .env

   # Edit .env with your configuration
   # At minimum, set GEMINI_API_KEY for full functionality
   ```

3. **Install frontend dependencies**
   ```bash
   npm install
   ```

4. **Install backend dependencies**
   ```bash
   pip install -r requirements.txt
   ```

5. **Start the backend server**
   ```bash
   # From project root
   python server.py
   ```

   The server will start on port 5000 by default. You should see:
   ```
   ============================================================
   🚀 Learning Studio Builder Server Starting
   ============================================================
   Port: 5000
   Debug Mode: True
   Image Provider: pollinations
   CORS Origins: http://localhost:3000, http://localhost:5173
   ============================================================
   ```

6. **Start the frontend development server** (in a new terminal)
   ```bash
   npm run dev
   ```

   The frontend will start on port 3000 and open in your browser automatically.

7. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Health Check: http://localhost:5000/health
   - Readiness Check: http://localhost:5000/ready
   - Metrics: http://localhost:5000/metrics

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# Flask Server Configuration
FLASK_PORT=5000
FLASK_ENV=development  # or 'production'

# AI Provider API Keys
GEMINI_API_KEY=your_gemini_api_key_here           # Required for full functionality
OPENAI_API_KEY=your_openai_api_key                # Optional, for DALL-E images
POLLINATIONS_API_KEY=your_pollinations_key        # Optional, free tier available

# Image Generation Configuration
INFOGRAPHIC_IMAGE_PROVIDER=pollinations            # Options: 'pollinations' | 'openai'

# Performance Tuning
CACHE_TTL=3600                                     # Cache time-to-live in seconds
MAX_CONCURRENT_IMAGE_GENERATION=3                  # Parallel workers for slide generation

# CORS Settings
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Feature Flags
ENABLE_CACHING=true                                # Enable response caching
ENABLE_PARALLEL_GENERATION=true                    # Parallel slide image generation
```

### Frontend Configuration

The frontend automatically detects the environment:

- **Development**: Uses `VITE_API_BASE_URL` or defaults to `http://localhost:5000`
- **Production**: Uses relative URLs (same origin)

To override the API URL in development:
```bash
# Create .env.local in project root
VITE_API_BASE_URL=http://custom-api-url:5000
```

---

## 🏗️ Production Deployment

### Option 0: iOS App Store (Capacitor Wrapper)

This project is a Vite + Flask web app. For iOS App Store distribution, wrap the web app using Capacitor.

1) Install Capacitor
```bash
npm install @capacitor/core @capacitor/cli
```

2) Configure the app shell
- Edit `capacitor.config.ts`:
  - `appId`: your Apple bundle ID (e.g., `com.yourcompany.qlsv2`)
  - `server.url`: your Vercel URL (HTTPS)

3) Add iOS platform
```bash
npx cap add ios
npx cap open ios
```

4) Build and sync assets
```bash
npm run build
npx cap sync
```

5) Publish
- Open Xcode and follow standard App Store submission steps.

### Option 0.5: Vercel + Railway (Recommended for Cloud)

Frontend (Vercel):
1) Import this repo in Vercel.
2) Build command: `npm run build`
3) Output directory: `dist`
4) Env var: `VITE_API_BASE_URL=https://<your-railway-app>.railway.app`

Backend (Railway):
1) Deploy the repo to Railway.
2) Start command: `python server.py`
3) Env vars:
   - `FLASK_PORT=5000`
   - `POLLINATIONS_API_KEY=...`
   - `ALLOWED_ORIGINS=https://<your-vercel-app>.vercel.app`
   - Optional: `OPENAI_API_KEY=...`

### Option 1: Docker Deployment (Recommended)

Create a `Dockerfile`:

```dockerfile
FROM python:3.9-slim

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Set production environment
ENV FLASK_ENV=production
ENV FLASK_PORT=5000

# Expose port
EXPOSE 5000

# Run server
CMD ["python", "server.py"]
```

Build and run:
```bash
docker build -t learning-studio-builder .
docker run -p 5000:5000 --env-file .env learning-studio-builder
```

### Option 2: Traditional Server Deployment

1. **Build frontend for production**
   ```bash
   npm run build
   ```
   This creates optimized static files in `dist/`

2. **Serve frontend with nginx**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       # Frontend static files
       location / {
           root /path/to/dist;
           try_files $uri $uri/ /index.html;
       }

       # Proxy API requests to Flask backend
       location /api {
           proxy_pass http://localhost:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }

       location /health {
           proxy_pass http://localhost:5000/health;
       }
   }
   ```

3. **Run Flask with production WSGI server**
   ```bash
   # Install gunicorn
   pip install gunicorn

   # Run with 4 workers
   gunicorn -w 4 -b 0.0.0.0:5000 server:app
   ```

4. **Set up systemd service** (Linux)
   Create `/etc/systemd/system/learning-studio.service`:
   ```ini
   [Unit]
   Description=Learning Studio Builder API
   After=network.target

   [Service]
   User=www-data
   WorkingDirectory=/path/to/project
   Environment="PATH=/path/to/venv/bin"
   EnvironmentFile=/path/to/project/.env
   ExecStart=/path/to/venv/bin/gunicorn -w 4 -b 0.0.0.0:5000 server:app
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

   Enable and start:
   ```bash
   sudo systemctl enable learning-studio
   sudo systemctl start learning-studio
   ```

---

## 📊 Monitoring & Health Checks

### Health Check Endpoint
```bash
curl http://localhost:5000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-15T10:30:00.000000",
  "version": "2.0.0",
  "uptime_seconds": 3600
}
```

### Readiness Check Endpoint
```bash
curl http://localhost:5000/ready
```

Response:
```json
{
  "ready": true,
  "checks": {
    "pollinations_api": true,
    "disk_space": true,
    "storage_writable": true
  },
  "timestamp": "2026-01-15T10:30:00.000000"
}
```

### Metrics Endpoint
```bash
curl http://localhost:5000/metrics
```

Response:
```json
{
  "uptime_seconds": 3600,
  "image_provider": "pollinations",
  "cache_ttl": 3600,
  "timestamp": "2026-01-15T10:30:00.000000"
}
```

---

## 🔧 Troubleshooting

### Issue: Frontend can't connect to backend

**Solution**: Check that:
1. Backend is running on the expected port (default 5000)
2. CORS origins include your frontend URL
3. No firewall blocking the connection

```bash
# Test backend connectivity
curl http://localhost:5000/health

# Check CORS configuration in server logs
```

### Issue: "Source text required" error

**Solution**: Ensure source content is at least 500 characters. The application requires substantial content to generate meaningful outputs.

### Issue: Slide generation takes too long

**Solution**:
1. Verify `ENABLE_PARALLEL_GENERATION=true` in `.env`
2. Increase `MAX_CONCURRENT_IMAGE_GENERATION` (but not too high, API rate limits apply)
3. Check network connectivity to Pollinations API

```bash
# Test API connectivity
curl https://text.pollinations.ai
```

### Issue: Out of disk space for audio storage

**Solution**: The application stores TTS audio files in `storage/audio/`. Clean up old files or increase disk space.

```bash
# Check disk space
df -h

# Clean up old audio files (older than 7 days)
find storage/audio -name "*.mp3" -mtime +7 -delete
```

### Issue: API keys not working

**Solution**:
1. Verify API keys are correctly set in `.env`
2. Ensure no extra spaces or quotes around keys
3. Restart the server after changing `.env`

```bash
# Verify environment variables are loaded
python -c "import os; print(os.getenv('GEMINI_API_KEY', 'NOT SET'))"
```

---

## 🚦 Performance Optimization

### 1. Enable Parallel Slide Generation
```bash
ENABLE_PARALLEL_GENERATION=true
MAX_CONCURRENT_IMAGE_GENERATION=3  # Balance between speed and rate limits
```

**Impact**: Reduces slide generation time from ~30s → ~10s

### 2. Configure Caching
```bash
ENABLE_CACHING=true
CACHE_TTL=3600  # 1 hour cache
```

**Impact**: Instant responses for duplicate requests, reduced API costs

### 3. Use Pollinations Free Tier
```bash
INFOGRAPHIC_IMAGE_PROVIDER=pollinations
```

**Impact**: No API key required, free usage, good quality images

### 4. Optimize CORS
Only allow necessary origins in production:
```bash
ALLOWED_ORIGINS=https://yourdomain.com
```

---

## 🔒 Security Best Practices

1. **Never commit `.env` file to version control**
   - Added to `.gitignore` by default
   - Use `.env.example` as template

2. **Rotate API keys regularly**
   - Especially if exposed or in logs

3. **Use HTTPS in production**
   - Configure SSL certificates
   - Use nginx or Caddy as reverse proxy

4. **Limit CORS origins**
   - Only whitelist your production domains
   - Don't use wildcard `*` in production

5. **Set up rate limiting** (optional, for high-traffic deployments)
   - Use nginx rate limiting
   - Or Flask-Limiter middleware

---

## 📦 Backup & Recovery

### Backup Important Data

The application stores data in:
- `storage/audio/` - Generated TTS audio files
- `storage/exports/` - Exported content files
- Browser localStorage - User's saved library

**Backup command**:
```bash
tar -czf backup-$(date +%Y%m%d).tar.gz storage/
```

### Recovery

Extract backup:
```bash
tar -xzf backup-YYYYMMDD.tar.gz
```

---

## 📝 Updating the Application

### Pull Latest Changes
```bash
git pull origin main

# Reinstall dependencies if package.json or requirements.txt changed
npm install
pip install -r requirements.txt

# Rebuild frontend
npm run build

# Restart services
sudo systemctl restart learning-studio
```

---

## 🆘 Support & Resources

- **GitHub Issues**: https://github.com/anthropics/claude-code/issues
- **API Documentation**:
  - Pollinations: https://pollinations.ai/
  - Google Generative AI: https://ai.google.dev/docs
  - OpenAI: https://platform.openai.com/docs

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT BROWSER                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │      React Frontend (Port 3000/5173)            │   │
│  │  - App.tsx (State Management)                   │   │
│  │  - OutputViewer (Display)                       │   │
│  │  - IngestionPanel (Input)                       │   │
│  └────────────────┬────────────────────────────────┘   │
│                   │ HTTP/JSON                           │
└───────────────────┼─────────────────────────────────────┘
                    │
┌───────────────────┼─────────────────────────────────────┐
│                   ▼                                     │
│  ┌─────────────────────────────────────────────────┐   │
│  │      Flask Backend (Port 5000)                  │   │
│  │  ┌────────────────────────────────────────┐    │   │
│  │  │ API Endpoints                          │    │   │
│  │  │  /infographic  /slides  /podcast       │    │   │
│  │  │  /health  /ready  /metrics             │    │   │
│  │  └────────┬───────────────────────────────┘    │   │
│  │           │                                     │   │
│  │  ┌────────┼────────────────────────────────┐   │   │
│  │  │ Renderers                               │   │   │
│  │  │  - infographic.py (Image generation)    │   │   │
│  │  │  - slides.py (Multi-slide, parallel)    │   │   │
│  │  │  - report.py  - podcast.py              │   │   │
│  │  └────────┬────────────────────────────────┘   │   │
│  │           │                                     │   │
│  │  ┌────────┼────────────────────────────────┐   │   │
│  │  │ API Clients                             │   │   │
│  │  │  - pollinations.py (Free, no auth)      │   │   │
│  │  │  - openai_images.py (DALL-E)            │   │   │
│  │  │  - svg_placeholder.py (Fallback)        │   │   │
│  │  └─────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────┘   │
│                   │                                     │
└───────────────────┼─────────────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  External APIs        │
        │  - Pollinations.ai    │
        │  - OpenAI (optional)  │
        │  - Google Gemini      │
        └───────────────────────┘
```

---

**Version**: 2.0.0
**Last Updated**: 2026-01-15
