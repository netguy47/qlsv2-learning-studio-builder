# Slide Deck Diagnostic Guide

**Date:** 2026-01-15
**Issue:** Slide decks not displaying

---

## Backend Verification ✅

I've tested the slide generation backend and confirmed it's working correctly:

```
✓ Slide deck generation successful!
✓ Generated 3 slides
✓ All URLs are valid and should display in the frontend
```

The backend is generating valid Pollinations image URLs for each slide.

---

## Common Issues & Solutions

### Issue 1: Content Too Short
**Symptom:** Nothing happens when clicking "Generate"
**Cause:** Source content must be at least 500 characters
**Solution:**
1. Paste more content or a longer article
2. Check that "Confirm Baseline" button is enabled (not grayed out)
3. Baseline word count should show "> 500 chars"

---

### Issue 2: Server Not Running
**Symptom:** Error message about connection refused
**Cause:** Flask server not started
**Solution:**
```bash
# Check if server is running
# You should see Flask server on port 5000

# If not running, start servers
start.bat
```

---

### Issue 3: Generation Takes Time
**Symptom:** Seems like nothing is happening
**Cause:** Slide generation takes 60-90 seconds for 6 slides
**Solution:**
1. Wait patiently - parallel generation is working
2. Check browser console (F12) for progress logs
3. Look for diagnostic messages in the UI

**Expected behavior:**
- "Requesting slide deck generation (this may take 60-90 seconds)"
- "Slide deck response received with X slides"
- Slides appear in 2-column grid

---

### Issue 4: Frontend Not Updated
**Symptom:** Old version cached
**Cause:** Browser caching old frontend code
**Solution:**
```bash
# Rebuild frontend
npm run build

# Or run dev mode
npm run dev

# Hard refresh browser
Ctrl + Shift + R
```

---

### Issue 5: Error Not Displayed
**Symptom:** Silent failure
**Cause:** Error being swallowed somewhere
**Solution:**
1. Open browser console (F12)
2. Look for red error messages
3. Check Network tab for failed requests
4. Look for 400/500 status codes

---

## Diagnostic Steps

### Step 1: Check Backend Health

```bash
# Navigate to project directory
cd d:\QLSV2-Learning-Studio-Builder

# Test slide generation directly
python test_slides.py
```

**Expected output:**
```
✓ PASS: Slide deck generation successful!
Generated 3 slides
All URLs are valid
```

If this fails, backend has an issue.

---

### Step 2: Check Server Logs

When generating slides, check terminal where server is running:

**Look for:**
```
Generating 6 slides in parallel with 3 workers...
```

**Or errors like:**
```
ERROR: Content too short
ERROR: Pollinations API failed
```

---

### Step 3: Check Browser Console

1. Open browser (Chrome/Edge/Firefox)
2. Press F12 to open Developer Tools
3. Go to "Console" tab
4. Click "Generate" for Slide Deck
5. Watch for messages

**Expected:**
```
[Diagnostic] Invoking slide deck generation model
[Diagnostic] Requesting slide deck generation (60-90 seconds)
[Diagnostic] Slide deck response received with 6 slides
[Diagnostic] Output ready for display
```

**Error indicators:**
```
[Diagnostic] Output generation failed: ...
❌ Error messages in red
```

---

### Step 4: Check Network Tab

1. Open Developer Tools (F12)
2. Go to "Network" tab
3. Click "Generate" for Slide Deck
4. Look for request to `/slides`

**Healthy response:**
- Status: `200 OK`
- Response contains: `slide_image_urls: [...]`
- Response size: Several KB

**Problem indicators:**
- Status: `400 Bad Request` (content too short)
- Status: `500 Internal Server Error` (backend crash)
- Status: `timeout` (server not responding)

---

### Step 5: Verify Content Length

```javascript
// In browser console, check content length
console.log(document.querySelector('textarea')?.value.length);
```

Should show **> 500**. If less than 500, add more content.

---

## Manual Test Procedure

### Test 1: Simple Generation

1. **Start servers:**
   ```bash
   start.bat
   ```

2. **Open browser:**
   ```
   http://localhost:5173
   ```

3. **Paste test URL:**
   ```
   https://www.bbc.com/news/articles/[any-article]
   ```

