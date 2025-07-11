import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Filter, Download, MessageCircle, ThumbsUp, Bot, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Video, Comment, AnalysisResult } from "@shared/schema";

interface CommentAnalysisProps {
  video: Video;
}

export default function CommentAnalysis({ video }: CommentAnalysisProps) {
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [qualityFilter, setQualityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ['/api/videos', video.id, 'comments'],
    enabled: !!video.id,
  });

  const { data: analysis, isLoading: analysisLoading } = useQuery({
    queryKey: ['/api/videos', video.id, 'analysis'],
    enabled: !!video.id,
  });

  const filterComments = (comments: Comment[] = []) => {
    let filtered = [...comments];

    if (sentimentFilter !== "all") {
      filtered = filtered.filter(comment => comment.sentiment === sentimentFilter);
    }

    if (qualityFilter !== "all") {
      switch (qualityFilter) {
        case "high":
          filtered = filtered.filter(comment => !comment.isSuspicious && !comment.isSpam);
          break;
        case "suspicious":
          filtered = filtered.filter(comment => comment.isSuspicious);
          break;
        case "spam":
          filtered = filtered.filter(comment => comment.isSpam);
          break;
      }
    }

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

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
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

  const handleExportComments = () => {
    const exportUrl = `/api/videos/${video.id}/export`;
    const link = document.createElement('a');
    link.href = exportUrl;
    link.download = `comments-${video.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (commentsLoading || analysisLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Loading analysis...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Detailed Comment Analysis</h2>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-1" />
              Filter
            </Button>
            <Button size="sm" onClick={handleExportComments}>
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          </div>
        </div>

        {/* Analysis Summary Cards */}
        {analysis && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center">
                <MessageCircle className="text-primary text-lg mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Comments</p>
                  <p className="text-lg font-bold text-gray-900">{analysis.totalComments}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <ThumbsUp className="text-success text-lg mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Positive Sentiment</p>
                  <p className="text-lg font-bold text-gray-900">{analysis.positiveCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center">
                <Bot className="text-danger text-lg mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Suspicious Activity</p>
                  <p className="text-lg font-bold text-gray-900">{analysis.suspiciousCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center">
                <Shield className="text-warning text-lg mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Trust Rating</p>
                  <p className="text-lg font-bold text-gray-900">{analysis.overallTrustScore}/10</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter Controls */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Sentiment:</label>
              <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                <SelectTrigger className="w-32">
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
              <label className="text-sm font-medium text-gray-700">Quality:</label>
              <Select value={qualityFilter} onValueChange={setQualityFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="high">High Quality</SelectItem>
                  <SelectItem value="suspicious">Suspicious</SelectItem>
                  <SelectItem value="spam">Spam</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Sort:</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32">
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
                    {comment.sentiment && (
                      <Badge className={getSentimentColor(comment.sentiment)}>
                        {comment.sentiment}
                      </Badge>
                    )}
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
                  <p className="text-gray-700 mb-2">{comment.textOriginal}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>
                      <ThumbsUp className="w-3 h-3 mr-1 inline" />
                      {comment.likeCount} likes
                    </span>
                    {comment.trustScore && (
                      <span>Trust Score: {comment.trustScore.toFixed(1)}/10</span>
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

        {filteredComments.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No comments match the selected filters.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
