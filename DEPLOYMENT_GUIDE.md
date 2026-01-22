# QLSV2 Learning Studio - iOS App Store Deployment Guide

## ✅ Issues Fixed

### 1. CORS Error Resolution
**Problem:** Frontend (port 3002) couldn't communicate with Flask backend (port 5000)

**Solutions Applied:**
- ✅ Updated `.env` to include `http://localhost:3002` in `ALLOWED_ORIGINS`
- ✅ Changed all hardcoded `http://localhost:5000` URLs to relative paths in `App.tsx`
- ✅ Updated `config.ts` to use relative URLs for all environments
- ✅ Added comprehensive proxy configuration in `vite.config.ts`

### 2. Files Modified
- `.env` - Added port 3002 to CORS allowed origins
- `App.tsx` - Replaced all absolute URLs with relative paths
- `config.ts` - Updated to use relative URLs by default
- `vite.config.ts` - Added proxies for all backend endpoints

---

## 🚀 Deployment Steps for iOS App Store

### Prerequisites
1. Apple Developer Account ($99/year)
2. Xcode installed (latest version)
3. macOS machine for iOS build
4. Backend deployed to production server

---

## Step 1: Deploy Backend to Production

### Option A: Deploy to Vercel (Recommended)

1. **Install Vercel CLI:**
```bash
npm install -g vercel
```

2. **Configure Vercel:**
Create `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.py"
    }
  ],
  "env": {
    "FLASK_ENV": "production",
    "POLLINATIONS_API_KEY": "@pollinations_api_key",
    "OPENAI_API_KEY": "@openai_api_key",
    "ALLOWED_ORIGINS": "*"
  }
}
```

3. **Deploy:**
```bash
vercel --prod
```

4. **Note your production URL:**
Example: `https://qlsv2-learning-studio-builder.vercel.app`

### Option B: Deploy to Render.com

1. Create account at render.com
2. Create new Web Service
3. Connect your GitHub repository
4. Configure:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn server:app`
   - Environment Variables: Copy from `.env`
5. Deploy and note the URL

### Option C: Deploy to Railway

1. Create account at railway.app
2. Create new project from GitHub
3. Set environment variables
4. Deploy and note the URL

---

## Step 2: Update Capacitor Configuration

1. **Update `capacitor.config.ts` with your production URL:**

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourcompany.qlsv2',
  appName: 'QLSV2 Learning Studio',
  webDir: 'dist',
  server: {
    // Replace with your actual production URL
    url: 'https://your-production-backend.vercel.app',
    cleartext: false
  }
};

export default config;
```

2. **Important:** Change `appId` to your unique identifier:
   - Format: `com.yourcompany.appname`
   - Must match Apple Developer Portal

---

## Step 3: Build Frontend for Production

1. **Build the Vite app:**
```bash
npm run build
```

2. **Verify build:**
```bash
# Check that dist folder is created
ls dist
```

---

## Step 4: Sync with Capacitor

1. **Install Capacitor iOS if not already:**
```bash
npm install @capacitor/ios
npx cap add ios
```

2. **Copy web assets to iOS:**
```bash
npx cap sync ios
```

3. **Update iOS configuration:**
```bash
npx cap copy ios
```

---

## Step 5: Configure iOS Project in Xcode

1. **Open Xcode project:**
```bash
npx cap open ios
```

2. **Configure Project Settings:**
   - Click on project name in left sidebar
   - Under "Signing & Capabilities":
     - Select your Team (Apple Developer Account)
     - Check "Automatically manage signing"
     - Verify Bundle Identifier matches `appId` from capacitor.config.ts

3. **Update Info.plist permissions:**
   - Open `Info.plist`
   - Add required permissions:
     - `NSCameraUsageDescription` - "This app needs camera access"
     - `NSPhotoLibraryUsageDescription` - "This app needs photo library access"
     - `NSMicrophoneUsageDescription` - "This app needs microphone access"

