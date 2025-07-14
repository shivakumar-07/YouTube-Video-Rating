# YouTube Comment Sentiment Analyzer - Deployment Guide

## 🚨 CRITICAL: Two-Service Deployment Required

This application requires **TWO separate services** to be deployed:

1. **Main App** (Node.js + React) - Deploy to Vercel
2. **Sentiment Service** (Python FastAPI) - Deploy to Railway/Render

## Option 1: Free Deployment (Recommended)

### Step 1: Deploy Main App to Vercel

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Deploy to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Connect your GitHub repository
   - Set environment variables:
     - `PORT = 3000`
   - Deploy

3. **Get your Vercel URL** (e.g., `https://your-app.vercel.app`)

### Step 2: Deploy Sentiment Service to Railway

1. **Create new Railway project**:
   - Go to [railway.app](https://railway.app)
   - Create new project
   - Connect GitHub repository

2. **Configure Python service**:
   - Set root directory to `sentiment_service/`
   - Set build command: `pip install -r requirements.txt`
   - Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

3. **Get Railway URL** (e.g., `https://your-sentiment-service.railway.app`)

### Step 3: Connect Services

1. **In Vercel dashboard**, add environment variable:
   - `SENTIMENT_SERVICE_URL = https://your-sentiment-service.railway.app`

2. **Redeploy** your Vercel app

## Option 2: Alternative Sentiment Service Deployment

### Deploy to Render (Free Alternative)

1. **Create new Web Service** on [render.com](https://render.com)
2. **Connect GitHub repository**
3. **Configure**:
   - Root Directory: `sentiment_service/`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. **Get Render URL** and set as `SENTIMENT_SERVICE_URL` in Vercel

## Option 3: Local Development Setup

For local development, you need both services running:

```bash
# Terminal 1: Start sentiment service
cd sentiment_service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000

# Terminal 2: Start main app
npm run dev
```

## Environment Variables Summary

### Vercel (Main App)
- `PORT = 3000`
- `SENTIMENT_SERVICE_URL = https://your-sentiment-service-url.com`

### Railway/Render (Sentiment Service)
- `PORT` (auto-set by platform)
- No additional variables needed

## Testing Deployment

1. **Visit your Vercel URL**
2. **Enter a YouTube API key**
3. **Search for a video**
4. **Test deep analysis** - should work if sentiment service is connected

## Troubleshooting

### If Deep Analysis Fails:
1. Check Vercel logs for sentiment service connection errors
2. Verify `SENTIMENT_SERVICE_URL` is correct
3. Test sentiment service URL directly: `https://your-service.com/sentiment/status`

### If Sentiment Service Won't Deploy:
1. Check Railway/Render logs
2. Verify `requirements.txt` exists in `sentiment_service/`
3. Ensure Python version compatibility

## Cost Analysis

- **Vercel**: Free tier (100GB bandwidth/month)
- **Railway**: Free tier (500 hours/month)
- **Render**: Free tier (750 hours/month)

## Mobile & Desktop Compatibility

✅ **Fully responsive** - works on all devices
✅ **Progressive Web App** ready
✅ **Touch-friendly** interface

## Updates After Deployment

Simply push changes to GitHub:
```bash
git add .
git commit -m "Update description"
git push origin main
```

Both Vercel and Railway will automatically redeploy.

## Security Notes

- Users provide their own YouTube API keys
- No sensitive data stored on server
- All API calls go through user's API key
- Sentiment analysis runs on secure cloud infrastructure 