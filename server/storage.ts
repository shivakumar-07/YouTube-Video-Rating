import { videos, comments, analysisResults, type Video, type Comment, type AnalysisResult, type InsertVideo, type InsertComment, type InsertAnalysis } from "@shared/schema";

export interface IStorage {
  // Video operations
  getVideo(id: string): Promise<Video | undefined>;
  getVideos(): Promise<Video[]>;
  createVideo(video: InsertVideo): Promise<Video>;
  updateVideo(id: string, updates: Partial<Video>): Promise<Video | undefined>;
  
  // Comment operations
  getComment(id: string): Promise<Comment | undefined>;
  getCommentsByVideoId(videoId: string): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  createComments(comments: InsertComment[]): Promise<Comment[]>;
  updateComment(id: string, updates: Partial<Comment>): Promise<Comment | undefined>;
  
  // Analysis operations
  getAnalysisResult(videoId: string): Promise<AnalysisResult | undefined>;
  createAnalysisResult(analysis: InsertAnalysis): Promise<AnalysisResult>;
  updateAnalysisResult(videoId: string, updates: Partial<AnalysisResult>): Promise<AnalysisResult | undefined>;
}

export class MemStorage implements IStorage {
  private videos: Map<string, Video>;
  private comments: Map<string, Comment>;
  private analysisResults: Map<string, AnalysisResult>;
  private currentAnalysisId: number;

  constructor() {
    this.videos = new Map();
    this.comments = new Map();
    this.analysisResults = new Map();
    this.currentAnalysisId = 1;
  }

  async getVideo(id: string): Promise<Video | undefined> {
    return this.videos.get(id);
  }

  async getVideos(): Promise<Video[]> {
    return Array.from(this.videos.values());
  }

  async createVideo(insertVideo: InsertVideo): Promise<Video> {
    const video: Video = {
      ...insertVideo,
      description: insertVideo.description || null,
      analyzed: false,
      trustScore: null,
      createdAt: new Date(),
    };
    this.videos.set(video.id, video);
    return video;
  }

  async updateVideo(id: string, updates: Partial<Video>): Promise<Video | undefined> {
    const video = this.videos.get(id);
    if (!video) return undefined;
    
    const updatedVideo = { ...video, ...updates };
    this.videos.set(id, updatedVideo);
    return updatedVideo;
  }

  async getComment(id: string): Promise<Comment | undefined> {
    return this.comments.get(id);
  }

  async getCommentsByVideoId(videoId: string): Promise<Comment[]> {
    return Array.from(this.comments.values()).filter(comment => comment.videoId === videoId);
  }

  async createComment(insertComment: InsertComment): Promise<Comment> {
    const comment: Comment = {
      ...insertComment,
      likeCount: insertComment.likeCount || 0,
      authorProfileImageUrl: insertComment.authorProfileImageUrl || null,
      authorChannelId: insertComment.authorChannelId || null,
      sentiment: null,
      sentimentScore: null,
      trustScore: null,
      isSuspicious: false,
      isSpam: false,
      isBotLike: false,
      createdAt: new Date(),
    };
    this.comments.set(comment.id, comment);
    return comment;
  }

  async createComments(insertComments: InsertComment[]): Promise<Comment[]> {
    const comments: Comment[] = [];
    for (const insertComment of insertComments) {
      const comment = await this.createComment(insertComment);
      comments.push(comment);
    }
    return comments;
  }

  async updateComment(id: string, updates: Partial<Comment>): Promise<Comment | undefined> {
    const comment = this.comments.get(id);
    if (!comment) return undefined;
    
    const updatedComment = { ...comment, ...updates };
    this.comments.set(id, updatedComment);
    return updatedComment;
  }

  async getAnalysisResult(videoId: string): Promise<AnalysisResult | undefined> {
    return this.analysisResults.get(videoId);
  }

  async createAnalysisResult(insertAnalysis: InsertAnalysis): Promise<AnalysisResult> {
    const analysis: AnalysisResult = {
      ...insertAnalysis,
      positiveCount: insertAnalysis.positiveCount || 0,
      negativeCount: insertAnalysis.negativeCount || 0,
      neutralCount: insertAnalysis.neutralCount || 0,
      suspiciousCount: insertAnalysis.suspiciousCount || 0,
      spamCount: insertAnalysis.spamCount || 0,
      botLikeCount: insertAnalysis.botLikeCount || 0,
      verifiedCount: insertAnalysis.verifiedCount || 0,
      qualityIndicators: insertAnalysis.qualityIndicators || null,
      id: this.currentAnalysisId++,
      createdAt: new Date(),
    };
    this.analysisResults.set(analysis.videoId, analysis);
    return analysis;
  }

  async updateAnalysisResult(videoId: string, updates: Partial<AnalysisResult>): Promise<AnalysisResult | undefined> {
    const analysis = this.analysisResults.get(videoId);
    if (!analysis) return undefined;
    
    const updatedAnalysis = { ...analysis, ...updates };
    this.analysisResults.set(videoId, updatedAnalysis);
    return updatedAnalysis;
  }
}

export const storage = new MemStorage();
