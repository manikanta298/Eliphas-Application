# 🚀 LogiCore ERP — Deployment Guide

## ─── LOCAL DEVELOPMENT ──────────────────────────────────────

### Step 1: Setup backend .env
```
cd backend
copy .env.example .env        # Windows
cp .env.example .env          # Mac/Linux
```
Open `backend/.env` and fill in your MongoDB URI.

### Step 2: Run everything
```
cd ..               # back to root
npm run install:all
npm run seed
npm run dev
```
Frontend → http://localhost:5173
Backend  → http://localhost:5000

---

## ─── PRODUCTION DEPLOYMENT ─────────────────────────────────

### BACKEND → Render.com

1. Push your project to GitHub
2. Go to https://render.com → New → Web Service
3. Connect your GitHub repo
4. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Environment:** Node

5. Add these Environment Variables in Render dashboard:
   ```
   NODE_ENV          = production
   MONGODB_URI       = mongodb+srv://user:pass@cluster.mongodb.net/logistics-erp
   JWT_SECRET        = your_secret_here
   JWT_REFRESH_SECRET= your_refresh_secret_here
   JWT_EXPIRES_IN    = 15m
   JWT_REFRESH_EXPIRES_IN = 7d
   FRONTEND_URL      = https://your-app.vercel.app
   ```
6. Deploy → Copy your Render URL (e.g. https://logicore-erp-api.onrender.com)

---

### FRONTEND → Vercel.com

1. Go to https://vercel.com → New Project → Import GitHub repo
2. Settings:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

3. Add this Environment Variable in Vercel dashboard:
   ```
   VITE_API_URL = https://logicore-erp-api.onrender.com
   ```
   ⚠️ Must start with VITE_ or the browser won't see it
   ⚠️ No trailing slash

4. Deploy

---

## ─── COMMON PROBLEMS & FIXES ───────────────────────────────

### ❌ "Cannot connect to server"
→ VITE_API_URL is wrong or missing in Vercel
→ Check: Vercel dashboard → Settings → Environment Variables

### ❌ CORS error in browser console
→ Add your Vercel URL to FRONTEND_URL in Render env vars
→ Redeploy backend after changing env vars

### ❌ Backend returns 404 for all routes
→ Your Render start command is wrong — must be `node server.js`
→ Root directory must be set to `backend`

### ❌ Render backend takes 30+ seconds to respond
→ Free tier Render services sleep after 15 minutes
→ First request after sleep takes ~30s (cold start) — this is normal
→ The frontend has a 15s timeout, it will still connect eventually
→ Upgrade to Render Starter ($7/mo) to disable sleep

### ❌ Seed fails with URI error
→ You haven't created backend/.env yet
→ Follow Step 1 above

### ❌ Login works locally but not on Render
→ Check JWT_SECRET is set in Render env vars
→ Check NODE_ENV=production is set

---

## ─── ENVIRONMENT VARIABLES SUMMARY ────────────────────────

| Variable | Where | Example Value |
|----------|-------|---------------|
| MONGODB_URI | Render | mongodb+srv://user:pass@cluster... |
| JWT_SECRET | Render | any_long_random_string |
| JWT_REFRESH_SECRET | Render | another_long_random_string |
| FRONTEND_URL | Render | https://your-app.vercel.app |
| NODE_ENV | Render | production |
| VITE_API_URL | Vercel | https://logicore-erp-api.onrender.com |
