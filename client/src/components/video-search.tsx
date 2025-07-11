import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Video } from "@shared/schema";

interface VideoSearchProps {
  onSearch: (results: Video[]) => void;
}

export default function VideoSearch({ onSearch }: VideoSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [maxResults, setMaxResults] = useState("10");
  const [order, setOrder] = useState("relevance");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Error",
        description: "Please enter a search query",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest(
        "GET",
        `/api/videos/search?q=${encodeURIComponent(searchQuery)}&maxResults=${parseInt(maxResults)}&order=${order}`
      );
      const results = await response.json();
      onSearch(results);
      toast({
        title: "Success",
        description: `Found ${results.length} videos`,
      });
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Error",
        description: "Failed to search videos. Please check your YouTube API key.",
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

  return (
    <div className="mb-8">
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Search YouTube Videos</h2>
          <div className="flex space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search for videos by topic, keyword, or channel..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-10"
                />
              </div>
            </div>
            <Button 
              onClick={handleSearch} 
              disabled={isLoading}
              className="bg-primary text-white hover:bg-blue-700"
            >
              <Search className="w-4 h-4 mr-2" />
              {isLoading ? "Searching & Analyzing..." : "Search"}
            </Button>
          </div>
          <div className="mt-4 flex space-x-4">
            <Select value={maxResults} onValueChange={setMaxResults}>
              <SelectTrigger className="w-48">
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
              <SelectTrigger className="w-48">
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
