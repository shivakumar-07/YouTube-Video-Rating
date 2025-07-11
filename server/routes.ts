import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { youtubeService } from "./services/youtube";
import { sentimentService } from "./services/sentiment";
import { searchVideoSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Search YouTube videos with automatic preview analysis
  app.get("/api/videos/search", async (req, res) => {
    try {
      const { q, maxResults, order } = searchVideoSchema.parse(req.query);
      
      const videos = await youtubeService.searchVideos(q, maxResults, order);
      
      // Store videos in storage and perform quick analysis
      const storedVideos = [];
      for (const video of videos) {
        const existingVideo = await storage.getVideo(video.id);
        if (!existingVideo) {
          const storedVideo = await storage.createVideo(video);
          
          // Perform quick analysis with limited comments for preview
          try {
            const quickComments = await youtubeService.getVideoComments(video.id, 50);
            if (quickComments.length > 0) {
              const quickAnalysis = await sentimentService.analyzeComments(quickComments);
              
              // Update video with quick trust score
              await storage.updateVideo(video.id, {
                analyzed: true,
                trustScore: quickAnalysis.overallTrustScore,
              });
              
              storedVideo.analyzed = true;
              storedVideo.trustScore = quickAnalysis.overallTrustScore;
            }
          } catch (analysisError) {
            console.warn(`Quick analysis failed for video ${video.id}:`, analysisError);
          }
          
          storedVideos.push(storedVideo);
        } else {
          storedVideos.push(existingVideo);
        }
      }
      
      res.json(storedVideos);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to search videos" 
      });
    }
  });

  // Get video details
  app.get("/api/videos/:id", async (req, res) => {
    try {
      const video = await storage.getVideo(req.params.id);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      res.json(video);
    } catch (error) {
      console.error("Get video error:", error);
      res.status(500).json({ message: "Failed to get video" });
    }
  });

  // Deep analyze video comments (comprehensive analysis)
  app.post("/api/videos/:id/analyze", async (req, res) => {
    try {
      const videoId = req.params.id;
      const video = await storage.getVideo(videoId);
      
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }

      // Fetch comprehensive comments from YouTube API (up to 500 comments + replies)
      const youtubeComments = await youtubeService.getVideoComments(videoId, 500);
      
      if (youtubeComments.length === 0) {
        return res.status(400).json({ message: "No comments available for analysis" });
      }
      
      // Clear existing comments for fresh analysis
      const existingComments = await storage.getCommentsByVideoId(videoId);
      
      // Store new comments in storage
      const storedComments = await storage.createComments(youtubeComments);
      
      // Perform comprehensive analysis
      const analysisResult = await sentimentService.analyzeComments(storedComments);
      
      // Update comment analysis results
      for (const comment of storedComments) {
        await storage.updateComment(comment.id, {
          sentiment: comment.sentiment,
          sentimentScore: comment.sentimentScore,
          trustScore: comment.trustScore,
          isSuspicious: comment.isSuspicious,
          isSpam: comment.isSpam,
          isBotLike: comment.isBotLike,
        });
      }
      
      // Store comprehensive analysis result
      const storedAnalysis = await storage.createAnalysisResult(analysisResult);
      
      // Update video with comprehensive analysis
      await storage.updateVideo(videoId, {
        analyzed: true,
        trustScore: analysisResult.overallTrustScore,
      });
      
      res.json(storedAnalysis);
    } catch (error) {
      console.error("Analysis error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to analyze video" 
      });
    }
  });

  // Get video comments
  app.get("/api/videos/:id/comments", async (req, res) => {
    try {
      const comments = await storage.getCommentsByVideoId(req.params.id);
      res.json(comments);
    } catch (error) {
      console.error("Get comments error:", error);
      res.status(500).json({ message: "Failed to get comments" });
    }
  });

  // Get analysis results
  app.get("/api/videos/:id/analysis", async (req, res) => {
    try {
      const analysis = await storage.getAnalysisResult(req.params.id);
      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }
      res.json(analysis);
    } catch (error) {
      console.error("Get analysis error:", error);
      res.status(500).json({ message: "Failed to get analysis" });
    }
  });

  // Export analysis data
  app.get("/api/videos/:id/export", async (req, res) => {
    try {
      const video = await storage.getVideo(req.params.id);
      const comments = await storage.getCommentsByVideoId(req.params.id);
      const analysis = await storage.getAnalysisResult(req.params.id);
      
      if (!video || !analysis) {
        return res.status(404).json({ message: "Video or analysis not found" });
      }
      
      const exportData = {
        video,
        analysis,
        comments,
        exportedAt: new Date().toISOString(),
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="youtube-analysis-${req.params.id}.json"`);
      res.json(exportData);
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
