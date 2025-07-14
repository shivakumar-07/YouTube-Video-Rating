import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Video } from "@shared/schema";
import { useYTApiKey } from "@/App";

interface VideoSearchProps {
  onSearch: (results: Video[]) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  maxResults: string;
  setMaxResults: (results: string) => void;
  order: string;
  setOrder: (order: string) => void;
  onClearSelection?: () => void;
}

export default function VideoSearch({ onSearch, searchQuery, setSearchQuery, maxResults, setMaxResults, order, setOrder, onClearSelection }: VideoSearchProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { apiKey, setApiKey } = useYTApiKey();

  const handleSearch = async () => {
    const localApiKey = apiKey || localStorage.getItem("yt_api_key") || "";
    if (!searchQuery.trim() || !localApiKey) {
      toast({
        title: "Error",
        description: "Please enter a search query and ensure your YouTube API key is set.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/videos/search?q=${encodeURIComponent(searchQuery)}&maxResults=${maxResults}&order=${order}`, {
        headers: {
          "X-YouTube-API-Key": localApiKey,
        },
      });
      if (!response.ok) {
        toast({
          title: "API Error",
          description: "Invalid or expired API key. Please enter a valid YouTube Data API v3 key.",
          variant: "destructive",
        });
        setApiKey(""); // This will prompt the user to re-enter their key
        return;
      }
      const data = await response.json();
      if (data.message && data.message.toLowerCase().includes("api key")) {
        toast({
          title: "API Error",
          description: data.message,
          variant: "destructive",
        });
        setApiKey("");
        return;
      }
      onClearSelection?.();
      onSearch(data);
      toast({
        title: "Success",
        description: `Found ${data.length} videos`,
      });
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Network Error",
        description: "Failed to fetch videos. Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Auto-trigger search when searchQuery, maxResults, or order changes
  useEffect(() => {
    if (searchQuery.trim() && apiKey) {
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, maxResults, order]);

  return (
    <div className="mb-8">
      <Card className="card border-0 shadow-lg">
        <CardContent className="pt-6">
          <h2 className="text-lg font-bold text-card-foreground mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            Search YouTube Videos
          </h2>
          <div className="flex space-x-4">
            <div className="flex-1">
              <div className="relative group">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                <Input
                  type="text"
                  placeholder="Search for videos by topic, keyword, or channel..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-10 border-border bg-muted text-card-foreground focus:border-primary focus:ring-primary transition-all duration-200"
                />
                {isLoading && <div className="absolute right-3 top-3 w-4 h-4 animate-spin border-2 border-primary border-t-transparent rounded-full"></div>}
              </div>
            </div>
          </div>
          <div className="mt-4 flex space-x-4">
            <Select value={maxResults} onValueChange={setMaxResults}>
              <SelectTrigger className="w-48 border-border bg-muted text-card-foreground focus:border-primary focus:ring-primary transition-all duration-200">
                <SelectValue placeholder="Results count" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 results</SelectItem>
                <SelectItem value="10">10 results</SelectItem>
                <SelectItem value="15">15 results</SelectItem>
                <SelectItem value="20">20 results</SelectItem>
                <SelectItem value="25">25 results</SelectItem>
                <SelectItem value="50">50 results</SelectItem>
              </SelectContent>
            </Select>
            <Select value={order} onValueChange={setOrder}>
              <SelectTrigger className="w-48 border-border bg-muted text-card-foreground focus:border-primary focus:ring-primary transition-all duration-200">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="date">Upload Date</SelectItem>
                <SelectItem value="rating">Rating</SelectItem>
                <SelectItem value="viewCount">View Count</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
