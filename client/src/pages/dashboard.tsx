import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChartLine, Download, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import VideoSearch from "@/components/video-search";
import VideoCard from "@/components/video-card";
import CommentAnalysis from "@/components/comment-analysis";
import type { Video } from "@shared/schema";

export default function Dashboard() {
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [searchResults, setSearchResults] = useState<Video[]>([]);

  const handleSearch = (results: Video[]) => {
    setSearchResults(results);
    setSelectedVideo(null);
  };

  const handleVideoSelect = (video: Video) => {
    setSelectedVideo(video);
  };

  const handleExport = () => {
    if (selectedVideo) {
      // Create download link for analysis data
      const exportUrl = `/api/videos/${selectedVideo.id}/export`;
      const link = document.createElement('a');
      link.href = exportUrl;
      link.download = `youtube-analysis-${selectedVideo.id}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartLine className="text-primary text-2xl" />
                <span className="ml-2 text-xl font-bold text-gray-900">YouTube Trust Analyzer</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                onClick={handleExport}
                disabled={!selectedVideo}
                className="bg-primary text-white hover:bg-blue-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Analysis
              </Button>
              <div className="relative">
                <User className="h-8 w-8 text-gray-600" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search Section */}
        <VideoSearch onSearch={handleSearch} />

        {/* Results Grid */}
        {searchResults.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {searchResults.map((video) => (
              <VideoCard 
                key={video.id} 
                video={video} 
                onAnalyze={handleVideoSelect}
              />
            ))}
          </div>
        )}

        {/* Detailed Analysis */}
        {selectedVideo && (
          <CommentAnalysis video={selectedVideo} />
        )}
      </div>
    </div>
  );
}
