import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, ThumbsUp, Bot, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Video, Comment, AnalysisResult } from "@shared/schema";
import { useYTApiKey } from "@/App";

interface CommentAnalysisProps {
  video: Video;
}

function SummaryCard({ analysis, video }: { analysis: AnalysisResult; video?: any }) {
  const total = analysis.totalComments || 1;
  const pos = analysis.positiveCount || 0;
  const neg = analysis.negativeCount || 0;
  const neu = analysis.neutralCount || 0;
  const spam = analysis.spamCount || 0;
  const rating = analysis.rating || 0; // <-- enhanced weighted rating
  const confidence = analysis.confidence || 0; // <-- confidence level
  const engagement = analysis.engagementQuality || "Unknown";
  
  // Calculate video engagement metrics
  const likeViewRatio = video ? (video.likeCount / Math.max(1, video.viewCount) * 100).toFixed(2) : "N/A";
  const commentEngagementRatio = video ? (total / Math.max(1, video.viewCount / 1000)).toFixed(2) : "N/A";
  
  // Generate a friendly summary
  let summary = "";
  if (pos / total > 0.7) summary = "Most users found it helpful and easy to follow.";
  else if (neg / total > 0.3) summary = "Some users had negative experiences.";
  else if (spam / total > 0.2) summary = "Many comments may be inauthentic or automated.";
  else summary = "Feedback is mixed or neutral overall.";
  
  // Determine analysis mode based on comment count
  let analysisMode = "Balanced";
  if (total < 200) analysisMode = "Fast";
  else if (total > 1000) analysisMode = "Comprehensive";
  
  return (
    <div className="card p-4 mb-4 shadow-sm">
      <div className="flex items-center mb-2">
        <span className="text-2xl mr-2">⭐</span>
        <span className="font-bold text-lg text-primary">{rating.toFixed(1)} / 5.0</span>
        <span className="ml-2 text-muted-foreground text-xs" title="Rating is based on comment sentiment, engagement, and spam detection.">Rating</span>
        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded" title={`Confidence: ${(confidence * 100).toFixed(1)}%`}>
          {confidence >= 0.8 ? "High" : confidence >= 0.6 ? "Medium" : "Low"} Confidence
        </span>
      </div>
      <div className="flex flex-wrap gap-4 mb-2">
        <div><span className="font-bold">{total}</span> <span className="text-muted-foreground">Comments Analyzed</span></div>
        <div><span className="text-success font-bold">👍 {pos}</span> <span className="text-muted-foreground">Positive</span></div>
        <div><span className="text-warning font-bold">😐 {neu}</span> <span className="text-muted-foreground">Neutral</span></div>
        <div><span className="text-danger font-bold">👎 {neg}</span> <span className="text-muted-foreground">Negative</span></div>
        <div><span className="text-danger font-bold">🕵️‍♂️ {spam}</span> <span className="text-muted-foreground">Likely Spam</span></div>
        <div><span className="font-bold">💬 {engagement}</span> <span className="text-muted-foreground">Engagement Quality</span></div>
        <div><span className="font-bold">📊 {analysisMode}</span> <span className="text-muted-foreground">Analysis Mode</span></div>
      </div>
      {video && (
        <div className="flex flex-wrap gap-4 mb-2 text-sm">
          <div><span className="font-bold">📊 {likeViewRatio}%</span> <span className="text-muted-foreground">Like/View Ratio</span></div>
          <div><span className="font-bold">💭 {commentEngagementRatio}</span> <span className="text-muted-foreground">Comments per 1K Views</span></div>
          <div className="text-xs text-muted-foreground mt-1">
            Note: YouTube removed public dislike counts in 2021, so only likes are available
          </div>
        </div>
      )}
      <div className="mt-2 text-sm text-muted-foreground italic">{summary}</div>
    </div>
  );
}

