# 🚀 How to Start the Application

## Quick Reference

**You need TWO terminal windows running simultaneously:**

### Terminal 1: Flask Backend
```bash
python server.py
```
**Runs on:** http://localhost:5000
**Purpose:** API server (handles content processing, AI generation, etc.)

### Terminal 2: Vite Frontend
```bash
npm run dev
```
**Runs on:** http://localhost:3002
**Purpose:** Web interface (what you see in the browser)

---

## Open in Browser

🌐 **Visit:** http://localhost:3002

**NOT** http://localhost:5000 (that's just the API)
**NOT** http://localhost:3000 (old port, no longer used)

---

## Correct Startup Sequence

1. **Start Terminal 1 (Backend):**
   ```bash
   cd D:\QLSV2-Learning-Studio-Builder
   python server.py
   ```

   Wait for:
   ```
   ============================================================
    Learning Studio Builder Server Starting
   ============================================================
   Backend Port: 5000
   ...
   🌐 Open your BROWSER at: http://localhost:3002
   ============================================================
   ```

2. **Start Terminal 2 (Frontend):**
   ```bash
   cd D:\QLSV2-Learning-Studio-Builder
   npm run dev
   ```

   Wait for:
   ```
   VITE v6.x.x  ready in xxx ms

   ➜  Local:   http://localhost:3002/
   ➜  Network: use --host to expose
   ```

3. **Open Browser:**
   ```
   http://localhost:3002
   ```

---

## Common Mistakes

❌ **Opening http://localhost:5000**
- This shows raw JSON responses, not the UI
- You'll see `{"status": "healthy", ...}` text

❌ **Opening http://localhost:3000**
- Old port, nothing runs there anymore
- You'll get "connection refused"

✅ **Opening http://localhost:3002**
- This is the correct frontend URL
- You'll see the full Learning Studio UI

---

## Port Reference

| Port | Service | What It Does | Open in Browser? |
|------|---------|--------------|------------------|
| **5000** | Flask Backend | API server | ❌ No |
| **3002** | Vite Frontend | Web UI | ✅ YES |
| 3000 | (unused) | Old frontend | ❌ No |
| 3001 | (unused) | Express proxy | ❌ No |

---

## Troubleshooting

### "Connection refused" on localhost:3002

**Cause:** Frontend (Vite) is not running

**Solution:**
```bash
# In Terminal 2
npm run dev
```

### "Failed to fetch" errors in browser

**Cause:** Backend (Flask) is not running

**Solution:**
```bash
# In Terminal 1
python server.py
```

### "CORS policy" errors

**Cause:** Servers need to be restarted after config changes

**Solution:**
```bash
# Stop both servers (Ctrl+C in each terminal)
# Then restart:

# Terminal 1
python server.py

# Terminal 2
npm run dev
```

---

## Windows Batch Files (Alternative)

If you have `start.bat` in your project:

```bash
# Just double-click start.bat
# It will start both servers and open browser automatically
```

---

## Stopping the Servers

**To stop gracefully:**
- Press `Ctrl+C` in each terminal window

**To force stop (if frozen):**
- Windows: `Ctrl+C` twice, or close terminal
- Task Manager → Find Python/Node processes → End Task

---

## Summary

1. Start Flask: `python server.py` → runs on port 5000
2. Start Vite: `npm run dev` → runs on port 3002
3. Open browser: **http://localhost:3002**
4. Both must be running simultaneously

That's it! 🎉
