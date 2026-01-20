# QLSV2 Learning Studio - Vercel Deployment Guide

## Prerequisites
- Vercel account (free tier available)
- Git repository (GitHub, GitLab, or Bitbucket)
- Backend hosting (see Backend section below)

## Quick Start

### 1. Deploy Frontend to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel
```

### 2. Configure Environment Variables

In Vercel dashboard, add these environment variables:

```
VITE_API_BASE_URL=https://your-backend-url.com
OPENAI_API_KEY=your_openai_key
POLLINATIONS_API_KEY=your_pollinations_key
```

### 3. Backend Hosting Options

**Option A: Vercel Serverless Functions (Recommended for small apps)**
- Convert Flask endpoints to Vercel API routes
- Create `api/` directory with serverless functions
- Limited to 10-15 second execution time

**Option B: Separate Backend Hosting**
- Deploy Flask to Railway, Render, or Heroku
- Update `VITE_API_BASE_URL` to point to backend URL
- Better for long-running operations (slide generation, etc.)

**Option C: Hybrid Approach**
- Frontend on Vercel
- Backend on Railway/Render
- API calls go to backend URL

## Backend Deployment (Railway Example)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add Python service
railway add

# Set environment variables
railway variables set OPENAI_API_KEY=your_key
railway variables set POLLINATIONS_API_KEY=your_key

# Deploy
railway up
```

## Production Build

```bash
# Build locally to test
npm run build

# Preview production build
npm run preview
```

## Vercel Configuration

The `vercel.json` file handles:
- Build commands
- API rewrites (if using serverless functions)
- Environment variable mapping

## Troubleshooting

### API Calls Failing
- Check `VITE_API_BASE_URL` is set correctly
- Verify backend is accessible from Vercel domain
- Check CORS settings on backend

### Build Errors
- Ensure all dependencies are in package.json
- Check TypeScript configuration
- Verify Vite build configuration

### Environment Variables Not Working
- Variables must start with `VITE_` to be accessible in client code
- Restart deployment after adding variables
- Check Vercel dashboard for variable values

## Next Steps

1. Choose backend hosting strategy
2. Deploy backend and get URL
3. Update Vercel environment variables
4. Deploy frontend to Vercel
5. Test production deployment
6. Set up custom domain (optional)
