import { type InsertVideo, type InsertComment } from "@shared/schema";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY;
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
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = YOUTUBE_API_KEY;
    if (!this.apiKey) {
      console.warn("YouTube API key not found. Please set YOUTUBE_API_KEY environment variable.");
    }
  }

  async searchVideos(options: {
    query: string,
    maxResults?: number,
    order?: string,
    type?: string,
    uploadDate?: string,
    duration?: string,
    pageToken?: string,
    apiKeyOverride?: string,
  }): Promise<{ videos: InsertVideo[], nextPageToken: string | null }> {
    const {
      query,
      maxResults = 15,
      order = 'relevance',
      type = 'video',
      uploadDate,
      duration,
      pageToken,
      apiKeyOverride,
    } = options;
    const apiKey = apiKeyOverride || this.apiKey;
    if (!apiKey) {
      throw new Error("YouTube API key is required. Please set YOUTUBE_API_KEY environment variable or provide a valid API key.");
    }
    let searchUrl = `${YOUTUBE_BASE_URL}/search?key=${apiKey}` +
      `&q=${encodeURIComponent(query)}` +
      `&type=${type}` +
      `&part=snippet` +
      `&maxResults=${maxResults}` +
      `&order=${order}`;
    if (uploadDate && uploadDate !== 'any') {
      // YouTube API does not support uploadDate directly, but we can use publishedAfter
      // Map uploadDate to publishedAfter ISO string
      const now = new Date();
      let publishedAfter = null;
      if (uploadDate === 'last_hour') publishedAfter = new Date(now.getTime() - 60 * 60 * 1000);
      if (uploadDate === 'today') publishedAfter = new Date(now.setHours(0,0,0,0));
      if (uploadDate === 'this_week') publishedAfter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (uploadDate === 'this_month') publishedAfter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      if (uploadDate === 'this_year') publishedAfter = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      if (publishedAfter) searchUrl += `&publishedAfter=${publishedAfter.toISOString()}`;
    }
    if (duration && duration !== 'any') {
      searchUrl += `&videoDuration=${duration}`;
    }
    if (pageToken) {
      searchUrl += `&pageToken=${pageToken}`;
    }
      const response = await fetch(searchUrl);
      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
    const videoIds = data.items.map((item: any) => item.id.videoId).filter(Boolean);
    if (videoIds.length === 0) return { videos: [], nextPageToken: null };
    // Get detailed video information (in batches of 50)
    let allDetails: any[] = [];
    for (let i = 0; i < videoIds.length; i += 50) {
      const batchIds = videoIds.slice(i, i + 50);
      const detailsUrl = `${YOUTUBE_BASE_URL}/videos?key=${apiKey}&id=${batchIds.join(',')}&part=snippet,contentDetails,statistics`;
      const detailsResponse = await fetch(detailsUrl);
      if (!detailsResponse.ok) {
        throw new Error(`YouTube API error: ${detailsResponse.status} ${detailsResponse.statusText}`);
      }
      const detailsData = await detailsResponse.json();
      allDetails = allDetails.concat(detailsData.items);
    }
    // Fetch channel logos for all unique channelIds
    const uniqueChannelIds = Array.from(new Set(allDetails.map((video: any) => video.snippet.channelId)));
    let channelLogoMap: Record<string, string> = {};
    if (uniqueChannelIds.length > 0) {
      for (let i = 0; i < uniqueChannelIds.length; i += 50) {
        const batchIds = uniqueChannelIds.slice(i, i + 50);
        const channelsUrl = `${YOUTUBE_BASE_URL}/channels?key=${apiKey}&id=${batchIds.join(',')}&part=snippet`;
        const channelsResponse = await fetch(channelsUrl);
        if (channelsResponse.ok) {
          const channelsData = await channelsResponse.json();
          for (const channel of channelsData.items) {
            channelLogoMap[channel.id] = channel.snippet.thumbnails?.default?.url || channel.snippet.thumbnails?.high?.url || channel.snippet.thumbnails?.medium?.url || null;
          }
        }
      }
    }
    const videos = allDetails.map((video: any) => ({
      id: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      channelId: video.snippet.channelId,
      channelTitle: video.snippet.channelTitle,
      publishedAt: new Date(video.snippet.publishedAt),
      duration: video.contentDetails.duration,
      viewCount: parseInt(video.statistics.viewCount || '0'),
      likeCount: typeof video.statistics.likeCount === 'string' ? parseInt(video.statistics.likeCount) : (video.statistics.likeCount === undefined ? undefined : video.statistics.likeCount),
      commentCount: typeof video.statistics.commentCount === 'string' ? parseInt(video.statistics.commentCount) : (video.statistics.commentCount === undefined ? undefined : video.statistics.commentCount),
      thumbnailUrl: video.snippet.thumbnails.high.url,
      channelLogoUrl: channelLogoMap[video.snippet.channelId] || undefined,
    }));
    return { videos, nextPageToken: data.nextPageToken || null };
  }

  async getVideoComments(videoId: string, maxResults: number = 500, apiKeyOverride?: string): Promise<InsertComment[]> {
    const apiKey = apiKeyOverride || this.apiKey;
    if (!apiKey) {
      throw new Error("YouTube API key is required. Please set YOUTUBE_API_KEY environment variable or provide a valid API key.");
    }
    
    const allComments: InsertComment[] = [];
    let nextPageToken = '';
    const pageSize = 100; // YouTube API limit per request
    
    while (allComments.length < maxResults) {
      const remaining = maxResults - allComments.length;
      const currentPageSize = Math.min(pageSize, remaining);
      
      const commentsUrl = `${YOUTUBE_BASE_URL}/commentThreads?key=${apiKey}&videoId=${videoId}&part=snippet,replies&maxResults=${currentPageSize}&order=relevance${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
      
      const response = await fetch(commentsUrl);
      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
          // Try to parse as JSON for more detail
          try {
            const errorJson = JSON.parse(errorText);
            errorText = JSON.stringify(errorJson);
          } catch {}
        } catch {}
        console.error('YouTube API error:', response.status, errorText, 'Request URL:', commentsUrl);
        if (response.status === 403) {
          console.warn(`Comments disabled for video ${videoId}`);
          break;
        }
        throw new Error(`YouTube API error: ${response.status} ${errorText}`);
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

  async getTrendingVideos(apiKeyOverride?: string, maxResults: number = 12): Promise<InsertVideo[]> {
    const apiKey = apiKeyOverride || this.apiKey;
    if (!apiKey) {
      throw new Error("YouTube API key is required. Please set YOUTUBE_API_KEY environment variable.");
    }
    const url = `${YOUTUBE_BASE_URL}/videos?key=${apiKey}&chart=mostPopular&part=snippet,contentDetails,statistics&maxResults=${maxResults}&regionCode=US`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    // Fetch channel logos for all unique channelIds
    const uniqueChannelIds = Array.from(new Set(data.items.map((video: any) => video.snippet.channelId)));
    let channelLogoMap: Record<string, string> = {};
    if (uniqueChannelIds.length > 0) {
      for (let i = 0; i < uniqueChannelIds.length; i += 50) {
        const batchIds = uniqueChannelIds.slice(i, i + 50);
        const channelsUrl = `${YOUTUBE_BASE_URL}/channels?key=${apiKey}&id=${batchIds.join(',')}&part=snippet`;
        const channelsResponse = await fetch(channelsUrl);
        if (channelsResponse.ok) {
          const channelsData = await channelsResponse.json();
          for (const channel of channelsData.items) {
            channelLogoMap[channel.id] = channel.snippet.thumbnails?.default?.url || channel.snippet.thumbnails?.high?.url || channel.snippet.thumbnails?.medium?.url || null;
          }
        }
      }
    }
    return data.items.map((video: any) => ({
      id: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      channelId: video.snippet.channelId,
      channelTitle: video.snippet.channelTitle,
      publishedAt: new Date(video.snippet.publishedAt),
      duration: video.contentDetails.duration,
      viewCount: parseInt(video.statistics.viewCount || '0'),
      likeCount: typeof video.statistics.likeCount === 'string' ? parseInt(video.statistics.likeCount) : (video.statistics.likeCount === undefined ? undefined : video.statistics.likeCount),
      commentCount: typeof video.statistics.commentCount === 'string' ? parseInt(video.statistics.commentCount) : (video.statistics.commentCount === undefined ? undefined : video.statistics.commentCount),
      thumbnailUrl: video.snippet.thumbnails.high.url,
      channelLogoUrl: channelLogoMap[video.snippet.channelId] || undefined,
    }));
  }

  async getVideoCategories(apiKeyOverride?: string, regionCode: string = "US") {
    const apiKey = apiKeyOverride || this.apiKey;
    if (!apiKey) {
      throw new Error("YouTube API key is required. Please set YOUTUBE_API_KEY environment variable.");
    }
    const url = `${YOUTUBE_BASE_URL}/videoCategories?key=${apiKey}&part=snippet&regionCode=${regionCode}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    // Only return categories that are assignable to videos
    return data.items.filter((cat: any) => cat.snippet.assignable).map((cat: any) => ({
      id: cat.id,
      title: cat.snippet.title,
    }));
  }

  async getVideoById(videoId: string, apiKeyOverride?: string): Promise<InsertVideo | null> {
    const apiKey = apiKeyOverride || this.apiKey;
    if (!apiKey) {
      throw new Error("YouTube API key is required. Please set YOUTUBE_API_KEY environment variable.");
    }
    const url = `${YOUTUBE_BASE_URL}/videos?key=${apiKey}&id=${videoId}&part=snippet,contentDetails,statistics`;
    const response = await fetch(url);
    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          errorText = JSON.stringify(errorJson);
        } catch {}
      } catch {}
      if (response.status === 403) {
        // Most common causes: invalid key, expired key, or quota exceeded
        throw new Error("YouTube API key is invalid, expired, or quota exceeded. Please check your API key and quota in the Google Cloud Console.");
      }
      throw new Error(`YouTube API error: ${response.status} ${errorText}`);
    }
    const data = await response.json();
    if (!data.items || data.items.length === 0) return null;
    const video = data.items[0];
    return {
      id: video.id,
      title: video.snippet.title,
      description: video.snippet.description || null,
      channelId: video.snippet.channelId,
      channelTitle: video.snippet.channelTitle,
      publishedAt: new Date(video.snippet.publishedAt),
      duration: video.contentDetails.duration,
      viewCount: typeof video.statistics.viewCount === 'string' ? parseInt(video.statistics.viewCount) : 0,
      likeCount: typeof video.statistics.likeCount === 'string' ? parseInt(video.statistics.likeCount) : 0,
      commentCount: typeof video.statistics.commentCount === 'string' ? parseInt(video.statistics.commentCount) : 0,
      thumbnailUrl: video.snippet.thumbnails?.high?.url || null,
    };
  }
}

export const youtubeService = new YouTubeService();
export const getTrendingVideos = (apiKey: string) => youtubeService.getTrendingVideos(apiKey);
export const getVideoCategories = (apiKey: string) => youtubeService.getVideoCategories(apiKey);
export const getVideoById = (videoId: string, apiKey?: string) => youtubeService.getVideoById(videoId, apiKey);
