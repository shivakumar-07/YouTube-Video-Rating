// HomePage and ExploreTab are now integrated with a tab switcher for demo purposes.
import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChartLine, Download, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import VideoSearch from "@/components/video-search";
import VideoCard from "@/components/video-card";
import CommentAnalysis from "@/components/comment-analysis";
import type { Video, AnalysisResult } from "@shared/schema";

function fetchYouTubeSuggestions(query: string): Promise<string[]> {
  return fetch(`/api/suggest?q=${encodeURIComponent(query)}`)
    .then(res => res.json())
    .then(data => Array.isArray(data) ? data : [])
    .catch(() => []);
}

export default function Dashboard() {
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [ratings, setRatings] = useState<{ [videoId: string]: number | null | undefined }>({});
  const [loadingRatings, setLoadingRatings] = useState<{ [videoId: string]: boolean }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [maxResults, setMaxResults] = useState("10");
  const [order, setOrder] = useState("relevance");
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<{ id: string; title: string }[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null); // null means 'All'
  const [trendingTerms, setTrendingTerms] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedSuggestion, setHighlightedSuggestion] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const bufferRef = useRef<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [lastSearchQuery, setLastSearchQuery] = useState<string>("");
  const [lastSearchResults, setLastSearchResults] = useState<Video[]>([]);
  const [videoCount, setVideoCount] = useState(10); // default to 10

  // Filter state
  const [sortBy, setSortBy] = useState('relevance');
  const [type, setType] = useState('video');
  const [uploadDate, setUploadDate] = useState('any');
  const [duration, setDuration] = useState('any');

  // Helper to build search params
  const buildSearchParams = (q: string) => {
    const params = new URLSearchParams();
    params.set('q', q);
    params.set('maxResults', String(videoCount));
    params.set('order', sortBy);
    params.set('type', type);
    if (uploadDate !== 'any') params.set('uploadDate', uploadDate);
    if (duration !== 'any') params.set('duration', duration);
    return params.toString();
  };

  // Helper to fetch videos for infinite scroll and search
  const fetchVideos = async (q: string, pageToken?: string) => {
    try {
      const url = `/api/videos/search?${buildSearchParams(q)}`;
      const res = await fetch(url, {
        headers: { "X-YouTube-API-Key": localStorage.getItem("yt_api_key") || "" },
      });
      if (!res.ok) {
        let errMsg = "Failed to search videos";
        try {
          const errData = await res.json();
          errMsg = errData.error || errData.message || errMsg;
        } catch {
          // If JSON parsing fails, use status text
          errMsg = res.statusText || errMsg;
        }
        throw new Error(errMsg);
      }
      const data = await res.json();
      
      // Validate response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format from server');
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching videos:', error);
      throw error;
    }
  };

  // Example/demo videos for fallback
  const demoVideos = [
    {
      id: "Ke90Tje7VS0",
      title: "How to Learn React Fast",
      thumbnailUrl: "https://i.ytimg.com/vi/Ke90Tje7VS0/hqdefault.jpg",
      channelTitle: "Academind",
      viewCount: 1200000,
      publishedAt: new Date(),
      likeCount: 25000,
      commentCount: 1200,
      duration: "PT10M",
      description: "A quick guide to learning React.js efficiently.",
      channelId: "UCkR0GY0ue02aMyM-oxwgg9g",
      analyzed: null,
      trustScore: null,
      createdAt: null,
    },
    {
      id: "3JZ_D3ELwOQ",
      title: "Top 10 Music Hits 2024",
      thumbnailUrl: "https://i.ytimg.com/vi/3JZ_D3ELwOQ/hqdefault.jpg",
      channelTitle: "MusicWorld",
      viewCount: 980000,
      publishedAt: new Date(),
      likeCount: 18000,
      commentCount: 900,
      duration: "PT8M",
      description: "The best music hits of 2024 in one video!",
      channelId: "UC-9-kyTW8ZkZNDHQJ6FgpwQ",
      analyzed: null,
      trustScore: null,
      createdAt: null,
    },
    {
      id: "5qap5aO4i9A",
      title: "World News Today",
      thumbnailUrl: "https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg",
      channelTitle: "NewsNow",
      viewCount: 500000,
      publishedAt: new Date(),
      likeCount: 8000,
      commentCount: 400,
      duration: "PT5M",
      description: "Latest updates from around the world.",
      channelId: "UCYfdidRxbB8Qhf0Nx7ioOYw",
      analyzed: null,
      trustScore: null,
      createdAt: null,
    },
  ];

  // Fetch categories on mount
  useEffect(() => {
    fetch("/api/videos/categories", {
      headers: { "X-YouTube-API-Key": localStorage.getItem("yt_api_key") || "" },
    })
      .then((res) => res.json())
      .then((data) => {
        setCategories(Array.isArray(data) ? data : []);
      })
      .catch(() => setCategories([]));
  }, []);

  // Combined Filters UI with click-away to close
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Click-away handler for filter dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilterDropdown(false);
      }
    }
    if (showFilterDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showFilterDropdown]);

  const Filters = () => (
    <div className="relative" ref={filterRef}>
      <button
        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
        onClick={() => setShowFilterDropdown((prev) => !prev)}
        type="button"
      >
        Filters
      </button>
      {showFilterDropdown && (
        <div
          className="absolute right-0 mt-2 w-72 bg-[#232323] border border-[#333] rounded shadow-lg z-30 p-4 flex flex-col gap-3"
          style={{ left: 'auto', right: 0, minWidth: 250, maxWidth: 320 }}
        >
          <div>
            <label className="text-xs text-gray-400 mr-1">Sort by</label>
            <select className="bg-[#232323] text-white rounded p-1 w-full" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="relevance">Relevance</option>
              <option value="date">Upload date</option>
              <option value="viewCount">View count</option>
              <option value="rating">Rating</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mr-1">Type</label>
            <select className="bg-[#232323] text-white rounded p-1 w-full" value={type} onChange={e => setType(e.target.value)}>
              <option value="video">Video</option>
              <option value="channel">Channel</option>
              <option value="live">Live</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mr-1">Upload date</label>
            <select className="bg-[#232323] text-white rounded p-1 w-full" value={uploadDate} onChange={e => setUploadDate(e.target.value)}>
              <option value="any">Any time</option>
              <option value="last_hour">Last hour</option>
              <option value="today">Today</option>
              <option value="this_week">This week</option>
              <option value="this_month">This month</option>
              <option value="this_year">This year</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mr-1">Duration</label>
            <select className="bg-[#232323] text-white rounded p-1 w-full" value={duration} onChange={e => setDuration(e.target.value)}>
              <option value="any">Any</option>
              <option value="short">Under 4 mins</option>
              <option value="medium">4-20 mins</option>
              <option value="long">Over 20 mins</option>
            </select>
          </div>
          <button
            className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 w-full"
            onClick={() => { setShowFilterDropdown(false); handleTrendingOrSuggestionClick(searchQuery || 'cse course'); }}
            type="button"
          >
            Apply Filters
          </button>
        </div>
      )}
    </div>
  );

  // On mount, if no category or search is active, trigger a search for 'cse course' as the default homepage content
  useEffect(() => {
    if (!activeCategory && !searchQuery) {
      handleTrendingOrSuggestionClick('cse course');
    }
    // eslint-disable-next-line
  }, []);

  // On mount, set 'Trending' as the default category and show trending videos
  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      const trendingCat = categories.find(cat => cat.title.toLowerCase() === 'trending');
      if (trendingCat) {
        handleCategoryClick(trendingCat.id);
      }
    }
    // eslint-disable-next-line
  }, [categories]);

  // Fetch trending search terms (best effort)
  useEffect(() => {
    fetchYouTubeSuggestions("").then((terms) => {
      if (terms.length > 0) setTrendingTerms(terms.slice(0, 10));
      else setTrendingTerms(["Music", "News", "Live", "Gaming", "Movies", "Sports", "Learning", "Trending", "Technology", "Comedy"]);
    });
  }, []);

  // Fetch suggestions as user types
  useEffect(() => {
    if (!searchQuery) { setSuggestions([]); return; }
    let cancelled = false;
    fetchYouTubeSuggestions(searchQuery).then((sugs) => {
      if (!cancelled) setSuggestions(sugs);
    });
    return () => { cancelled = true; };
  }, [searchQuery]);

  // Update handleTrendingOrSuggestionClick to use filters
  const handleTrendingOrSuggestionClick = (term: string) => {
    // This function is now responsible for updating the URL and state
    // It will be called from the search bar or suggestion chips
    // For now, it just updates the search query and sorts
    setSearchQuery(term);
    setSortBy('relevance');
    setType('video');
    setUploadDate('any');
    setDuration('any');
    setActiveCategory(null);
  };

  // On search or filter change, fetch first page
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q") || "";
    setVideos([]);
    setError(null);
    // Note: analysisResults are preserved across searches to maintain deep analysis state
    if (q) {
      setLoading(true);
      fetchVideos(q).then(data => {
        try {
          // Defensive checks for data structure
          const videosArray = Array.isArray(data.videos) ? data.videos : [];
          const validVideos = videosArray.filter((video: any) => 
            video && 
            video.id && 
            typeof video.id === 'string' &&
            video.title && 
            typeof video.title === 'string'
          );
          
          setVideos(validVideos);
          setLastSearchQuery(q);
          setLastSearchResults(validVideos);
        } catch (error) {
          console.error('Error processing video data:', error);
          setVideos([]);
          setError('Error processing video data');
        } finally {
          setLoading(false);
        }
      }).catch((err) => {
        setVideos([]);
        setLoading(false);
        setError(err instanceof Error ? err.message : String(err));
      });
    }
    // eslint-disable-next-line
  }, [window.location.search, sortBy, type, uploadDate, duration]);

  // Efficiently load ratings for only new videos
  useEffect(() => {
    if (!Array.isArray(videos) || videos.length === 0) return;
    let cancelled = false;
    const newVideos = videos.filter(v => ratings[v.id] === undefined);
    if (newVideos.length === 0) return;
    async function loadRatingsForNewVideos(index: number) {
      if (cancelled || index >= newVideos.length) return;
      const video = newVideos[index];
      setLoadingRatings((prev) => ({ ...prev, [video.id]: true }));
      try {
        const res = await fetch(`/api/videos/${video.id}/quick-rating`, {
          headers: { "X-YouTube-API-Key": localStorage.getItem("yt_api_key") || "" },
        });
        if (res.ok) {
          const data = await res.json();
          setRatings((prev) => ({ ...prev, [video.id]: data.rating }));
        } else {
          setRatings((prev) => ({ ...prev, [video.id]: null }));
        }
      } catch {
        setRatings((prev) => ({ ...prev, [video.id]: null }));
      }
      setLoadingRatings((prev) => ({ ...prev, [video.id]: false }));
      if (!cancelled) {
        loadRatingsForNewVideos(index + 1);
      }
    }
    loadRatingsForNewVideos(0);
    return () => { cancelled = true; };
  }, [videos]);

  // Handle search from search bar or chip/suggestion
  const handleSearch = useCallback((results: Video[]) => {
    setVideos(results);
    setActiveCategory(null);
    setRatings({});
    // Don't clear analysisResults - preserve them across searches
    setShowSuggestions(false);
  }, []);

  // Sync searchQuery state with URL 'q' param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q') || '';
    setSearchQuery(q);
  }, [window.location.search]);

  // Update URL on search, category, or logo click
  const handleLogoClick = () => {
    // Reset filters and search state, and trigger default search
    setSearchQuery("cse course");
    setSortBy('relevance');
    setType('video');
    setUploadDate('any');
    setDuration('any');
    setActiveCategory(null);
    window.history.pushState({}, '', '/?q=cse+course&order=relevance&type=video&uploadDate=any&duration=any');
  };
  const handleCategoryClick = (catId: string | null) => {
    if (catId === null) window.history.pushState({}, '', '/');
    else window.history.pushState({}, '', `/?category=${encodeURIComponent(catId)}`);
  };

  const handleVideoSelect = (video: Video) => {
    setSelectedVideo(video);
  };

  // Update handleVideoUpdate to accept analysis result
  const handleVideoUpdate = (updatedVideo: Video, analysisResult?: AnalysisResult) => {
    console.log('handleVideoUpdate called:', { videoId: updatedVideo.id, analysisResult });
    setVideos((prev) => prev.map(v => v.id === updatedVideo.id ? { ...v, trustScore: updatedVideo.trustScore } : v));
    if (selectedVideo && selectedVideo.id === updatedVideo.id) {
      setSelectedVideo({ ...selectedVideo, trustScore: updatedVideo.trustScore });
    }
    if (analysisResult) {
      console.log('Storing analysis result for video:', updatedVideo.id, analysisResult);
      setAnalysisResults(prev => {
        const newState = { ...prev, [updatedVideo.id]: analysisResult };
        console.log('New analysisResults state:', newState);
        return newState;
      });
    }
  };

  // Keyboard navigation for suggestions
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedSuggestion((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedSuggestion((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      if (highlightedSuggestion >= 0 && highlightedSuggestion < suggestions.length) {
        handleTrendingOrSuggestionClick(suggestions[highlightedSuggestion]);
      } else if (searchQuery.trim()) {
        handleTrendingOrSuggestionClick(searchQuery.trim());
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  // Reset highlighted suggestion when suggestions change
  useEffect(() => {
    setHighlightedSuggestion(-1);
  }, [suggestions, showSuggestions]);

  const [analysisResults, setAnalysisResults] = useState<{ [videoId: string]: AnalysisResult }>({});

  const analyzedVideoIds = Object.keys(analysisResults);
  const latestVideoId = analyzedVideoIds[analyzedVideoIds.length - 1];
  const latestAnalysis = latestVideoId ? analysisResults[latestVideoId] : undefined;
  const latestVideo = latestVideoId ? videos.find(v => v.id === latestVideoId) : undefined;

  return (
    <div className="min-h-screen bg-background">
      <header className="topbar shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                className="text-2xl font-extrabold text-white tracking-tight flex items-center focus:outline-none"
                style={{ fontFamily: 'Roboto, Arial, sans-serif', background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={handleLogoClick}
                aria-label="Go to homepage"
              >
                <span className="inline-block align-middle mr-2" style={{ fontSize: 28, fontWeight: 900, color: '#FF0000', letterSpacing: '-2px' }}>▶</span>
                YouTube Rating Analyzer
              </button>
            </div>
            <div className="flex items-center space-x-4"></div>
          </div>
        </div>
        {/* Trending Search Terms Chips */}
        <div className="w-full overflow-x-auto whitespace-nowrap px-4 py-2 bg-[#181818]">
          {trendingTerms.map((term) => (
            <span
              key={term}
              className="chip cursor-pointer bg-gray-700 text-white hover:bg-blue-600 hover:text-white mr-2"
              onClick={() => handleTrendingOrSuggestionClick(term)}
            >
              {term}
            </span>
          ))}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-4">
        {/* Video count selector */}
        <div className="flex justify-end mb-4">
          <label htmlFor="video-count" className="mr-2 text-white">Videos per page:</label>
          <select
            id="video-count"
            value={videoCount}
            onChange={e => setVideoCount(Number(e.target.value))}
            className="bg-[#232323] text-white rounded p-1"
          >
            {[5, 10, 15, 20, 25].map(count => (
              <option key={count} value={count}>{count}</option>
            ))}
          </select>
        </div>
        {/* Search Section with Suggestions and Filters */}
        <div className="animate-in slide-in-from-top-4 duration-500 mb-6 relative">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full max-w-4xl mx-auto gap-2">
            <div className="relative w-full sm:max-w-xl">
              <input
                ref={inputRef}
                type="text"
                className="w-full p-2 border rounded bg-[#232323] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                style={{ caretColor: '#fff' }}
                placeholder="Search for videos, keywords, or channels..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
                onKeyDown={handleInputKeyDown}
              />
              {searchQuery && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center bg-black bg-opacity-60 rounded-full text-white hover:text-red-400 border-none p-0 m-0 cursor-pointer shadow-lg"
                  style={{ fontSize: 22, width: 32, height: 32 }}
                  aria-label="Clear search"
                  title="Clear search"
                  onClick={() => {
                    if (searchQuery) {
                      // If there was a previous search, restore it
                      if (lastSearchQuery) {
                        setSearchQuery(lastSearchQuery);
                        setVideos(lastSearchResults);
                        window.history.pushState({}, '', `/${window.location.search.replace(/q=[^&]*/, '')}q=${encodeURIComponent(lastSearchQuery)}&order=${sortBy}&type=${type}&uploadDate=${uploadDate}&duration=${duration}`);
                      } else {
                        // If on homepage, do nothing (trending/default will show)
                        setSearchQuery("");
                        setActiveCategory(null);
                        setSortBy('relevance');
                        setType('video');
                        setUploadDate('any');
                        setDuration('any');
                        if (window.location.pathname !== "/" || window.location.search) {
                          window.history.pushState({}, '', '/');
                        }
                      }
                    }
                  }}
                >
                  ×
                </button>
              )}
              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute left-0 right-0 bg-[#232323] border border-[#333] rounded shadow z-20 max-h-48 overflow-y-auto text-white">
                  {suggestions.map((s, idx) => (
                    <li
                      key={s}
                      className={`p-2 cursor-pointer ${idx === highlightedSuggestion ? 'bg-blue-700 text-white' : 'hover:bg-blue-700 hover:text-white'}`}
                      onMouseDown={() => handleTrendingOrSuggestionClick(s)}
                      onMouseEnter={() => setHighlightedSuggestion(idx)}
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              )}
              {/* Prominent API key error message below search bar */}
              {error && (
                <div className="absolute left-0 right-0 mt-2 bg-red-600 text-white text-center rounded shadow-lg py-2 px-4 z-30 font-semibold animate-in fade-in duration-300" style={{fontSize:'1rem'}}>
                  {error}
                </div>
              )}
            </div>
            {/* Combined Filters dropdown to the right on desktop, below on mobile */}
            <div className="w-full sm:w-auto flex justify-end">
              <Filters />
            </div>
          </div>
        </div>
        {/* Results Grid or Demo Videos */}
        {error ? (
          <div className="text-center text-red-400 py-8 font-semibold">{error}</div>
        ) : loading ? (
          <div className="text-center text-white py-8">Loading videos...</div>
        ) : Array.isArray(videos) && videos.length > 0 ? (
          <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mb-6">
              {Array.from(new Map(videos.map(v => [v.id, v])).values())
                .filter(video => video && video.id && typeof video.id === 'string') // Filter out invalid videos
                .map((video, index) => (
              <div 
                key={video.id}
                className="animate-in slide-in-from-bottom-4 duration-500"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <VideoCard 
                  video={video}
                  rating={ratings[video.id]}
                  ratingLoading={loadingRatings[video.id]}
                      analysisResult={analysisResults[video.id]}
                      onAnalyze={(v: Video, analysisResult?: AnalysisResult) => { 
                        try {
                          handleVideoSelect(v); 
                          handleVideoUpdate(v, analysisResult); 
                        } catch (error) {
                          console.error('Error handling video analysis:', error);
                        }
                      }}
                />
              </div>
            ))}
            </div>
            {/* Detailed Analysis Section */}
            {Object.keys(analysisResults).length > 0 && (
              <div className="mt-8 p-4 bg-[#181818] rounded-lg shadow-lg">
                <h2 className="text-xl font-bold text-white mb-4">Detailed Analysis</h2>
                {latestAnalysis && latestVideo && (
                  <div className="mt-8 p-4 bg-[#181818] rounded-lg shadow-lg">
                    <h2 className="text-xl font-bold text-white mb-4">Detailed Analysis</h2>
                    <h3 className="text-lg font-semibold text-primary mb-2">{latestVideo.title}</h3>
                    <CommentAnalysis video={latestVideo} />
                    <div className="mt-2 text-white">Rating: <span className="font-bold">{latestAnalysis.rating.toFixed(2)} / 5</span></div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-gray-400 py-8">
            No videos found for your search or category.
          </div>
        )}
        {/* Detailed Analysis for selected video (if needed) */}
        {/* {selectedVideo && (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            <CommentAnalysis video={selectedVideo} />
          </div>
        )} */}
      </div>
    </div>
  );
}