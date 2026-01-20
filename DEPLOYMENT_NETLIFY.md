# Learning Studio Builder - Netlify Deployment Guide

## 🚀 Quick Start

### Prerequisites
- **Netlify Account**: Free account at netlify.com
- **GitHub Repository**: Push your code to GitHub
- **Backend Hosting**: Render/Railway account for Flask backend

---

## 📋 Deployment Steps

### Step 1: Prepare Backend (Render Recommended)

1. **Create Render Account**
   - Sign up at render.com
   - Connect your GitHub repository

2. **Deploy Flask Backend**
   ```bash
   # Create new Web Service on Render
   # Select your repository
   # Configure build settings:

   Runtime: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: python server.py

   # Add Environment Variables:
   FLASK_PORT=5000
   FLASK_ENV=production
   GEMINI_API_KEY=your_key_here
   POLLINATIONS_API_KEY=your_key_here
   OPENAI_API_KEY=your_key_here
   ALLOWED_ORIGINS=https://your-netlify-site.netlify.app
   ```

3. **Get Backend URL**
   - After deployment: `https://your-app-name.onrender.com`
   - Copy this URL for frontend configuration

### Step 2: Deploy Frontend to Netlify

#### Option A: GitHub Integration (Recommended)

1. **Connect Repository**
   - Go to netlify.com and sign in
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub repository

2. **Configure Build Settings**
   ```
   Base directory: (leave empty)
   Build command: npm run build
   Publish directory: dist
   ```

3. **Environment Variables**
   Add these in Site settings → Environment variables:
   ```
   VITE_API_BASE_URL=https://your-backend-app.onrender.com
   OPENAI_API_KEY=your_openai_key_here
   POLLINATIONS_API_KEY=your_pollinations_key_here
   ```

4. **Custom Domain** (Optional)
   - Go to Site settings → Domain management
   - Add custom domain or use netlify.app subdomain

#### Option B: Manual Deploy (Alternative)

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Build the project
npm run build

# Deploy to Netlify
netlify deploy --prod --dir=dist
```

### Step 3: Update Backend CORS

After frontend deployment, update your backend's `ALLOWED_ORIGINS`:

```bash
# In Render environment variables:
ALLOWED_ORIGINS=https://your-site-name.netlify.app
```

---

## ⚙️ Configuration Details

### Netlify Configuration (`netlify.toml`)

The `netlify.toml` file handles:
- Build commands and output directory
- API proxy redirects to backend
- SPA routing (client-side routing)
- Security headers and caching

### Environment Variables

**Required for Frontend:**
```
VITE_API_BASE_URL=https://your-backend-url.com
```

**Optional for Enhanced Features:**
```
OPENAI_API_KEY=sk-your-key-here
POLLINATIONS_API_KEY=your-pollinations-key
```

### Backend Environment Variables (Render/Railway)

```
FLASK_PORT=5000
FLASK_ENV=production
GEMINI_API_KEY=your_gemini_key
ALLOWED_ORIGINS=https://your-netlify-site.netlify.app
ENABLE_CACHING=true
ENABLE_PARALLEL_GENERATION=true
```

---

## 🔧 Build Optimization

### Bundle Analysis

The build creates optimized assets:
- `index.html`: Main HTML file
- `assets/index-*.js`: Main application bundle (~590KB gzipped)
- `assets/index-*.css`: Styles bundle (~25KB gzipped)

### Performance Features

- **Code Splitting**: Automatic chunk splitting
- **Asset Optimization**: Minified and compressed files
- **Caching Headers**: Long-term caching for static assets
- **Security Headers**: XSS protection, frame options, etc.

---

## 🌐 Custom Domain Setup

1. **Purchase Domain**
   - Buy domain from Namecheap, GoDaddy, etc.

2. **Configure Netlify**
   - Site settings → Domain management → Add custom domain
   - Follow Netlify's DNS configuration instructions

3. **Update Backend CORS**
   ```
   ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
   ```

---

## 🔍 Troubleshooting

### Issue: API Calls Failing

**Symptoms**: Frontend loads but API requests fail

**Solutions**:
1. Check `VITE_API_BASE_URL` environment variable
2. Verify backend is running and accessible
3. Check CORS settings on backend
4. Ensure backend allows your Netlify domain

**Debug Commands**:
```bash
# Test backend connectivity
curl https://your-backend-url.onrender.com/health

# Check environment variables in Netlify dashboard
# Site settings → Environment variables
```

### Issue: Build Failing

**Symptoms**: Netlify build fails

**Solutions**:
1. Check build logs in Netlify dashboard
2. Ensure all dependencies are in `package.json`
3. Verify Node.js version (18+ required)
4. Check for missing environment variables

### Issue: 404 on Refresh

**Symptoms**: Direct URL access returns 404

**Solution**: The `netlify.toml` includes SPA fallback rules to handle client-side routing.

### Issue: Slow Loading

**Symptoms**: Site loads slowly

**Solutions**:
1. Enable Netlify's CDN (automatic)
2. Optimize images and assets
3. Consider code splitting for large bundles
4. Use Netlify's build caching

---

## 📊 Monitoring & Analytics

### Netlify Analytics (Free)

- Go to Site settings → Analytics
- Enable Netlify Analytics for traffic insights

### Custom Monitoring

Add monitoring to your backend:
- Health check endpoint: `/health`
- Readiness check: `/ready`
- Metrics endpoint: `/metrics`

---

## 🔄 Deployment Workflow

### Automatic Deployments

Netlify automatically deploys when you push to main branch:
1. Push code to GitHub
2. Netlify detects changes and starts build
3. Build completes and site updates
4. Test the live site

### Manual Deployments

For urgent fixes:
```bash
# Deploy specific directory
netlify deploy --prod --dir=dist

# Or deploy from build
npm run build && netlify deploy --prod
```

### Rollbacks

- Go to Deploys tab in Netlify dashboard
- Click on previous deploy → "Publish deploy"
- Or use Netlify CLI: `netlify deploy --prod --dir=dist`

---

## 💰 Cost Optimization

### Free Tier Limits
- **Netlify**: 100GB bandwidth, 300 build minutes/month
- **Render**: 750 hours/month free, then $7/month
- **Railway**: $5/month for hobby plan

### Cost Saving Tips
1. Use free tiers effectively
2. Optimize bundle size to reduce bandwidth
3. Set up build hooks only when needed
4. Monitor usage in dashboard

---

## 🚀 Advanced Features

### Build Hooks

Trigger deployments programmatically:
1. Site settings → Build & deploy → Build hooks
2. Create hook with name and branch
3. Use webhook URL in CI/CD or external services

### Branch Deploys

Deploy feature branches:
- Automatic for all branches
- Access at `branch-name--site-name.netlify.app`

### Form Handling

If you add contact forms:
- Netlify automatically handles form submissions
- Configure in Site settings → Forms

---

## 📝 Post-Deployment Checklist

- [ ] Frontend loads correctly
- [ ] API calls work (test infographic generation)
- [ ] No console errors in browser dev tools
- [ ] Mobile responsive design works
- [ ] Custom domain configured (if applicable)
- [ ] HTTPS enabled (automatic on Netlify)
- [ ] Backend CORS allows Netlify domain
- [ ] Environment variables properly set
- [ ] Build succeeds on new commits

---

## 🆘 Support Resources

- **Netlify Docs**: netlify.com/docs
- **Render Docs**: docs.render.com
- **Railway Docs**: docs.railway.app
- **Community Forums**: answers.netlify.com

---

**Version**: 2.0.0
**Last Updated**: 2026-01-19
