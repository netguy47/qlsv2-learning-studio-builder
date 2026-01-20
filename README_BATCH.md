# 🚀 Super Easy Setup with Batch Files!

## One-Click Application Launch

This project includes **5 convenient batch files** that make running the application incredibly easy on Windows. No need to manage multiple terminal windows or remember complex commands!

---

## 📦 Available Batch Files

### 🔧 `setup.bat` - First Time Setup
**Run this once to install everything**

```batch
Double-click: setup.bat
```

**Automatically does**:
- ✅ Checks Python and Node.js installation
- ✅ Installs all dependencies
- ✅ Creates configuration files
- ✅ Tests the build

**Time**: 2-5 minutes (one time only)

---

### ▶️ `start.bat` - Launch Application
**Your daily driver - just double-click!**

```batch
Double-click: start.bat
```

**Automatically does**:
- ✅ Starts backend server (Flask)
- ✅ Starts frontend server (Vite)
- ✅ Opens browser to http://localhost:3000
- ✅ Shows you when everything is ready

**Time**: 10 seconds

**Visual**:
```
┌─────────────────────────────────────┐
│ Terminal 1: Backend Server          │
│ Running on http://localhost:5000    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Terminal 2: Frontend Server         │
│ Running on http://localhost:3000    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Browser: Automatically Opens!       │
│ http://localhost:3000               │
└─────────────────────────────────────┘
```

---

### ⏹️ `stop.bat` - Stop All Servers
**Clean shutdown of everything**

```batch
Double-click: stop.bat
```

**Automatically does**:
- ✅ Stops backend server
- ✅ Stops frontend server
- ✅ Cleans up processes

**Time**: 2 seconds

---

### 📦 `build.bat` - Production Build
**Create optimized production bundle**

```batch
Double-click: build.bat
```

**Automatically does**:
- ✅ Builds optimized JavaScript
- ✅ Optimizes CSS (99% smaller!)
- ✅ Creates `dist/` folder
- ✅ Shows bundle size statistics

**Output**: Production-ready files in `dist/` folder

---

### 🔨 `dev.bat` - Development Mode
**Alternative single-window mode**

```batch
Double-click: dev.bat
```

**Automatically does**:
- ✅ Starts both servers in one window
- ✅ Shows frontend logs
- ✅ Ctrl+C stops everything

**Time**: 10 seconds

---

## 🎯 How to Use

### First Time Setup (Do This Once)

1. **Navigate to project folder**:
   ```
   D:\QLSV2-Learning-Studio-Builder
   ```

2. **Double-click `setup.bat`**

3. **Wait for installation to complete** (2-5 minutes)

4. **Done!** ✅

---

### Daily Usage (Every Time You Want to Use the App)

1. **Double-click `start.bat`**

2. **Wait 10 seconds** - Application opens automatically!

3. **Use the application** at http://localhost:3000

4. **When done, double-click `stop.bat`**

---

## 🎨 Visual Workflow

```
┌─────────────────────────────────────────────────────────┐
│                    FIRST TIME                           │
│                                                         │
│  1. Double-click setup.bat                             │
│  2. Wait for installation                              │
│  3. Done! ✅                                           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    DAILY USE                            │
│                                                         │
│  1. Double-click start.bat                             │
│  2. Browser opens automatically                        │
│  3. Use the application                                │
│  4. Double-click stop.bat when done                    │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 Complete File List

| File | Purpose | When to Use |
|------|---------|-------------|
| `setup.bat` | Install dependencies | First time only |
| `start.bat` | Start application | Every time you run the app |
| `stop.bat` | Stop servers | When you're done |
| `build.bat` | Build for production | Before deployment |
| `dev.bat` | Single-window mode | Alternative to start.bat |

---

## 💡 Pro Tips

### Create Desktop Shortcut
1. Right-click `start.bat`
2. Send to → Desktop (create shortcut)
3. Now you can launch from your desktop!

### Pin to Taskbar (Windows 10/11)
1. Right-click `start.bat`
2. Pin to taskbar
3. One-click launch!

### Keyboard Shortcut
1. Right-click desktop shortcut
2. Properties → Shortcut tab
3. Set Shortcut key (e.g., Ctrl+Alt+L)
4. Apply

---

## 🐛 Troubleshooting

### "Python is not installed"
**Solution**: Install Python from https://www.python.org/
- Make sure to check "Add Python to PATH" during installation

### "Node.js is not installed"
**Solution**: Install Node.js from https://nodejs.org/

### Port already in use
**Solution**:
```batch
1. Double-click stop.bat
2. Wait 5 seconds
3. Double-click start.bat again
```

### Servers won't stop
**Solution**: Double-click `stop.bat` twice

---

## 📖 Documentation

For more details, see:
- **BATCH_COMMANDS.md** - Complete guide to batch files
- **QUICK_START.md** - Quick start guide
- **DEPLOYMENT.md** - Production deployment guide

---

## ✨ Why Batch Files Are Awesome

### ❌ Before (Manual Method)
```
1. Open Terminal 1
2. cd D:\QLSV2-Learning-Studio-Builder
3. python server.py
4. Open Terminal 2
5. cd D:\QLSV2-Learning-Studio-Builder
6. npm run dev
7. Wait...
8. Open browser
9. Navigate to http://localhost:3000
```

### ✅ After (With Batch Files)
```
1. Double-click start.bat
2. Everything happens automatically!
```

**Saved**: 5 minutes and 9 steps! 🎉

---

## 🚀 Summary

**Super Simple Workflow**:
1. First time: Double-click `setup.bat`
2. Daily use: Double-click `start.bat`
3. When done: Double-click `stop.bat`

**That's all you need to remember!**

---

**Version**: 2.0.1
**Created**: 2026-01-15
**Platform**: Windows
