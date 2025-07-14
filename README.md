<<<<<<< HEAD
# YouTube-Video-Rating
=======
# YouTube Comment Sentiment Analyzer

A web application that analyzes YouTube video comments to provide sentiment analysis and quality ratings.

## Features

- 🔍 Search YouTube videos
- 📊 Sentiment analysis of comments
- 🎯 Quality ratings and trust scores
- 📱 Mobile-responsive design
- ⚡ Fast and accurate analysis

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express
- **AI**: Python FastAPI + Hugging Face models
- **Database**: In-memory caching

## Free Deployment

### Option 1: Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub
   - Import your repository
   - Deploy automatically

3. **Environment Variables**
   - Add your YouTube API key in Vercel dashboard
   - Set `YOUTUBE_API_KEY` environment variable

### Option 2: Netlify

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Deploy to Netlify**
   - Go to [netlify.com](https://netlify.com)
   - Drag and drop the `dist` folder
   - Get your live URL instantly

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start Python sentiment service
cd sentiment_service
python main.py
```

## Mobile & Desktop Support

✅ **Fully responsive design**
✅ **Works on all devices**
✅ **Touch-friendly interface**
✅ **Fast loading times**

## License

MIT License - Free to use and modify 
>>>>>>> e2cf560 (Initial Commit of files)