4. **Configure App Transport Security:**
   - In `Info.plist`, ensure HTTPS is enforced
   - Remove any `NSAllowsArbitraryLoads` entries

---

## Step 6: Test on iOS Simulator

1. **Select iOS Simulator:**
   - In Xcode, choose a simulator (iPhone 15 Pro, etc.)
   - Click Run button (▶️)

2. **Test all features:**
   - URL preview
   - Content ingestion
   - Report generation
   - Podcast generation
   - Infographic generation
   - Slide deck generation

3. **Verify network calls:**
   - Open Safari on Mac → Develop → Simulator → Web Inspector
   - Check that all API calls go to production backend
   - Verify no CORS errors

---

## Step 7: Test on Physical Device

1. **Connect iPhone via USB**

2. **Trust device:**
   - On iPhone: Settings → General → Device Management
   - Trust your developer certificate

3. **Select device in Xcode:**
   - Choose your connected iPhone
   - Click Run

4. **Test thoroughly:**
   - All input types (URL, YouTube, Paste)
   - All output formats
   - Image generation
   - Audio playback
   - Export functionality

---

## Step 8: Prepare for App Store Submission

### 1. Create App Store Connect Record

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click "My Apps" → "+" → "New App"
3. Fill in:
   - Platform: iOS
   - Name: QLSV2 Learning Studio
   - Primary Language: English
   - Bundle ID: (select from dropdown - must match Xcode)
   - SKU: Unique identifier (e.g., QLSV2-001)
   - User Access: Full Access

### 2. Prepare App Metadata

Create the following:

**App Description (4000 char max):**
```
Transform any content into engaging educational materials with QLSV2 Learning Studio.

FEATURES:
• Generate comprehensive reports from web articles
• Create podcast scripts from any content
• Design infographics automatically
• Build presentation slide decks
• Convert text to speech
• Support for URLs, YouTube videos, and manual entry

Perfect for educators, content creators, and lifelong learners.
```

**Keywords (100 char max):**
```
education,learning,content,podcast,infographic,presentation,study,teaching
```

**App Icon:**
- 1024x1024 PNG (no transparency)
- Design a clean, professional icon

**Screenshots Required:**
- iPhone 6.7" (iPhone 15 Pro Max) - 3-10 screenshots
- iPhone 6.5" (iPhone 11 Pro Max) - 3-10 screenshots
- iPad Pro 12.9" - 3-10 screenshots (if supporting iPad)

**App Preview Video (Optional but recommended):**
- 15-30 seconds
- Show key features in action

### 3. App Category
- Primary: Education
- Secondary: Productivity

### 4. Age Rating
- Complete questionnaire
- Likely: 4+ (no restricted content)

### 5. Privacy Policy
You MUST provide a privacy policy URL. Create a simple one:

```markdown
# Privacy Policy for QLSV2 Learning Studio

Last updated: [Date]

## Data Collection
We collect:
- URLs you submit for processing
- Generated content (reports, podcasts, infographics)
- Usage analytics (via backend server logs)

## Data Usage
- Content processing only
- Service improvement
- No data sold to third parties

## Data Storage
- Content stored temporarily during processing
- Exports saved locally on device
- Server logs retained for 30 days

## Third-Party Services
- OpenAI API (text generation)
- Pollinations AI (image generation)
- YouTube Data API (video transcripts)

## Contact
[Your email address]
```

Host this on GitHub Pages, Vercel, or your website.

---

## Step 9: Archive and Upload

1. **In Xcode, select "Any iOS Device (arm64)":**
   - Top menu bar → Product → Destination → Any iOS Device

2. **Archive the app:**
   - Product → Archive
   - Wait for build to complete (5-10 minutes)

3. **Validate archive:**
   - When Organizer opens, click "Validate App"
   - Select distribution method: "App Store Connect"
   - Fix any errors/warnings

4. **Upload to App Store Connect:**
   - Click "Distribute App"
   - Select "App Store Connect"
   - Upload and wait (10-30 minutes)

---

## Step 10: Submit for Review