4. **Wait for preview** (shows article text)

5. **Check content length:** Should show "> 500 chars"

6. **Click "Confirm Baseline"**

7. **Select "Slide Deck"**

8. **Click "Generate"**

9. **Wait 60-90 seconds**

10. **Check result:**
    - ✓ Should see 6 slides in 2-column grid
    - ✓ Each slide has image
    - ✗ If blank/empty, problem exists

---

### Test 2: Direct Backend Test

```bash
# Run Python test
python test_slides.py
```

**If this passes but UI fails:** Frontend issue
**If this fails:** Backend issue

---

## Known Working Configuration

```env
# .env settings that work
INFOGRAPHIC_IMAGE_PROVIDER=pollinations
ENABLE_PARALLEL_GENERATION=true
MAX_CONCURRENT_IMAGE_GENERATION=3
```

---

## Architecture Flow

1. **User clicks "Generate" → Slide Deck**
2. **Frontend sends POST to /slides endpoint**
   - Includes baseline content
   - Requests 6 slides
3. **Backend calls `renderers/slides.py`**
   - Extracts slide plan using AI
   - Generates 6 images in parallel
   - Returns array of image URLs
4. **Frontend receives response**
   - `data.slide_image_urls` = array of URLs
   - Sets `content` = this array
5. **OutputViewer renders**
   - Maps over array
   - Creates `<img>` for each URL
6. **User sees slides**

---

## Troubleshooting by Symptom

### "Nothing appears after clicking Generate"

**Possible causes:**
1. Content < 500 characters
2. Server not running
3. Network timeout (90+ seconds)
4. JavaScript error preventing render

**Check:**
- Browser console for errors
- Server terminal for logs
- Network tab for /slides request

---

### "Seeing error message"

**Common errors:**

**"Source text required"**
- Content < 500 characters
- Solution: Add more content

**"Failed to fetch" / "Network error"**
- Server not running
- Solution: Run `start.bat`

**"Output generation failed: timeout"**
- Server too slow
- Solution: Reduce slide count or wait longer

---

### "Slides partially visible"

**Possible causes:**
1. Some slides failed to generate
2. CSS/layout issue
3. Image loading errors

**Check:**
- How many slides appear?
- Are some images broken?
- Check browser console for image load errors

---

## Quick Fix Checklist

- [ ] Server running? (`start.bat`)
- [ ] Content > 500 characters?
- [ ] Waited 60-90 seconds?
- [ ] Browser console clear of errors?
- [ ] Network tab shows 200 OK?
- [ ] Response contains `slide_image_urls`?
- [ ] Array is not empty?
- [ ] URLs are valid?

---

## Environment Variables

```bash
# Required for slide generation
INFOGRAPHIC_IMAGE_PROVIDER=pollinations  # or openai
ENABLE_PARALLEL_GENERATION=true          # faster generation
MAX_CONCURRENT_IMAGE_GENERATION=3        # parallel workers

# Optional (for OpenAI provider)
OPENAI_API_KEY=sk-proj-...
```

---

## Next Steps If Still Broken

### 1. Collect Information

Run these commands and save output:

```bash
# Test backend
python test_slides.py > slide_test_output.txt 2>&1

# Check environment
python -c "import sys; print(sys.version)" > python_version.txt
node --version > node_version.txt

# Check if servers are running
curl http://localhost:5000/health > server_health.txt 2>&1
curl http://localhost:5173 > frontend_health.txt 2>&1
```

### 2. Browser Console Screenshot

1. Open Developer Tools (F12)
2. Go to Console tab
3. Click "Generate" for Slide Deck
4. Take screenshot of any errors

### 3. Network Tab Screenshot

1. Open Developer Tools (F12)
2. Go to Network tab
3. Click "Generate" for Slide Deck
4. Find `/slides` request
5. Click it and screenshot Response tab

---

## Contact Information

Include this information when reporting issues:

- Content length used: _____ characters
- Error message (if any): _____
- Browser console errors: _____
- Backend test result: Pass / Fail
- Server logs: _____

---

**Version:** 2.0.3
**Date:** 2026-01-15
**Status:** Diagnostic guide created
