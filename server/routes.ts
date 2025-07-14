import type { Express } from "express";
import { createServer, type Server } from "http";
import { youtubeService, getTrendingVideos, getVideoCategories, getVideoById } from "./services/youtube";
import { sentimentService } from "./services/sentiment";
import { searchVideoSchema } from "@shared/schema";
import fetch from "node-fetch";

// In-memory cache for trending videos
let trendingCache: { data: any; timestamp: number } | null = null;
const TRENDING_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// In-memory cache for video categories
let categoriesCache: { data: any; timestamp: number } | null = null;
const CATEGORIES_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Search YouTube videos with automatic preview analysis
  app.get("/api/videos/search", async (req, res) => {
    try {
      const { q, maxResults, order, type, uploadDate, duration, pageToken } = req.query;
      const apiKey = req.headers["x-youtube-api-key"] || process.env.YT_API_KEY;
      if (!apiKey) return res.status(400).json({ error: "Missing YouTube API key" });
      // Call the youtubeService.searchVideos with all params, including pageToken
      const result = await youtubeService.searchVideos({
        query: q as string,
        maxResults: maxResults ? parseInt(maxResults as string) : 15,
        order: order as string,
        type: type as string,
        uploadDate: uploadDate as string,
        duration: duration as string,
        pageToken: pageToken as string,
        apiKeyOverride: apiKey as string,
      });
      // result should be { videos: [...], nextPageToken: ... }
      res.json(result);
    } catch (e) {
      console.error("YouTube search error:", e && e.stack ? e.stack : e);
      res.status(500).json({ error: "Failed to search videos" });
    }
  });

  // Deep analyze video comments (comprehensive analysis)
  app.post("/api/videos/:id/analyze", async (req, res) => {
    try {
      const videoId = req.params.id;
      let video = await getVideoById(videoId, req.headers["x-youtube-api-key"] as string | undefined);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      // Fetch comprehensive comments from YouTube API (up to 500 comments + replies)
      const youtubeComments = await youtubeService.getVideoComments(videoId, 500, req.headers["x-youtube-api-key"] as string | undefined);
      
      if (youtubeComments.length === 0) {
        return res.status(400).json({ message: "No comments available for analysis" });
      }
      
      // Perform comprehensive analysis
      const comments = (await youtubeService.getVideoComments(videoId, 500, req.headers["x-youtube-api-key"] as string | undefined)).map(c => ({
        ...c,
        likeCount: c.likeCount || 0,
        trustScore: null,
        createdAt: c.publishedAt || new Date(),
        sentiment: null,
        sentimentScore: null,
        isSuspicious: false,
        isSpam: false,
        isBotLike: false,
        authorProfileImageUrl: c.authorProfileImageUrl || null,
        authorChannelId: c.authorChannelId || null,
        isVerified: c.isVerified ?? null,
      }));
      // Ensure video object has all required fields for analysis
      const safeVideo = video ? {
        ...video,
        description: video.description || null,
        viewCount: typeof video.viewCount === 'number' ? video.viewCount : 0,
        likeCount: typeof video.likeCount === 'number' ? video.likeCount : 0,
        commentCount: typeof video.commentCount === 'number' ? video.commentCount : 0,
        thumbnailUrl: video.thumbnailUrl || null,
        analyzed: (video as any).analyzed ?? null,
        trustScore: (video as any).trustScore ?? null,
        createdAt: (video as any).createdAt ?? new Date(),
      } : undefined;
      const analysisResult = await sentimentService.analyzeComments(comments, safeVideo);
      
      res.json(analysisResult);
    } catch (error: any) {
      // Improved error handling
      let message = "Failed to analyze video.";
      let details: any = {};
      if (error instanceof Error) {
        if (error.message.includes("API key")) message = error.message;
        else if (error.message.includes("quota")) message = error.message;
        else if (error.message.includes("403")) message = "YouTube API key is invalid, expired, or quota exceeded. Please check your API key and quota in the Google Cloud Console.";
        else message = error.message;
        if (typeof error.stack === 'string') details.errorStack = error.stack;
      }
      // If error has extra info (like fetch error), include it
      if (typeof error === 'object' && error !== null) {
        for (const k of Object.keys(error)) {
          if (k !== 'message' && k !== 'stack') {
            details[k] = error[k];
          }
        }
      }
      res.status(400).json({ message, details });
    }
  });

  // Quick rating for a single video (top 100 comments)
  app.get("/api/videos/:id/quick-rating", async (req, res) => {
    try {
      const videoId = req.params.id;
      const userApiKey = req.headers["x-youtube-api-key"] as string | undefined;
      if (!userApiKey) {
        return res.status(400).json({ message: "YouTube API key required" });
      }
      // Fetch video and ensure all required fields are present
      let video = await getVideoById(videoId, userApiKey);
      let safeVideo: any = undefined;
      if (video) {
        safeVideo = {
          id: video.id,
          duration: video.duration,
          title: video.title,
          description: video.description || null,
          channelId: video.channelId,
          channelTitle: video.channelTitle,
          publishedAt: video.publishedAt,
          viewCount: typeof video.viewCount === 'number' ? video.viewCount : 0,
          likeCount: typeof video.likeCount === 'number' ? video.likeCount : 0,
          commentCount: typeof video.commentCount === 'number' ? video.commentCount : 0,
          thumbnailUrl: video.thumbnailUrl || null,
          analyzed: null,
          trustScore: null,
          createdAt: new Date(),
        };
      }
      let comments = await youtubeService.getVideoComments(videoId, 100, userApiKey);
      comments = comments.map(c => ({
        id: c.id,
        publishedAt: c.publishedAt ? new Date(c.publishedAt) : new Date(),
        videoId: c.videoId,
        authorDisplayName: c.authorDisplayName,
        authorProfileImageUrl: c.authorProfileImageUrl ?? null,
        authorChannelId: c.authorChannelId ?? null,
        textOriginal: c.textOriginal,
        likeCount: c.likeCount ?? 0,
        isVerified: c.isVerified ?? false,
        trustScore: null,
        createdAt: c.publishedAt ? new Date(c.publishedAt) : new Date(),
        sentiment: null,
        sentimentScore: null,
        isSuspicious: false,
        isSpam: false,
        isBotLike: false,
      }));
      const commentsForAnalysis = (await youtubeService.getVideoComments(videoId, 100, userApiKey)).map(c => ({
        ...c,
        likeCount: c.likeCount || 0,
        trustScore: null,
        createdAt: c.publishedAt || new Date(),
        sentiment: null,
        sentimentScore: null,
        isSuspicious: false,
        isSpam: false,
        isBotLike: false,
        authorProfileImageUrl: c.authorProfileImageUrl || null,
        authorChannelId: c.authorChannelId || null,
        isVerified: c.isVerified ?? null,
      }));
      // Ensure video object has all required fields for analysis
      const safeVideoQuick = video ? {
        ...video,
        description: video.description || null,
        viewCount: typeof video.viewCount === 'number' ? video.viewCount : 0,
        likeCount: typeof video.likeCount === 'number' ? video.likeCount : 0,
        commentCount: typeof video.commentCount === 'number' ? video.commentCount : 0,
        thumbnailUrl: video.thumbnailUrl || null,
        analyzed: video.analyzed ?? null,
        trustScore: video.trustScore ?? null,
        createdAt: video.createdAt ?? new Date(),
      } : undefined;
      const analysis = await sentimentService.analyzeComments(commentsForAnalysis, safeVideoQuick);
      res.json({ rating: analysis.rating });
    } catch (error) {
      // Improved error handling
      let message = "Failed to get video rating.";
      if (error instanceof Error) {
        if (error.message.includes("API key")) message = error.message;
        else if (error.message.includes("quota")) message = error.message;
        else if (error.message.includes("403")) message = "YouTube API key is invalid, expired, or quota exceeded. Please check your API key and quota in the Google Cloud Console.";
        else message = error.message;
      }
      res.status(400).json({ message });
    }
  });

  // Get trending videos
  app.get("/api/videos/trending", async (req, res) => {
    try {
      const now = Date.now();
      if (trendingCache && now - trendingCache.timestamp < TRENDING_CACHE_TTL) {
        return res.json(trendingCache.data);
      }
      const apiKey = req.headers["x-youtube-api-key"] || process.env.YT_API_KEY;
      if (!apiKey) return res.status(400).json({ error: "Missing YouTube API key" });
      const videos = await getTrendingVideos(apiKey as string);
      if (!Array.isArray(videos) || videos.length === 0) {
        console.warn("[Trending] No videos found from YouTube API.");
        trendingCache = { data: [], timestamp: now };
        return res.json([]);
      }
      trendingCache = { data: videos, timestamp: now };
      res.json(videos);
    } catch (e) {
      console.error("[Trending] Error fetching trending videos:", e);
      res.json([]);
    }
  });

  // Get video categories
  app.get("/api/videos/categories", async (req, res) => {
    try {
      const now = Date.now();
      if (categoriesCache && now - categoriesCache.timestamp < CATEGORIES_CACHE_TTL) {
        return res.json(categoriesCache.data);
      }
      const apiKey = req.headers["x-youtube-api-key"] || process.env.YT_API_KEY;
      if (!apiKey) return res.status(400).json({ error: "Missing YouTube API key" });
      const categories = await getVideoCategories(apiKey as string);
      categoriesCache = { data: categories, timestamp: now };
      res.json(categories);
    } catch (e) {
      console.error("YouTube categories error:", e && e.stack ? e.stack : e);
      res.status(500).json({ error: "Failed to fetch video categories" });
    }
  });

  // Get comments for a video
  app.get("/api/videos/:id/comments", async (req, res) => {
    try {
      const videoId = req.params.id;
      const apiKey = req.headers["x-youtube-api-key"] || process.env.YT_API_KEY;
      
      if (!apiKey) {
        return res.status(400).json({ error: "Missing YouTube API key" });
      }
      
      const comments = await youtubeService.getVideoComments(videoId, 500, apiKey as string);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  // Proxy YouTube autocomplete suggestions (no API key needed)
  app.get("/api/suggest", async (req, res) => {
    const q = req.query.q || "";
    try {
      const response = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(q as string)}`);
      if (!response.ok) return res.status(500).json({ error: "Failed to fetch suggestions" });
      const data = await response.json();
      if (Array.isArray(data) && Array.isArray(data[1])) {
        return res.json(data[1]);
      }
      return res.json([]);
    } catch (e) {
      return res.status(500).json({ error: "Failed to fetch suggestions" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
