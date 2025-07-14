import React, { useState } from "react";
import { demoVideos } from "../lib/demoVideos";

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = Array.from(
    new Set([
      ...demoVideos.map((v) => v.title),
      ...demoVideos.map((v) => v.category),
    ])
  ).filter((s) => s.toLowerCase().includes(query.toLowerCase()) && query.length > 0);

  const handleSelect = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    onSearch(suggestion);
  };

  return (
    <div className="relative w-full max-w-xl mx-auto">
      <input
        type="text"
        className="w-full p-2 border rounded"
        placeholder="Search videos, categories..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
      />
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 bg-white border rounded shadow z-10 max-h-48 overflow-y-auto">
          {suggestions.map((s) => (
            <li
              key={s}
              className="p-2 hover:bg-gray-100 cursor-pointer"
              onMouseDown={() => handleSelect(s)}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}; 