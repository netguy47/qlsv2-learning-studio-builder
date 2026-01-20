<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Learning Studio Builder

An AI-powered learning content generation platform that creates infographics, slideshows, reports, and podcasts from any text input.

View your app in AI Studio: https://ai.studio/apps/drive/15bDxILJo7SxUHWb6Wsl4YEU6e1Wm77PH

## 🚀 Quick Start

### Run Locally

**Prerequisites:** Node.js 18+, Python 3.8+

1. **Clone and install dependencies:**
   ```bash
   git clone <your-repo-url>
   cd qlsv2-learning-studio-builder
   npm install
   pip install -r requirements.txt
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys (at minimum GEMINI_API_KEY)
   ```

3. **Start the application:**
   ```bash
   # Terminal 1: Start backend
   python server.py

   # Terminal 2: Start frontend
   npm run dev
   ```

4. **Open your browser:** http://localhost:3000

## ☁️ Deploy to Cloud

### Netlify + Render (Recommended)

**Frontend (Netlify):**
- Connect your GitHub repo to Netlify
- Build command: `npm run build`
- Publish directory: `dist`
- Environment variable: `VITE_API_BASE_URL=https://your-backend.onrender.com`

**Backend (Render):**
- Deploy Flask app to Render.com
- Build command: `pip install -r requirements.txt`
- Start command: `python server.py`
- See [DEPLOYMENT_NETLIFY.md](DEPLOYMENT_NETLIFY.md) for details

### Vercel + Railway (Alternative)

**Frontend (Vercel):**
- Import repo to Vercel
- Automatic deployment on git push

**Backend (Railway):**
- Deploy Flask backend to Railway
- See [DEPLOYMENT_VERCEL.md](DEPLOYMENT_VERCEL.md) for details

## 📚 Documentation

- [Testing Guide](TESTING_GUIDE.md) - Comprehensive testing checklist
- [Deployment Guide (Netlify)](DEPLOYMENT_NETLIFY.md) - Netlify deployment instructions
- [Deployment Guide (Vercel)](DEPLOYMENT_VERCEL.md) - Vercel deployment instructions
- [Quick Start Guide](QUICK_START.md) - Basic usage instructions

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS
- **Backend:** Flask (Python), AI APIs (Gemini, OpenAI, Pollinations)
- **Charts:** Recharts for data visualization
- **Deployment:** Netlify/Vercel + Render/Railway
