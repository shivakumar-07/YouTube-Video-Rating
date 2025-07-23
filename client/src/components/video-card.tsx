import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Shield, UserCheck, AlertTriangle, Bot, DollarSign, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import TrustMeter from "@/components/trust-meter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Video, AnalysisResult } from "@shared/schema";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

interface VideoCardProps {
  video: Video;
  onAnalyze: (video: Video, analysisResult?: AnalysisResult) => void;
  rating?: number | null;
  ratingLoading?: boolean;
  analysisResult?: AnalysisResult;
}

export default function VideoCard({ video, onAnalyze, rating, ratingLoading, analysisResult }: VideoCardProps) {
  const [localAnalysisResult, setLocalAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Use analysisResult from props if available, else local state
  const displayAnalysisResult = analysisResult || localAnalysisResult;
  
  // Debug: Log analysis result state
  console.log(`VideoCard ${video.id}:`, { 
    hasAnalysisResult: !!analysisResult, 
    hasLocalResult: !!localAnalysisResult, 
    displayResult: !!displayAnalysisResult,
    rating: displayAnalysisResult?.rating 
  });
  


  const analyzeMutation = useMutation({
    mutationFn: async () => {
      setLocalAnalysisResult(null);
      setIsAnalyzing(true);
      const response = await apiRequest("POST", `/api/videos/${video.id}/analyze`);
      return response.json();
    },
    onSuccess: async (data: AnalysisResult) => {
      setLocalAnalysisResult(data);
      setIsAnalyzing(false);
      try {
        const response = await fetch(`/api/videos/${video.id}`);
        if (response.ok) {
          const updatedVideo = await response.json();
          onAnalyze({ ...updatedVideo }, data);
        } else {
          onAnalyze({ ...video, analyzed: true, trustScore: data.rating }, data);
        }
      } catch {
        onAnalyze({ ...video, analyzed: true, trustScore: data.rating }, data);
      }
      toast({
        title: "Analysis Complete",
        description: `Rating: ${data.rating}/5`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
    },
    onError: async (error: any) => {
      setIsAnalyzing(false);
      let errorMsg = "Failed to analyze video comments. Please try again.";
      if (error instanceof Response) {
        try {
          const data = await error.json();
          if (data && data.message) errorMsg = data.message;
        } catch {}
      } else if (error && error.message) {
        errorMsg = error.message;
      }
      toast({
        title: "Analysis Failed",
        description: errorMsg,
        variant: "destructive",
      });
    },
  });

  const formatNumber = (num: number) => {
    // Defensive check for valid numbers
    if (typeof num !== 'number' || isNaN(num) || num < 0) {
      return '0';
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  const formatDate = (date: Date | string) => {
    try {
    const now = new Date();
    const videoDate = new Date(date);
      
      // Defensive check for valid dates
      if (isNaN(videoDate.getTime()) || isNaN(now.getTime())) {
        return 'Unknown date';
      }
      
      const diffMs = now.getTime() - videoDate.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffWeeks = Math.floor(diffDays / 7);
      const diffMonths = (now.getFullYear() - videoDate.getFullYear()) * 12 + (now.getMonth() - videoDate.getMonth());
      const years = Math.floor(diffMonths / 12);
      const months = diffMonths % 12;
      
      if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
      if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;
      if (diffMonths < 12) return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
      return `${years} year${years !== 1 ? 's' : ''}${months > 0 ? ` ${months} month${months !== 1 ? 's' : ''}` : ''} ago`;
    } catch (error) {
      return 'Unknown date';
    }
  };

  const renderQualityIndicators = () => {
    const indicators = Array.isArray(displayAnalysisResult?.qualityIndicators) ? displayAnalysisResult.qualityIndicators : [];
    if (!indicators.length) return null;

    return (
      <div className="flex flex-wrap gap-2">
        {indicators.map((indicator: any, index: number) => {
          const getIcon = () => {
            switch (indicator.type) {
              case 'spam': return <Shield className="w-3 h-3 mr-1" />;
              case 'bot': return <Bot className="w-3 h-3 mr-1" />;
              case 'verified': return <UserCheck className="w-3 h-3 mr-1" />;
              case 'engagement': return <DollarSign className="w-3 h-3 mr-1" />;
              default: return <AlertTriangle className="w-3 h-3 mr-1" />;
            }
          };

          const getColorClass = () => {
            switch (indicator.color) {
              case 'success': return 'bg-green-100 text-green-800';
              case 'warning': return 'bg-yellow-100 text-yellow-800';
              case 'danger': return 'bg-red-100 text-red-800';
              default: return 'bg-gray-100 text-gray-800';
            }
          };

          return (
            <Badge key={index} className={getColorClass()}>
              {getIcon()}
              {indicator.label}
            </Badge>
          );
        })}
      </div>
    );
  };

  // Defensive checks for video data
  if (!video || !video.id) {
    return (
      <div className="flex flex-col bg-[#212121] rounded-xl shadow-md p-4" style={{ width: 360, minWidth: 360, maxWidth: 360 }}>
        <div className="text-red-400 text-center">Invalid video data</div>
      </div>
    );
  }

  const safeTitle = video.title || 'Untitled Video';
  const safeChannelTitle = video.channelTitle || 'Unknown Channel';
  const safeThumbnail = video.thumbnailUrl || "/api/placeholder/160/90";

  return (
    <Card className="video-card group">
      <CardContent className="p-0">
        {/* Video Thumbnail */}
        <div className="relative">
          <img 
            src={video.thumbnailUrl} 
            alt={video.title}
            className="video-thumbnail w-full h-40 sm:h-48 object-cover rounded-t-xl"
          />
          
          {/* Duration overlay if available */}
          {video.duration && (
            <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
              {video.duration}
            </div>
          )}
          
          {/* Rating overlay */}
          {displayAnalysisResult?.rating && (
            <div className="absolute top-2 right-2">
              <TrustMeter 
                rating={displayAnalysisResult.rating} 
                size="sm"
                showLabel={false}
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Title and Channel */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm sm:text-base leading-tight line-clamp-2 group-hover:text-red-400 transition-colors">
              {video.title}
            </h3>
            <p className="text-gray-400 text-xs sm:text-sm font-medium">
              {video.channelTitle}
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                👁️ {formatNumber(video.viewCount || 0)}
              </span>
              <span className="flex items-center gap-1">
                👍 {formatNumber(video.likeCount || 0)}
              </span>
              <span className="flex items-center gap-1">
                💬 {formatNumber(video.commentCount || 0)}
              </span>
            </div>
            <span>{formatDate(video.publishedAt)}</span>
          </div>

          {/* Analysis Result */}
          {displayAnalysisResult && (
            <div className="space-y-3">
              {/* Rating */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-300">Trust Score:</span>
                  <TrustMeter rating={displayAnalysisResult.rating} size="sm" />
                </div>
              </div>

              {/* Quality Indicators */}
              {renderQualityIndicators()}

              {/* Summary */}
              {displayAnalysisResult.summary && (
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-xs text-gray-300 leading-relaxed">
                    {displayAnalysisResult.summary}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            {!displayAnalysisResult ? (
              <Button
                onClick={() => analyzeMutation.mutate()}
                disabled={isAnalyzing || analyzeMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 disabled:opacity-50"
                size="sm"
              >
                {isAnalyzing || analyzeMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    🔍 Analyze Video
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={() => onAnalyze(video, displayAnalysisResult)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200"
                size="sm"
              >
                📊 View Details
              </Button>
            )}
            
            {/* More options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="w-10 h-10 p-0 hover:bg-gray-800 rounded-lg"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700">
                <DropdownMenuItem 
                  onClick={() => window.open(`https://youtube.com/watch?v=${video.id}`, '_blank')}
                  className="text-gray-300 hover:text-white hover:bg-gray-800 cursor-pointer"
                >
                  🔗 Open on YouTube
                </DropdownMenuItem>
                {displayAnalysisResult && (
                  <DropdownMenuItem 
                    onClick={() => analyzeMutation.mutate()}
                    disabled={isAnalyzing || analyzeMutation.isPending}
                    className="text-gray-300 hover:text-white hover:bg-gray-800 cursor-pointer"
                  >
                    🔄 Re-analyze
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
