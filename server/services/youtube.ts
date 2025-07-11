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

  async getVideoComments(videoId: string, maxResults: number = 500): Promise<InsertComment[]> {
    if (!this.apiKey) {
      throw new Error("YouTube API key is required. Please set YOUTUBE_API_KEY environment variable.");
    }
    
    const allComments: InsertComment[] = [];
    let nextPageToken = '';
    const pageSize = 100; // YouTube API limit per request
    
    while (allComments.length < maxResults) {
      const remaining = maxResults - allComments.length;
      const currentPageSize = Math.min(pageSize, remaining);
      
      const commentsUrl = `${YOUTUBE_BASE_URL}/commentThreads?key=${this.apiKey}&videoId=${videoId}&part=snippet,replies&maxResults=${currentPageSize}&order=relevance${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
      
      const response = await fetch(commentsUrl);
      if (!response.ok) {
        if (response.status === 403) {
          console.warn(`Comments disabled for video ${videoId}`);
          break;
        }
        throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        break;
      }
      
      // Process top-level comments
      for (const item of data.items) {
        const comment = item.snippet.topLevelComment.snippet;
        allComments.push({
          id: item.snippet.topLevelComment.id,
          videoId: videoId,
          authorDisplayName: comment.authorDisplayName,
          authorProfileImageUrl: comment.authorProfileImageUrl,
          authorChannelId: comment.authorChannelId,
          textOriginal: comment.textOriginal,
          likeCount: comment.likeCount,
          publishedAt: new Date(comment.publishedAt),
          isVerified: false,
        });
        
        // Add replies if available
        if (item.replies && item.replies.comments && allComments.length < maxResults) {
          for (const reply of item.replies.comments) {
            if (allComments.length >= maxResults) break;
            const replySnippet = reply.snippet;
            allComments.push({
              id: reply.id,
              videoId: videoId,
              authorDisplayName: replySnippet.authorDisplayName,
              authorProfileImageUrl: replySnippet.authorProfileImageUrl,
              authorChannelId: replySnippet.authorChannelId,
              textOriginal: replySnippet.textOriginal,
              likeCount: replySnippet.likeCount,
              publishedAt: new Date(replySnippet.publishedAt),
              isVerified: false,
            });
          }
        }
        
        if (allComments.length >= maxResults) break;
      }
      
      nextPageToken = data.nextPageToken;
      if (!nextPageToken) break;
    }
    
    return allComments;
  }
}

export const youtubeService = new YouTubeService();
