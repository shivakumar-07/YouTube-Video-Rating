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
    <div
      className="flex flex-col group hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 ease-in-out overflow-hidden relative bg-[#212121] rounded-xl shadow-md"
      style={{ width: 360, minWidth: 360, maxWidth: 360, border: 'none', padding: 0, borderRadius: 12, fontFamily: 'Roboto, Arial, sans-serif', boxShadow: '0 2px 8px 0 rgba(0,0,0,0.12)' }}
    >
      {/* Thumbnail */}
          <a
            href={`https://www.youtube.com/watch?v=${video.id}`}
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={0}
        aria-label={`Watch ${safeTitle} on YouTube`}
        className="relative overflow-hidden group-hover:scale-105 transition-transform duration-300"
        style={{ width: 360, aspectRatio: '16/9', borderRadius: 12, margin: 0, display: 'block', background: '#181818' }}
          >
            <img 
          src={safeThumbnail}
          alt={safeTitle}
          className="w-full h-full object-cover rounded-xl hover:opacity-90 transition-opacity duration-200 cursor-pointer"
          style={{ width: '100%', height: '100%', borderRadius: 12, aspectRatio: '16/9', display: 'block' }}
          onError={(e) => {
            // Fallback to placeholder if image fails to load
            const target = e.target as HTMLImageElement;
            target.src = "/api/placeholder/160/90";
          }}
            />
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300 rounded-xl"></div>
          </a>

          {/* Info Section */}
      <div className="flex flex-col justify-between min-w-0 px-3 pt-2 pb-2" style={{height: 'auto', flex: 1, paddingTop: 8, paddingBottom: 8}}>
        <div className="flex flex-row items-center justify-between min-h-0">
          <div className="flex-1 min-w-0">
            {/* Title */}
              <a
                href={`https://www.youtube.com/watch?v=${video.id}`}
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={0}
              aria-label={`Watch ${safeTitle} on YouTube`}
                className="hover:underline cursor-pointer group"
              >
              <h3 className="font-semibold text-white mb-0 text-[1rem] leading-tight group-hover:text-primary transition-colors duration-200 line-clamp-2" style={{ maxHeight: '2.7em', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600, fontSize: '1rem', lineHeight: 1.2, marginBottom: 2 }}>
                {safeTitle}
                </h3>
              </a>
            {/* Channel name row */}
              <a
              href={`https://www.youtube.com/channel/${video.channelId || 'UC'}`}
                target="_blank"
                rel="noopener noreferrer"
              className="text-xs text-[#aaa] hover:underline truncate block max-w-full mt-0.5"
              aria-label={`Visit ${safeChannelTitle} channel on YouTube`}
              style={{ fontWeight: 500, margin: 0, padding: 0, lineHeight: 1.2, maxWidth: '100%', fontSize: '0.92rem', color: '#aaa', marginBottom: 2 }}
              >
              {safeChannelTitle}
              </a>
            {/* Meta row */}
            <div className="flex flex-wrap items-center text-xs text-[#aaa] gap-x-2 gap-y-0.5 mt-0.5" style={{ fontSize: '0.9rem', lineHeight: 1.2, color: '#aaa', marginBottom: 2 }}>
                <span>{formatNumber(video.viewCount)} views</span>
              <span>• {formatDate(video.publishedAt)}</span>
            </div>
            {/* Metrics row: only show if at least one metric is present */}
            {(video.likeCount !== undefined && video.likeCount !== null) || (video.commentCount !== undefined && video.commentCount !== null) || (typeof rating === 'number') ? (
              <div className="flex flex-row items-center gap-x-2 text-xs text-[#aaa] mt-1" style={{ fontSize: '0.93rem', lineHeight: 1.2, marginTop: 6 }}>
                {/* Likes (YouTube thumbs up PNG from public) */}
                <span className="flex items-center gap-1">
                  <img src="/like-icon.png" alt="Like" width={18} height={18} style={{display:'inline-block',verticalAlign:'middle'}} />
                  {(video.likeCount !== undefined && video.likeCount !== null) ? (
                    <span className="font-bold text-white" style={{fontSize:'1rem',marginLeft:2}}>{formatNumber(video.likeCount)}</span>
                  ) : (
                    <span className="font-bold" style={{fontSize:'1rem',marginLeft:2, color:'#888'}}>N/A</span>
                  )}
                </span>
                {/* Comments (chat bubble) */}
                <span className="flex items-center gap-1">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  {(video.commentCount !== undefined && video.commentCount !== null) ? (
                    <span className="font-bold text-white" style={{fontSize:'1rem',marginLeft:2}}>{formatNumber(video.commentCount)}</span>
                  ) : (
                    <span className="font-bold" style={{fontSize:'1rem',marginLeft:2, color:'#888'}}>N/A</span>
                  )}
                </span>
                {/* Rating (star) */}
                <span className="flex items-center gap-1">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={typeof rating === 'number' ? (rating >= 3.5 ? '#FFD700' : rating > 0 ? '#e53935' : '#888') : '#888'} stroke={typeof rating === 'number' ? (rating >= 3.5 ? '#FFD700' : rating > 0 ? '#e53935' : '#888') : '#888'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    {ratingLoading ? (
                    <span className="animate-spin inline-block w-3 h-3 border-2 border-[#e53935] border-t-transparent rounded-full"></span>
                  ) : typeof rating === 'number' ? (
                    <span className="font-bold" style={{ color: (rating >= 3.5 ? '#FFD700' : rating > 0 ? '#e53935' : '#888'), fontSize:'1rem',marginLeft:2 }}>{rating.toFixed(2)}</span>
                  ) : (
                    <span className="font-bold" style={{fontSize:'1rem',marginLeft:2, color:'#888'}}>N/A</span>
                  )}
                  </span>
              </div>
            ) : null}
          </div>
          {/* 3-dot menu vertically centered with thumbnail */}
          <div className="flex items-center h-full pl-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 p-0 text-[#aaa]">
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer">
                      Open on YouTube
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigator.clipboard.writeText(`https://www.youtube.com/watch?v=${video.id}`)}>
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => analyzeMutation.mutate()} disabled={analyzeMutation.isPending || isAnalyzing}>
                    {analyzeMutation.isPending || isAnalyzing ? (
                      <span className="flex items-center gap-2"><RefreshCw className="w-3 h-3 animate-spin" /> Analyzing...</span>
                    ) : (
                      <span>Deep Analysis</span>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
        </div>
            {/* Trust Analysis Section (collapsible/overlay) */}
        {displayAnalysisResult && (
              <div className="animate-in slide-in-from-bottom-2 duration-300 mt-2 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="#FF0000" viewBox="0 0 20 20" width="18" height="18" className="inline-block"><path d="M10 15l-5.878 3.09 1.122-6.545L.488 6.91l6.561-.955L10 0l2.951 5.955 6.561.955-4.756 4.635 1.122 6.545z"/></svg>
            <span className="text-lg font-bold text-primary">{displayAnalysisResult.rating.toFixed(2)} / 5</span>
              </div>
            )}
            {(analyzeMutation.isPending || isAnalyzing) && (
          <div className="text-center py-2 text-muted-foreground">
                <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span className="text-sm animate-pulse">Analyzing comments...</span>
                </div>
              </div>
            )}
      </div>
    </div>
  );
}
