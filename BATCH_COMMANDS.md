# Batch Command Guide

## 🚀 Quick Start Commands

This project includes convenient batch files to simplify running the application on Windows.

---

## 📁 Available Commands

### `setup.bat` - First Time Setup
**Run this FIRST before anything else!**

```bash
setup.bat
```

**What it does**:
- ✅ Checks if Python and Node.js are installed
- ✅ Installs all Python dependencies (`pip install -r requirements.txt`)
- ✅ Installs all Node.js dependencies (`npm install`)
- ✅ Creates `.env` configuration file from template
- ✅ Tests the production build process
- ✅ Verifies everything is set up correctly

**When to use**:
- First time setting up the project
- After cloning the repository
- If dependencies get corrupted

---

### `start.bat` - Start Application (Recommended)
**The easiest way to run the app!**

```bash
start.bat
```

**What it does**:
- ✅ Loads environment variables from `.env`
- ✅ Starts Flask backend in a new window (port 5000)
- ✅ Starts Vite frontend in a new window (port 3000)
- ✅ Automatically opens browser to http://localhost:3000
- ✅ Shows status messages and keeps monitoring window open

**Features**:
- Opens two separate terminal windows (easy to see logs)
- Auto-opens browser when ready
- Checks dependencies before starting
- Waits for servers to initialize before opening browser

**When to use**:
- Every time you want to run the application
- Daily development work
- Testing features

---

### `stop.bat` - Stop All Servers

```bash
stop.bat
```

**What it does**:
- ✅ Stops all Flask backend processes
- ✅ Stops all Vite frontend processes
- ✅ Kills any orphaned Python/Node processes
- ✅ Cleans up gracefully

**When to use**:
- When you want to stop the application
- Before running `start.bat` again
- If servers are stuck/frozen
- Before shutting down your computer

---

### `build.bat` - Build for Production

```bash
build.bat
```

**What it does**:
- ✅ Builds optimized production bundle
- ✅ Creates `dist/` folder with production files
- ✅ Minifies JavaScript and CSS
- ✅ Optimizes assets for deployment
- ✅ Shows build size statistics

**Output**: `dist/` folder containing production-ready files

**When to use**:
- Before deploying to production
- Testing production build
- Checking bundle sizes

---

### `dev.bat` - Development Mode (Single Window)

```bash
dev.bat
```

**What it does**:
- ✅ Starts backend in background
- ✅ Starts frontend in foreground (same window)
- ✅ Shows frontend logs in the terminal
- ✅ Stops both when you press Ctrl+C

**Difference from `start.bat`**:
- Single terminal window (vs separate windows)
- Shows only frontend logs (backend runs silently)
- More minimal approach

**When to use**:
- If you prefer single terminal window
- When you only need to see frontend logs
- Minimal setup for quick testing

---

## 🎯 Typical Workflow

### First Time Setup
```bash
# 1. Run setup (only needed once)
setup.bat

# 2. (Optional) Edit .env file to add API keys
notepad .env

# 3. Start the application
start.bat
```

### Daily Usage
```bash
# Just double-click start.bat or run:
start.bat

# When done, double-click stop.bat or run:
stop.bat
```

### Before Deployment
```bash
# Build for production
build.bat

# Deploy the 'dist' folder to your server
```

---

## 🔧 Troubleshooting

### Problem: "Python is not installed or not in PATH"
**Solution**:
1. Install Python from https://www.python.org/
2. During installation, check "Add Python to PATH"
3. Restart terminal/command prompt
4. Run `setup.bat` again

---

### Problem: "Node.js is not installed or not in PATH"
**Solution**:
1. Install Node.js from https://nodejs.org/
2. Restart terminal/command prompt
3. Run `setup.bat` again

---

### Problem: Servers won't stop
**Solution**:
```bash
# Run stop.bat twice
stop.bat
stop.bat

# Or manually kill processes
taskkill /F /IM python.exe
taskkill /F /IM node.exe
```

---

### Problem: Port already in use
**Solution**:
```bash
# Stop all servers
stop.bat

# Wait 5 seconds

# Start again
start.bat
```

Or change ports in `.env`:
```bash
FLASK_PORT=5001
```

