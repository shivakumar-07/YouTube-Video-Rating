# How to Run Locally

This project consists of a React frontend, a Node.js backend, and a Python sentiment analysis service.

## Prerequisites
- Node.js (v16+ recommended)
- Python 3.8+
- npm and pip
- (Optional) Docker & Docker Compose

## 1. Clone the Repository
```bash
git clone <your-repo-url>
cd yt_cmnt_sentiment
```

## 2. Install Dependencies
### Frontend
```bash
cd client
npm install
```
### Backend
```bash
cd ../server
npm install
```
### Sentiment Service
```bash
cd ../sentiment_service
pip install -r requirements.txt
```

## 3. Start the Services
### Start Sentiment Service (Python)
```bash
cd sentiment_service
python main.py
```
### Start Backend (Node.js)
```bash
cd ../server
npm run dev
```
### Start Frontend (React)
```bash
cd ../client
npm run dev
```

## 4. Open the App
Go to [http://localhost:5173](http://localhost:5173) in your browser.

## 5. YouTube API Key
The app will prompt you for a YouTube Data API key on first use. If you don't have one, follow this guide: [How to get a YouTube API key](https://youtu.be/fXPuQY1LKbY?feature=shared)

## Optional: Run Everything with Docker Compose
```bash
docker-compose up --build
```

---

**You're ready to use the app locally!**
