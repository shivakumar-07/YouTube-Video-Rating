import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Shield, UserCheck, AlertTriangle, Bot, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import TrustMeter from "@/components/trust-meter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Video, AnalysisResult } from "@shared/schema";

interface VideoCardProps {
  video: Video;
  onAnalyze: (video: Video) => void;
}

export default function VideoCard({ video, onAnalyze }: VideoCardProps) {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/videos/${video.id}/analyze`);
      return response.json();
    },
    onSuccess: (data: AnalysisResult) => {
      setAnalysisResult(data);
      onAnalyze({ ...video, analyzed: true, trustScore: data.overallTrustScore });
      toast({
        title: "Analysis Complete",
        description: `Trust score: ${data.overallTrustScore}/10`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
    },
    onError: (error) => {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze video comments. Please try again.",
        variant: "destructive",
      });
    },
  });

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  const formatDate = (date: Date | string) => {
    const now = new Date();
    const videoDate = new Date(date);
    const diffTime = Math.abs(now.getTime() - videoDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const renderQualityIndicators = () => {
    if (!analysisResult?.qualityIndicators) return null;

    return (
      <div className="flex flex-wrap gap-2">
        {analysisResult.qualityIndicators.map((indicator: any, index: number) => {
          const getIcon = () => {
            switch (indicator.type) {
              case 'spam': return <Shield className="w-3 h-3 mr-1" />;
              case 'bot': return <Bot className="w-3 h-3 mr-1" />;
              case 'verified': return <UserCheck className="w-3 h-3 mr-1" />;
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
            <Badge key={index} variant="secondary" className={getColorClass()}>
              {getIcon()}
              {indicator.label}
            </Badge>
          );
        })}
      </div>
    );
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex space-x-4">
          <img 
            src={video.thumbnailUrl || "/api/placeholder/120/90"} 
            alt={video.title}
            className="w-32 h-24 object-cover rounded-lg flex-shrink-0"
          />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{video.title}</h3>
            <p className="text-sm text-gray-600 mb-2">{video.channelTitle}</p>
            <div className="flex items-center text-sm text-gray-500 space-x-4">
              <span>{formatNumber(video.viewCount)} views</span>
              <span>{formatDate(video.publishedAt)}</span>
              <span>{video.duration}</span>
            </div>
          </div>
        </div>

        {/* Trust Analysis Section */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">Trust Analysis</h4>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${analyzeMutation.isPending ? 'animate-spin' : ''}`} />
              {analyzeMutation.isPending ? 'Analyzing...' : 'Analyze Comments'}
            </Button>
          </div>

          {video.analyzed && (video.trustScore || analysisResult) && (
            <>
              {/* Trust Meter */}
              <TrustMeter 
                score={analysisResult?.overallTrustScore || video.trustScore || 0} 
                className="mb-4"
              />

              {/* Sentiment Breakdown */}
              {analysisResult && (
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-success">
                      {Math.round((analysisResult.positiveCount / analysisResult.totalComments) * 100)}%
                    </div>
                    <div className="text-xs text-gray-500">Positive</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-600">
                      {Math.round((analysisResult.neutralCount / analysisResult.totalComments) * 100)}%
                    </div>
                    <div className="text-xs text-gray-500">Neutral</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-danger">
                      {Math.round((analysisResult.negativeCount / analysisResult.totalComments) * 100)}%
                    </div>
                    <div className="text-xs text-gray-500">Negative</div>
                  </div>
                </div>
              )}

              {/* Quality Indicators */}
              {renderQualityIndicators()}
            </>
          )}

          {!video.analyzed && !analyzeMutation.isPending && (
            <div className="text-center py-4 text-gray-500">
              Click "Analyze Comments" to get trust analysis
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
