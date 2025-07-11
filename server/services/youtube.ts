import { type InsertVideo, type InsertComment } from "@shared/schema";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY || "AIzaSyB5UKhMFBcaxkoQIc4yHqsUwfjWG294QT8";
const YOUTUBE_BASE_URL = "https://www.googleapis.com/youtube/v3";

interface YouTubeVideoResult {
  id: { videoId: string };
  snippet: {
    title: string;
    description: string;
    channelId: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails: {
      high: { url: string };
    };
  };
}

interface YouTubeVideoDetails {
  id: string;
  snippet: {
    title: string;
    description: string;
    channelId: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails: {
      high: { url: string };
    };
  };
  contentDetails: {
    duration: string;
  };
  statistics: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
  };
}

interface YouTubeCommentResult {
  id: string;
  snippet: {
    authorDisplayName: string;
    authorProfileImageUrl: string;
    authorChannelId: string;
    textOriginal: string;
    likeCount: number;
    publishedAt: string;
  };
}

export class YouTubeService {
  private apiKey: string;

  constructor() {
    this.apiKey = YOUTUBE_API_KEY;
    if (!this.apiKey) {
      console.warn("YouTube API key not found. Please set YOUTUBE_API_KEY environment variable.");
    }
  }

  async searchVideos(query: string, maxResults: number = 10, order: string = "relevance"): Promise<InsertVideo[]> {
    if (!this.apiKey) {
      throw new Error("YouTube API key is required. Please set YOUTUBE_API_KEY environment variable.");
    }
    
    const searchUrl = `${YOUTUBE_BASE_URL}/search?key=${this.apiKey}&q=${encodeURIComponent(query)}&type=video&part=snippet&maxResults=${maxResults}&order=${order}`;
    
    const response = await fetch(searchUrl);
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const videoIds = data.items.map((item: YouTubeVideoResult) => item.id.videoId);
    
    // Get detailed video information
    const detailsUrl = `${YOUTUBE_BASE_URL}/videos?key=${this.apiKey}&id=${videoIds.join(',')}&part=snippet,contentDetails,statistics`;
    const detailsResponse = await fetch(detailsUrl);
    
    if (!detailsResponse.ok) {
      throw new Error(`YouTube API error: ${detailsResponse.status} ${detailsResponse.statusText}`);
    }
    
    const detailsData = await detailsResponse.json();
    
    return detailsData.items.map((video: YouTubeVideoDetails) => ({
      id: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      channelId: video.snippet.channelId,
      channelTitle: video.snippet.channelTitle,
      publishedAt: new Date(video.snippet.publishedAt),
      duration: video.contentDetails.duration,
      viewCount: parseInt(video.statistics.viewCount || '0'),
      likeCount: parseInt(video.statistics.likeCount || '0'),
      commentCount: parseInt(video.statistics.commentCount || '0'),
      thumbnailUrl: video.snippet.thumbnails.high.url,
    }));
  }

  async getVideoComments(videoId: string, maxResults: number = 100): Promise<InsertComment[]> {
    if (!this.apiKey) {
      throw new Error("YouTube API key is required. Please set YOUTUBE_API_KEY environment variable.");
    }
    
    const commentsUrl = `${YOUTUBE_BASE_URL}/commentThreads?key=${this.apiKey}&videoId=${videoId}&part=snippet&maxResults=${maxResults}&order=relevance`;
    
    const response = await fetch(commentsUrl);
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return data.items.map((item: any) => {
      const comment = item.snippet.topLevelComment.snippet;
      return {
        id: item.snippet.topLevelComment.id,
        videoId: videoId,
        authorDisplayName: comment.authorDisplayName,
        authorProfileImageUrl: comment.authorProfileImageUrl,
        authorChannelId: comment.authorChannelId,
        textOriginal: comment.textOriginal,
        likeCount: comment.likeCount,
        publishedAt: new Date(comment.publishedAt),
        isVerified: false, // YouTube API doesn't provide this directly
      };
    });
  }
}

export const youtubeService = new YouTubeService();