export default function CommentAnalysis({ video }: CommentAnalysisProps) {
  const { apiKey } = useYTApiKey();
  const queryClient = useQueryClient();
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const triedFallback = useRef(false);

  // Retry logic for fetching comments
  const fetchComments = async () => {
    let attempts = 0;
    let lastError = null;
    while (attempts < 3) {
      try {
        const res = await fetch(`/api/videos/${video.id}/comments`, {
          headers: { "X-YouTube-API-Key": apiKey }
        });
        if (!res.ok) {
          let errorMsg = "Failed to fetch comments";
          try {
            const data = await res.json();
            errorMsg = data?.error || data?.message || errorMsg;
          } catch {}
          throw new Error(errorMsg);
        }
        return res.json();
      } catch (err: any) {
        lastError = err;
        await new Promise(r => setTimeout(r, 500 * (attempts + 1))); // Exponential backoff
        attempts++;
      }
    }
    setCommentsError(lastError?.message || "Unable to fetch comments.");
    return [];
  };

  const { data: comments, isLoading: commentsLoading } = useQuery<Comment[]>({
    queryKey: ['/api/videos', video.id, 'comments', apiKey],
    queryFn: fetchComments,
    enabled: !!video.id && !!apiKey,
  });

  // Debug: Log comments data
  useEffect(() => {
    if (comments) {
      console.log('Fetched comments:', comments);
    }
  }, [comments]);

  const { data: analysis, isLoading: analysisLoading } = useQuery<AnalysisResult>({
    queryKey: ['/api/videos', video.id, 'analysis'],
    enabled: !!video.id,
  });

  // Simple sentiment detection for filtering
  const detectSentiment = (text: string): string => {
    const lowerText = text.toLowerCase();
    
    // Expanded keyword lists for better detection
    const positiveWords = [
      'good', 'great', 'amazing', 'awesome', 'love', 'like', 'excellent', 'perfect', 'best', 'wonderful', 
      'fantastic', 'brilliant', 'helpful', 'useful', 'nice', 'cool', 'sweet', 'outstanding', 'superb',
      'incredible', 'outstanding', 'marvelous', 'splendid', 'terrific', 'fabulous', 'magnificent',
      'super', 'top', 'quality', 'recommend', 'worth', 'valuable', 'beneficial', 'advantageous'
    ];
    
    const negativeWords = [
      'bad', 'terrible', 'awful', 'hate', 'dislike', 'worst', 'horrible', 'disappointing', 'waste', 
      'boring', 'stupid', 'useless', 'poor', 'worst', 'annoying', 'frustrating', 'confusing', 'difficult',
      'hard', 'complex', 'complicated', 'overwhelming', 'stressful', 'tiring', 'exhausting', 'difficult',
      'challenging', 'problem', 'issue', 'wrong', 'incorrect', 'false', 'misleading', 'deceptive'
    ];
    
    // Count occurrences
    let positiveCount = 0;
    let negativeCount = 0;
    
    positiveWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) positiveCount += matches.length;
    });
    
    negativeWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) negativeCount += matches.length;
    });
    
    // Special case for question marks and exclamation marks
    const questionMarks = (lowerText.match(/\?/g) || []).length;
    const exclamationMarks = (lowerText.match(/!/g) || []).length;
    
    // Adjust counts based on punctuation
    if (exclamationMarks > 2) positiveCount += 1; // Multiple exclamations often indicate enthusiasm
    if (questionMarks > 2) negativeCount += 0.5; // Many questions might indicate confusion
    
    // Determine sentiment
    if (positiveCount > negativeCount) {
      return 'positive';
    } else if (negativeCount > positiveCount) {
      return 'negative';
    } else {
      return 'neutral';
    }
  };

  const filterComments = (comments: Comment[] = []) => {
    console.log('Filtering comments:', comments.length, 'sentimentFilter:', sentimentFilter);
    let filtered = [...comments];

    // Filter by sentiment using simple detection
    if (sentimentFilter !== "all") {
      filtered = filtered.filter(comment => {
        const detectedSentiment = detectSentiment(comment.textOriginal);
        console.log('Comment sentiment:', detectedSentiment, 'Text:', comment.textOriginal.substring(0, 50));
        return detectedSentiment === sentimentFilter;
      });
    }

    console.log('After sentiment filtering:', filtered.length);

    // Sort comments
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        case "oldest":
          return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
        case "mostLiked":
          return b.likeCount - a.likeCount;
        case "trustScore":
          return (b.trustScore || 0) - (a.trustScore || 0);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const filteredComments = filterComments(comments);

  const formatTimeAgo = (date: Date | string) => {
    const now = new Date();
    const commentDate = new Date(date);
    const diffTime = Math.abs(now.getTime() - commentDate.getTime());
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return `${Math.floor(diffDays / 7)} weeks ago`;
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive": return "bg-green-100 text-green-800";
      case "negative": return "bg-red-100 text-red-800";
      case "neutral": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Add a function to trigger deep analysis and refetch comments
  const handleDeepAnalysis = async () => {
    try {
      await fetch(`/api/videos/${video.id}/analyze`, {
        method: 'POST',
        headers: { "X-YouTube-API-Key": apiKey }
      });
      // Refetch comments after analysis
      queryClient.invalidateQueries(['/api/videos', video.id, 'comments', apiKey]);
    } catch (err) {
      setCommentsError('Failed to run deep analysis.');
    }
  };

  // In your useQuery or data fetching logic, set commentsError if API returns 403 or error
  // Example (pseudo):
  // if (error && error.status === 403) setCommentsError("Comments are disabled for this video.");
  // if (error) setCommentsError("Unable to analyze comments for this video.");

  // Fallback to 'all' if no comments match the filter
  useEffect(() => {
    if (!comments || comments.length === 0) return;
    const filtered = filterComments(comments);
    if (filtered.length === 0 && sentimentFilter !== "all" && !triedFallback.current) {
      setFallbackNotice(`No ${sentimentFilter} comments found. Showing all comments instead.`);
      setSentimentFilter("all");
      triedFallback.current = true;
    } else if (filtered.length > 0) {
      setFallbackNotice(null);
      triedFallback.current = false;
    }
  }, [comments, sentimentFilter, sortBy]);

  if (commentsError) {
    const isApiKeyError =
      commentsError.toLowerCase().includes("api key") ||
      commentsError.toLowerCase().includes("quota") ||
      commentsError.toLowerCase().includes("invalid");
    return (
      <div className="text-center py-8 text-red-500">
        <div>{commentsError}</div>
        {isApiKeyError && (
          <div className="mt-4 text-base text-white bg-blue-600 rounded p-3 inline-block">
            Don’t have a YouTube API key?&nbsp;
            <a
              href="https://youtu.be/fXPuQY1LKbY?feature=shared"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-white font-semibold"
            >
              Watch this guide
            </a>
            .
          </div>
        )}
      </div>
    );
  }
  if (comments && comments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div>No comments found for this video on YouTube after deep analysis.</div>
      </div>
    );
  }

  if (commentsLoading || analysisLoading) {
    return (
      <Card className="card">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading analysis...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-card-foreground">Detailed Comment Analysis</h2>
        </div>

        {/* Analysis Summary Cards */}
        {analysis && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center">
                <MessageCircle className="text-primary text-lg mr-3" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Comments</p>
                  <p className="text-lg font-bold text-card-foreground">{analysis.totalComments}</p>
                </div>
              </div>
            </div>

            <div className="bg-success/10 rounded-lg p-4">
              <div className="flex items-center">
                <ThumbsUp className="text-success text-lg mr-3" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Positive Sentiment</p>
                  <p className="text-lg font-bold text-card-foreground">{analysis.positiveCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-danger/10 rounded-lg p-4">
              <div className="flex items-center">
                <Bot className="text-danger text-lg mr-3" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Suspicious Activity</p>
                  <p className="text-lg font-bold text-card-foreground">{analysis.suspiciousCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-warning/10 rounded-lg p-4">
              <div className="flex items-center">
                <Shield className="text-warning text-lg mr-3" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Rating</p>
                  <p className="text-lg font-bold text-card-foreground">{analysis.rating}/5</p>
                </div>
              </div>
            </div>
          </div>
        )}
        {analysis && <SummaryCard analysis={analysis} video={video} />}

        {/* Sentiment Summary */}
        {comments && comments.length > 0 && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-blue-900">Sentiment Analysis Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Comments</p>
                    <p className="text-lg font-bold text-blue-900">{comments.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-green-200">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Positive</p>
                    <p className="text-lg font-bold text-green-900">
                      {comments.filter(c => detectSentiment(c.textOriginal) === 'positive').length}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-gray-500 rounded-full mr-2"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Neutral</p>
                    <p className="text-lg font-bold text-gray-900">
                      {comments.filter(c => detectSentiment(c.textOriginal) === 'neutral').length}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-red-200">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Negative</p>
                    <p className="text-lg font-bold text-red-900">
                      {comments.filter(c => detectSentiment(c.textOriginal) === 'negative').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter Controls */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Sentiment:</label>
              <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="positive">Positive</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="negative">Negative</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Sort:</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="mostLiked">Most Liked</SelectItem>
                  <SelectItem value="trustScore">Trust Score</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Add a button to trigger deep analysis (if not already present) */}
        <div className="mb-4 flex justify-end">
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            onClick={handleDeepAnalysis}
          >
            Run Deep Analysis
          </button>
        </div>

        {/* Comments List */}
        <div className="space-y-4">
          {filteredComments.map((comment) => (
            <div 
              key={comment.id} 
              className={`border rounded-lg p-4 ${
                comment.isSuspicious ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start space-x-3">
                <img 
                  src={comment.authorProfileImageUrl || "/api/placeholder/32/32"} 
                  alt={comment.authorDisplayName}
                  className="w-8 h-8 rounded-full"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="font-medium text-gray-900">{comment.authorDisplayName}</span>
                    <span className="text-xs text-gray-500">{formatTimeAgo(comment.publishedAt)}</span>
                    {comment.isVerified && (
                      <Badge className="bg-success/10 text-success">Verified</Badge>
                    )}
                    <Badge className={getSentimentColor(detectSentiment(comment.textOriginal))}>
                      {detectSentiment(comment.textOriginal)}
                      </Badge>
                    {comment.isSuspicious && (
                      <Badge className="bg-yellow-100 text-yellow-800">Suspicious</Badge>
                    )}
                    {comment.isSpam && (
                      <Badge className="bg-red-100 text-red-800">Spam</Badge>
                    )}
                    {comment.isBotLike && (
                      <Badge className="bg-red-100 text-red-800">Bot-like</Badge>
                    )}
                  </div>
                  <p className="text-white mb-2">{comment.textOriginal}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>
                      <ThumbsUp className="w-3 h-3 mr-1 inline" />
                      {comment.likeCount} likes
                    </span>
                    {comment.sentimentScore && (
                      <span>Sentiment: {(comment.sentimentScore * 100).toFixed(0)}%</span>
                    )}
                    <span className={comment.isSuspicious ? "text-warning" : "text-success"}>
                      {comment.isSuspicious ? "⚠ Suspicious" : "✓ Authentic"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredComments.length === 0 && comments && comments.length > 0 && (
          <div className="text-center py-8 text-gray-500">
            All comments were filtered out by your current filters.
          </div>
        )}
        {fallbackNotice && (
          <div className="text-center py-2 text-yellow-400 font-semibold">{fallbackNotice}</div>
        )}
      </CardContent>
    </Card>
  );
}