1. **In App Store Connect:**
   - Go to your app → Version
   - Complete all required fields
   - Select the uploaded build
   - Add screenshots
   - Add app description
   - Set pricing (Free)

2. **App Review Information:**
   - Contact information
   - Demo account (if needed)
   - Notes for reviewer:
     ```
     This app requires internet connection to generate content.
     Test with any web article URL or paste sample text.
     All AI features are powered by backend API.
     ```

3. **Submit for Review:**
   - Click "Submit for Review"
   - Review typically takes 24-48 hours

---

## Common Issues and Solutions

### Issue: "Build not showing in App Store Connect"
**Solution:** Wait 10-30 minutes. Check email for processing errors.

### Issue: "Invalid Bundle ID"
**Solution:** Ensure Bundle ID in Xcode matches App Store Connect exactly.

### Issue: "Missing Compliance"
**Solution:** Answer export compliance questions (typically "No" for educational apps).

### Issue: "API calls failing in production"
**Solution:**
- Verify backend is deployed and accessible
- Check `capacitor.config.ts` has correct production URL
- Ensure CORS allows requests from iOS app

### Issue: "Images not loading"
**Solution:**
- Verify image URLs are HTTPS
- Check Info.plist doesn't have arbitrary loads
- Test image endpoints directly

---

## Maintenance and Updates

### Updating the App

1. Make code changes
2. Increment version in Xcode (e.g., 1.0.0 → 1.0.1)
3. Build and test
4. Archive and upload
5. Submit new version for review

### Monitoring

- Check App Store Connect Analytics
- Monitor backend logs for errors
- Review user feedback and ratings
- Update content and fix bugs regularly

---

## Environment Variables Checklist

### Development (.env)
```bash
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:3002
FLASK_PORT=5000
FLASK_ENV=development
OPENAI_API_KEY=your-key-here
POLLINATIONS_API_KEY=sk_TR1OMncosOFKtAztRSC5Yup8WaFAhPEE
```

### Production (Server Environment)
```bash
ALLOWED_ORIGINS=*
FLASK_ENV=production
OPENAI_API_KEY=your-production-key
POLLINATIONS_API_KEY=your-production-key
TTS_PROVIDER=gtts
ENABLE_CACHING=true
```

---

## Testing Checklist Before Submission

- [ ] All API endpoints working in production
- [ ] CORS properly configured
- [ ] Images loading correctly
- [ ] Audio playback working
- [ ] Export functionality works
- [ ] App icon looks good
- [ ] Screenshots captured
- [ ] Privacy policy created and hosted
- [ ] App description written
- [ ] Contact email provided
- [ ] Tested on multiple iOS versions
- [ ] Tested on multiple device sizes
- [ ] No console errors in Safari Web Inspector
- [ ] App launches quickly
- [ ] No crashes during testing

---

## Estimated Timeline

- Backend deployment: 1-2 hours
- iOS configuration: 2-3 hours
- Testing: 2-4 hours
- App Store preparation: 3-5 hours
- Review process: 24-48 hours

**Total: 3-5 days from start to App Store approval**

---

## Support Resources

- [Capacitor Docs](https://capacitorjs.com/docs)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [App Store Connect Help](https://developer.apple.com/support/app-store-connect/)

---

## Next Steps

1. ✅ **Restart your development servers** to apply CORS fixes:
   ```bash
   # In terminal 1: Restart Flask
   python server.py

   # In terminal 2: Restart Vite
   npm run dev
   ```

2. ✅ **Test locally** - visit http://localhost:3002 and verify:
   - URL preview works without CORS error
   - Content ingestion works
   - All outputs generate properly

3. ⚠️ **Deploy backend** to production (Vercel/Render/Railway)

4. ⚠️ **Update Capacitor config** with production URL

5. ⚠️ **Build and test iOS app** on simulator

6. ⚠️ **Prepare App Store materials** (icon, screenshots, description)

7. ⚠️ **Submit to App Store** for review

---

**Need help?** Review this guide or consult the official documentation linked above.
