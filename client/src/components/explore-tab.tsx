import React, { useState } from "react";
import { demoVideos } from "../lib/demoVideos";

const categories = ["Trending", "Music", "News", "Gaming"];

interface ExploreTabProps {
  onAnalyze: (videoId: string) => void;
}

export const ExploreTab: React.FC<ExploreTabProps> = ({ onAnalyze }) => {
  const [active, setActive] = useState("Trending");
  const filtered = demoVideos.filter((v) => v.category === active);

  return (
    <div className="w-full">
      <div className="flex space-x-4 border-b mb-4">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`px-4 py-2 font-semibold border-b-2 ${active === cat ? "border-blue-600 text-blue-600" : "border-transparent text-gray-600"}`}
            onClick={() => setActive(cat)}
          >
            {cat}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 p-4">
        {filtered.map((video) => (
          <div key={video.id} className="bg-white rounded shadow p-2 flex flex-col items-center">
            <img src={video.thumbnail} alt={video.title} className="w-full h-40 object-cover rounded" />
            <h3 className="mt-2 text-lg font-semibold text-center">{video.title}</h3>
            <p className="text-sm text-gray-600 text-center mb-2">{video.description}</p>
            <button
              className="mt-auto px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={() => onAnalyze(video.id)}
            >
              Analyze Comments
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}; 