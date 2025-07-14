import React from "react";
import { demoVideos } from "../lib/demoVideos";

interface HomePageProps {
  onAnalyze: (videoId: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onAnalyze }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 p-4">
      {demoVideos.map((video) => (
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
  );
}; 