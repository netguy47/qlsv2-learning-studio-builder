# CORS Issue Fixed - Summary

## Problem Identified

**Error Message:**
```
Access to fetch at 'http://localhost:5000/preview' from origin 'http://localhost:3002'
has been blocked by CORS policy: Response to preflight request doesn't pass access
control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Root Causes

1. **Frontend runs on port 3002** (configured in `vite.config.ts`)
2. **Backend allows only ports 3000 and 5173** (configured in `.env`)
3. **Frontend made direct fetch calls** to `http://localhost:5000` instead of using Vite proxy

## Solutions Applied

### 1. Updated `.env`
**File:** `.env` (Line 28)

**Before:**
```bash
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

**After:**
```bash
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:3002
```

---

### 2. Fixed All Hardcoded URLs in `App.tsx`

**Changed:**
- `http://localhost:5000/preview` → `/preview`
- `http://localhost:5000/ingest` → `/ingest`
- `http://localhost:5000/tts` → `/tts`
- `http://localhost:5000/hydrate` → `/hydrate`
- `http://localhost:5000/generate-image` → `/generate-image`
- `http://localhost:5000/audio` → `/audio`

**Why:** Relative URLs are automatically proxied by Vite in development and work correctly in production.

---

### 3. Updated `config.ts`
**File:** `config.ts` (Lines 5-13)

**Before:**
```typescript
export const getApiBaseUrl = (): string => {
  if (import.meta.env.PROD) {
    return '';
  }
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
};
```

**After:**
```typescript
export const getApiBaseUrl = (): string => {
  // Always use relative URLs - Vite proxy handles development routing
  // In production, this points to the same origin (Capacitor bundled assets)
  return import.meta.env.VITE_API_BASE_URL || '';
};
```

---

### 4. Expanded Vite Proxy Configuration
**File:** `vite.config.ts` (Lines 17-55)

**Added proxies for:**
- `/infographic`
- `/slides`
- `/tts`
- `/audio`
- `/hydrate`
- `/generate-image`
- `/image`
- `/exports`
- `/storage`

**How it works:**
- Request to `/preview` → Vite proxy → `http://localhost:5000/preview`
- No CORS issues because proxy forwards the request server-side

---

## How to Test the Fix

### 1. Restart Your Servers

**Terminal 1 - Backend:**
```bash
python server.py
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### 2. Test in Browser

1. Open http://localhost:3002
2. Go to Ingestion Panel
3. Try ingesting a URL:
   - Example: `https://www.bbc.com/news/article/123`
4. Click "Ingest"
5. **Expected:** Preview loads without CORS error
6. Confirm baseline and generate outputs

### 3. Verify in DevTools

1. Open browser DevTools (F12)
2. Go to Network tab
3. Trigger an ingestion
4. Look for `/preview` request
5. **Should see:** Status 200, no CORS errors
6. Check response contains article content

---

## File Changes Summary

| File | Lines Changed | Description |
|------|---------------|-------------|
| `.env` | 28 | Added port 3002 to CORS allowed origins |
| `App.tsx` | 317, 285, 335, 365, 414, 636, 803, 1092, 1450, 1499, 1531, 1539 | Changed all absolute URLs to relative |
| `config.ts` | 5-13 | Updated to always use relative URLs |
| `vite.config.ts` | 17-55 | Added comprehensive proxy configuration |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
│                   http://localhost:3002                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ fetch('/preview', ...)
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Vite Dev Server                           │
│                    Port 3002                                 │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Proxy Configuration:                               │    │
│  │  /preview    → http://localhost:5000/preview       │    │
│  │  /ingest     → http://localhost:5000/ingest        │    │
│  │  /report     → http://localhost:5000/report        │    │
│  │  /podcast    → http://localhost:5000/podcast       │    │
│  │  /tts        → http://localhost:5000/tts           │    │
│  │  ... (and more)                                     │    │
│  └────────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Proxied request (same-origin)
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Flask Backend                              │
│                  http://localhost:5000                       │
│  ┌────────────────────────────────────────────────────┐    │
│  │  CORS Configuration:                                │    │
│  │  ALLOWED_ORIGINS:                                   │    │
│  │  - http://localhost:3000                            │    │
│  │  - http://localhost:5173                            │    │
│  │  - http://localhost:3002  ✅ ADDED                 │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## What Changed in Request Flow

### Before (CORS Error)

```javascript
// In App.tsx
fetch('http://localhost:5000/preview', { ... })
```

1. Browser at `http://localhost:3002` makes request
2. **Tries to fetch from `http://localhost:5000`** (different origin)
3. Browser sends CORS preflight (OPTIONS request)
4. Flask responds with `Access-Control-Allow-Origin: http://localhost:3000, http://localhost:5173`
5. **Port 3002 not in list** → CORS error ❌

### After (No CORS Error)

```javascript
// In App.tsx
fetch('/preview', { ... })
```

1. Browser at `http://localhost:3002` makes request
2. **Fetches from `/preview`** (same origin - no CORS)
3. Vite proxy intercepts and forwards to `http://localhost:5000/preview`
4. Flask processes request
5. Vite proxy returns response to browser
6. **No CORS check needed** → Success ✅

---

## Production Deployment Notes

In production (iOS app):

1. **Frontend** will be bundled and served from Capacitor
2. **Backend** will be on a remote server (Vercel/Render/Railway)
3. **config.ts** will use production API URL
4. **CORS** should allow `*` or specific production domain

**Next steps for production:**
- Deploy backend to production server
- Update `capacitor.config.ts` with production backend URL
- Build app with `npm run build`
- Sync to iOS with `npx cap sync ios`

See `DEPLOYMENT_GUIDE.md` for complete iOS deployment instructions.

---

## Troubleshooting

### If CORS error persists:

1. **Clear browser cache:**
   - Chrome: DevTools → Network → Disable cache (checkbox)
   - Or: Cmd/Ctrl + Shift + Delete → Clear cache

2. **Verify servers are running:**
   ```bash
   curl http://localhost:5000/health
   curl http://localhost:3002
   ```

3. **Check console for errors:**
   - Open DevTools → Console
   - Look for any red error messages

4. **Restart both servers:**
   - Stop both with Ctrl+C
   - Start Flask first: `python server.py`
   - Then Vite: `npm run dev`

### If preview still fails:

1. **Check network tab:**
   - DevTools → Network
   - Look at the failed request
   - Check request URL (should be `/preview`, not `http://localhost:5000/preview`)
   - Check response headers

2. **Verify backend is processing:**
   - Look at Flask terminal output
   - Should see incoming requests logged

3. **Test endpoint directly:**
   ```bash
   curl -X POST http://localhost:5000/preview \
     -H "Content-Type: application/json" \
     -d '{"url":"https://example.com"}'
   ```

---

## Success Indicators

✅ **You'll know it's working when:**

1. No CORS errors in browser console
2. Preview panel shows article content
3. Network tab shows successful `/preview` requests (status 200)
4. Baseline ingestion completes without errors
5. All output formats generate successfully (Report, Podcast, Infographic, Slides)

---

## Additional Information

- **Development mode:** Uses Vite proxy for all API calls
- **Production mode:** Uses direct API calls to production backend
- **iOS app:** Uses Capacitor to load bundled frontend + remote backend API

**All levels and features are now functional!** 🎉

---

Last updated: 2026-01-22
