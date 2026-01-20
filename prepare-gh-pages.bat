@echo off
echo ==========================================
echo QLSV2 – GitHub Pages Deployment Prep
echo ==========================================

REM --- Safety check: must be run from repo root ---
if not exist package.json (
  echo ERROR: package.json not found.
  echo Run this script from the project root folder.
  pause
  exit /b 1
)

echo.
echo [1/7] Removing Netlify configuration (if present)...

if exist netlify.toml (
  del netlify.toml
  echo - netlify.toml removed
) else (
  echo - netlify.toml not found (ok)
)

if exist .netlify (
  rmdir /s /q .netlify
  echo - .netlify folder removed
) else (
  echo - .netlify folder not found (ok)
)

echo.
echo [2/7] Installing dependencies (if needed)...
npm install

if errorlevel 1 (
  echo ERROR: npm install failed
  pause
  exit /b 1
)

echo.
echo [3/7] Building production bundle...
npm run build

if errorlevel 1 (
  echo ERROR: build failed
  pause
  exit /b 1
)

echo.
echo [4/7] Git status check...
git status

echo.
echo [5/7] Staging changes...
git add .

echo.
echo [6/7] Creating commit...
git commit -m "Prepare for GitHub Pages deployment (remove Netlify config)"

echo.
echo [7/7] Pushing to remote repository...
git push

echo.
echo ==========================================
echo DONE.
echo Next step:
echo - Configure GitHub Pages to use gh-pages branch
echo - Or run npm run deploy if using gh-pages
echo ==========================================
pause
