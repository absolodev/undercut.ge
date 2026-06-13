"use client";

import { useState } from "react";

export function GhostCarReplay({ sessionId, driverA, driverB }: any) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);

  return (
    <div className="bg-[#111] border border-white/10 rounded-lg p-6 flex flex-col h-[400px]">
      <h3 className="font-display text-sm font-bold mb-4">GHOST CAR REPLAY</h3>
      
      {/* Map visualization area */}
      <div className="flex-1 bg-[#0a0a0a] border border-white/5 rounded-lg relative flex items-center justify-center overflow-hidden">
        {/* Placeholder SVG map */}
        <svg viewBox="0 0 1000 600" className="w-full h-full max-h-[250px] opacity-30">
          <path d="M100 300 C 100 100, 300 100, 500 300 C 700 500, 900 300, 900 300" fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round" />
        </svg>

        {/* Dummy cars driven by progress */}
        <div className="absolute w-4 h-4 rounded-full bg-[#E10600] border-2 border-white shadow-lg" style={{ left: `${20 + progress * 0.6}%`, top: `${40 + Math.sin(progress/10) * 10}%` }} />
        <div className="absolute w-4 h-4 rounded-full bg-[#00A2FF] border-2 border-white shadow-lg" style={{ left: `${18 + progress * 0.6}%`, top: `${45 + Math.sin(progress/10) * 10}%` }} />
      </div>

      {/* Playback controls */}
      <div className="flex items-center gap-4 mt-4 font-mono">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="px-4 py-1.5 text-xs font-bold bg-white text-black hover:bg-white/80 rounded transition-colors w-24"
        >
          {isPlaying ? "PAUSE" : "PLAY"}
        </button>
        
        <div className="flex gap-1 bg-[#222] p-1 rounded">
          {[0.5, 1, 2, 5].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-2 py-1 text-[10px] rounded transition-colors ${speed === s ? "bg-[#333] text-white" : "text-white/30 hover:text-white"}`}
            >
              {s}x
            </button>
          ))}
        </div>
        
        <div className="flex-1 flex items-center gap-3">
          <span className="text-[10px] text-white/50 w-8 text-right">{progress}%</span>
          <input
            type="range"
            min={0}
            max={100}
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="flex-1 accent-[#E10600] h-1 bg-[#333] rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