---

### Problem: "Failed to install dependencies"
**Solution**:
```bash
# Clear caches
rd /s /q node_modules
del package-lock.json

# Run setup again
setup.bat
```

---

### Problem: Browser doesn't open automatically
**Solution**:
- Manually open: http://localhost:3000
- Check if servers started successfully (look at terminal windows)
- Run `stop.bat` then `start.bat` again

---

## 📋 What Each Command Does Behind the Scenes

### `setup.bat` Flow
```
1. Check Python installed → python --version
2. Check Node.js installed → node --version
3. Install Python deps → pip install -r requirements.txt
4. Install Node deps → npm install
5. Create .env → copy .env.example .env
6. Test build → npm run build
7. Success message
```

### `start.bat` Flow
```
1. Check Python and Node installed
2. Check if node_modules exists
3. Load .env file into environment
4. Open new terminal → python server.py
5. Wait 3 seconds
6. Open new terminal → npm run dev
7. Wait 5 seconds
8. Open browser → http://localhost:3000
9. Keep monitoring window open
```

### `stop.bat` Flow
```
1. Kill Flask windows by title
2. Kill Python processes (backend)
3. Kill Vite windows by title
4. Kill Node processes (frontend)
5. Success message
```

---

## 🎨 Environment Variables

The batch files automatically load variables from `.env` file:

```bash
# Backend Configuration
FLASK_PORT=5000
FLASK_ENV=development

# API Keys
GEMINI_API_KEY=your_key_here
OPENAI_API_KEY=optional

# Image Provider
INFOGRAPHIC_IMAGE_PROVIDER=pollinations

# Performance
ENABLE_PARALLEL_GENERATION=true
MAX_CONCURRENT_IMAGE_GENERATION=3

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

To use custom settings:
1. Edit `.env` file
2. Restart servers: `stop.bat` then `start.bat`

---

## 💡 Pro Tips

### Tip 1: Create Desktop Shortcuts
Right-click `start.bat` → Send to → Desktop (create shortcut)

### Tip 2: Run from Any Folder
```bash
# From anywhere in command prompt:
cd D:\QLSV2-Learning-Studio-Builder
start.bat
```

### Tip 3: Quick Restart
```bash
stop.bat && timeout /t 3 && start.bat
```

### Tip 4: Check if Running
```bash
# Open task manager (Ctrl+Shift+Esc)
# Look for:
# - python.exe (backend)
# - node.exe (frontend)
```

### Tip 5: View Server Logs
After running `start.bat`, check the two terminal windows:
- **Backend window**: Flask API logs, image generation, errors
- **Frontend window**: Vite dev server, build messages, HMR updates

---

## 🚦 Status Indicators

### Backend Running Successfully
```
============================================================
🚀 Learning Studio Builder Server Starting
============================================================
Port: 5000
Debug Mode: True
Image Provider: pollinations
CORS Origins: http://localhost:3000, http://localhost:5173
============================================================

 * Running on http://127.0.0.1:5000
```

### Frontend Running Successfully
```
  VITE v6.2.0  ready in 500 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

### Application Ready
- Browser opens automatically to http://localhost:3000
- You see the Learning Studio Builder interface
- No console errors in browser (F12)

---

## 📞 Quick Reference

| Need to... | Command | Time |
|------------|---------|------|
| First setup | `setup.bat` | 2-5 min |
| Start app | `start.bat` | 10 sec |
| Stop app | `stop.bat` | 2 sec |
| Build production | `build.bat` | 20 sec |
| Dev mode (single window) | `dev.bat` | 10 sec |

---

## 🔗 Related Documentation

- **QUICK_START.md** - 5-minute setup guide
- **DEPLOYMENT.md** - Production deployment guide
- **TESTING_GUIDE.md** - Testing procedures
- **TAILWIND_UPGRADE.md** - CSS configuration details

---

## ✨ Summary

**Simplest workflow**:
1. Run `setup.bat` once
2. Run `start.bat` every time you want to use the app
3. Run `stop.bat` when you're done

That's it! The batch files handle all the complexity for you.

---

**Created**: 2026-01-15
**Version**: 2.0.1
