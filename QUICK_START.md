# ⚡ Quick Start Guide
**Learning Studio Builder v2.0.1**

## 🎯 EASIEST METHOD (Windows Users)

### Just Double-Click! 🖱️

**First time setup**:
1. Double-click `setup.bat`
2. Wait for installation to complete

**Every time you want to run the app**:
1. Double-click `start.bat`
2. Application opens automatically in browser!

**When you're done**:
1. Double-click `stop.bat`

✅ **That's it!** See [BATCH_COMMANDS.md](BATCH_COMMANDS.md) for details.

---

## 🚀 Alternative: Manual Method (5 Minutes)

### 1. Setup Environment (2 minutes)
```bash
# Navigate to project
cd D:\QLSV2-Learning-Studio-Builder

# Copy environment template
cp .env.example .env

# Edit .env and add your API key (minimum required)
# GEMINI_API_KEY=your_key_here
```

### 2. Install Dependencies (2 minutes)
```bash
# Frontend
npm install

# Backend
pip install -r requirements.txt
```

### 3. Start Application (1 minute)
```bash
# Terminal 1: Start backend
python server.py

# Terminal 2: Start frontend
npm run dev
```

### 4. Access Application
Open browser: **http://localhost:3000**

---

## 🎯 Quick Test

### Test Slideshow Feature (CRITICAL)
1. Paste this content:
   ```
   Artificial intelligence is transforming modern education through personalized learning experiences. Machine learning algorithms analyze student performance data to identify strengths and weaknesses, enabling educators to tailor instruction to individual needs. Adaptive learning platforms adjust difficulty levels in real-time, ensuring optimal challenge and engagement. Natural language processing powers intelligent tutoring systems that provide instant feedback. Computer vision enables automated grading of assignments and assessments. Virtual reality creates immersive learning environments that enhance understanding of complex concepts. AI-powered chatbots offer 24/7 student support and answer common questions. Predictive analytics help identify at-risk students early, allowing timely intervention. Content recommendation engines suggest relevant learning materials based on student interests and progress.
   ```

2. Click **"Confirm Baseline"**

3. Select **"Slideshow"** output type

4. Click **"Generate"**

5. **✅ Expected**: 6 slides generate in 10-15 seconds
   **❌ Not Expected**: "Content synthesis available soon" message

---

## ✅ Verification Checklist

After starting the application:

### Backend Health
```bash
curl http://localhost:5000/health
# Should return: {"status": "healthy", ...}
```

### Frontend Access
- [ ] Frontend loads at http://localhost:3000
- [ ] No console errors (F12 Developer Tools)
- [ ] UI renders correctly

### Feature Tests
- [ ] Infographic generates successfully
- [ ] **Slideshow generates (NOT placeholder)**
- [ ] Report generates successfully
- [ ] Podcast script generates successfully

---

## 🐛 Troubleshooting

### "Connection refused" error
**Solution**: Backend not running
```bash
python server.py
```

### "Source text required" error
**Solution**: Need 500+ characters minimum
- Use the sample content provided above

### Slideshow shows "Content synthesis available soon"
**Solution**: Code not properly updated
```bash
# Verify App.tsx has been modified
grep -n "API_ENDPOINTS.SLIDES" App.tsx
# Should show line with API call (around line 356)
```

### Port already in use
**Solution**: Change port in .env
```bash
# In .env file
FLASK_PORT=5001  # or any available port
```

---

## 📚 Next Steps

### Essential Reading
1. **AUDIT_SUMMARY.md** - What was fixed and why
2. **DEPLOYMENT.md** - Full deployment guide
3. **TESTING_GUIDE.md** - Comprehensive testing procedures

### Configuration
- Review `.env.example` for all available options
- Set `ENABLE_PARALLEL_GENERATION=true` for 3x faster slides
- Configure `MAX_CONCURRENT_IMAGE_GENERATION` based on API limits

### Production Deployment
Follow the Docker deployment instructions in `DEPLOYMENT.md`

---

## 🆘 Need Help?

**Quick Checks**:
```bash
# 1. Verify backend is running
curl http://localhost:5000/health

# 2. Check backend logs
# Look for startup banner and any error messages

# 3. Check frontend console
# Open browser DevTools (F12) → Console tab
```

**Documentation**:
- **Setup Issues**: See DEPLOYMENT.md
- **Feature Testing**: See TESTING_GUIDE.md
- **Understanding Changes**: See AUDIT_SUMMARY.md

**GitHub Issues**: https://github.com/anthropics/claude-code/issues

---

## 🎉 Success Indicators

You're ready to go when:
- ✅ Backend shows startup banner with configuration
- ✅ Frontend loads without errors
- ✅ Health check returns 200 OK
- ✅ **Slideshow actually generates slides**
- ✅ Infographic displays image
- ✅ No critical console errors

---

**Ready to build amazing learning content!** 🚀

---

**Version**: 2.0.0 | **Updated**: 2026-01-15
