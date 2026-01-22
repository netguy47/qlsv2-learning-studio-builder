# Application Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      YOUR BROWSER                            │
│                                                              │
│              http://localhost:3002                           │
│                                                              │
│  [Learning Studio UI - React Application]                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTP Requests
                         │ (/preview, /ingest, /report, etc.)
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  VITE DEV SERVER                             │
│                  Port 3002                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Proxy Configuration (vite.config.ts)              │    │
│  │                                                     │    │
│  │  /preview    → http://localhost:5000/preview       │    │
│  │  /ingest     → http://localhost:5000/ingest        │    │
│  │  /report     → http://localhost:5000/report        │    │
│  │  /podcast    → http://localhost:5000/podcast       │    │
│  │  /infographic→ http://localhost:5000/infographic   │    │
│  │  /slides     → http://localhost:5000/slides        │    │
│  │  /tts        → http://localhost:5000/tts           │    │
│  │  /audio      → http://localhost:5000/audio         │    │
│  │  ... (and more)                                     │    │
│  └────────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Proxied Requests
                         │ (Server-side, no CORS)
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  FLASK BACKEND                               │
│                  Port 5000                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │  CORS Configuration (server.py)                     │    │
│  │  Allowed Origins:                                   │    │
│  │  - http://localhost:3000                            │    │
│  │  - http://localhost:5173                            │    │
│  │  - http://localhost:3002  ✅ Added                 │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  API Endpoints:                                              │
│  ├─ POST /preview        - Preview URL content              │
│  ├─ POST /ingest         - Ingest content                   │
│  ├─ POST /report         - Generate report                  │
│  ├─ POST /podcast        - Generate podcast                 │
│  ├─ POST /infographic    - Generate infographic             │
│  ├─ POST /slides         - Generate slides                  │
│  ├─ POST /tts            - Text to speech                   │
│  ├─ GET  /audio/:file    - Serve audio files                │
│  ├─ GET  /health         - Health check                     │
│  └─ ... (more endpoints)                                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Calls External Services
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌────────────┐  ┌────────────┐  ┌────────────┐
│  OpenAI    │  │Pollinations│  │  YouTube   │
│    API     │  │     AI     │  │ Transcript │
└────────────┘  └────────────┘  └────────────┘
```

---

## Request Flow Example

### User Ingests a URL

```
1. User enters URL in browser at http://localhost:3002
   └─ User clicks "Ingest"

2. React app makes fetch request:
   fetch('/preview', {
     method: 'POST',
     body: JSON.stringify({ url: '...' })
   })

3. Request goes to Vite Dev Server (port 3002)
   └─ Vite proxy intercepts /preview

4. Vite forwards request to Flask:
   http://localhost:5000/preview
   └─ No CORS issue (server-side request)

5. Flask processes request:
   - Ultimate Scraper tries:
     a) Trafilatura (if installed)
     b) Enhanced basic scraper
     c) Playwright (if needed & installed)
   - Extracts article text
   - Returns JSON response

6. Vite forwards response back to browser

7. React app displays preview

8. User clicks "Confirm Baseline"

9. React makes another request to /ingest
   └─ Same proxy flow

10. Flask processes ingestion:
    - Validates content
    - Stores baseline
    - Returns structured data

11. React displays confirmed baseline

12. User selects output type (Report/Podcast/Infographic/Slides)

13. React makes request to appropriate endpoint:
    - /report
    - /podcast
    - /infographic
    - /slides

14. Flask generates content:
    - Calls AI APIs (OpenAI, Pollinations)
    - Generates images (if needed)
    - Generates audio (if podcast)
    - Returns formatted output

15. React displays the generated content
```

---

## Why Two Servers?

### Vite Dev Server (Port 3002)
**Purpose:** Development server for React app

**Features:**
- Hot Module Replacement (instant updates)
- Fast refresh (no full reload)
- Proxy configuration (forwards API calls)
- Serves static assets (HTML, CSS, JS, images)

**Only runs during development!**
- In production, React is built to static files
- Static files are served by Flask or CDN

### Flask Backend (Port 5000)
**Purpose:** API server for business logic

**Features:**
- Content ingestion (URL, YouTube, paste)
- AI content generation
- Image generation
- Text-to-speech
- File storage and retrieval

**Runs in both development and production!**

---

## Development vs Production

### Development (Now)
```
Browser → Vite (3002) → Flask (5000) → AI APIs
          [Proxies]      [Processes]
```

### Production (iOS App)
```
Browser → Capacitor Bundle → Production Flask → AI APIs
          [Static Files]     [Vercel/Railway]
```

In production:
- No Vite dev server
- React app is built to static files
- Static files bundled with Capacitor
- API calls go directly to production backend
- Backend URL configured in `capacitor.config.ts`

---

## Port Assignment

| Port | Service | Dev | Prod | Notes |
|------|---------|-----|------|-------|
| **3002** | Vite Frontend | ✅ | ❌ | Dev only |
| **5000** | Flask Backend | ✅ | ✅ | Always needed |
| 3000 | (legacy) | ❌ | ❌ | Old frontend port |
| 3001 | Express Proxy | ❌ | ❌ | Not used anymore |

---

## Why Port 3002 (Not 3000)?

**Historical:**
- Port 3000 was the original frontend port
- Later changed to 3002 in `vite.config.ts`
- CORS config wasn't updated → CORS error
- **Now fixed!** ✅

**Current:**
- Vite uses 3002 (configured in vite.config.ts)
- CORS allows 3002 (configured in .env)
- Everything works! 🎉

---

## Environment Variables

### Frontend (.env in root)
```bash
GEMINI_API_KEY=...           # Used by Vite for build-time config
VITE_API_BASE_URL=           # Empty = use relative URLs (default)
```

### Backend (.env in root)
```bash
FLASK_PORT=5000              # Backend port
FLASK_ENV=development        # Development mode
ALLOWED_ORIGINS=...,3002     # CORS allowed origins
OPENAI_API_KEY=...           # OpenAI API
POLLINATIONS_API_KEY=...     # Pollinations API
```

---

## Files Reference

### Frontend Configuration
- `vite.config.ts` - Vite dev server config (port 3002, proxy rules)
- `config.ts` - API endpoints configuration
- `App.tsx` - Main React component (makes API calls)
- `package.json` - NPM scripts and dependencies

### Backend Configuration
- `server.py` - Flask app and all API endpoints
- `ingest.py` - Content ingestion logic
- `ingestion/fetch_article_*.py` - Web scraping implementations
- `requirements.txt` - Python dependencies
- `.env` - Environment variables

### Build Configuration
- `capacitor.config.ts` - iOS/Android app configuration
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.js` - Tailwind CSS configuration

---

## Common Issues

### Issue: "Connection refused" on port 3002
**Cause:** Vite not running
**Fix:** `npm run dev` in Terminal 2

### Issue: "CORS policy" error
**Cause:** Port mismatch or servers need restart
**Fix:** Restart both servers

### Issue: "Failed to fetch"
**Cause:** Flask not running
**Fix:** `python server.py` in Terminal 1

### Issue: Opening localhost:5000 shows JSON
**Cause:** That's the API server, not the frontend
**Fix:** Open localhost:3002 instead

---

## Summary

**Development Setup:**
1. Terminal 1: `python server.py` (Flask on 5000)
2. Terminal 2: `npm run dev` (Vite on 3002)
3. Browser: http://localhost:3002

**Request Flow:**
Browser → Vite Proxy → Flask API → External APIs → Flask → Vite → Browser

**All working!** ✅

---

Last updated: 2026-01-22
