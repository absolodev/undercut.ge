"use client";

import { useTeamRadioStore, useStandingsStore } from "@pitwall/stores";
import { useState, useRef } from "react";
import { Howl } from "howler";
import { cn } from "@/lib/utils";

export function TeamRadioFeed() {
  const messages = useTeamRadioStore((s) => s.messages);
  const standings = useStandingsStore((s) => s.standings);
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const howlRef = useRef<Howl | null>(null);

  const teams = [...new Set(standings.map((s) => s.broadcastName.slice(0, 3)))];

  const filtered = teamFilter === "all"
    ? messages
    : messages.filter((m) => m.broadcastName === teamFilter);

  function playAudio(url: string, messageId: string) {
    // Stop any current playback
    if (howlRef.current) {
      howlRef.current.stop();
    }

    howlRef.current = new Howl({
      src: [url],
      format: ["mp3"],
      onplay: () => setPlayingId(messageId),
      onend: () => setPlayingId(null),
      onloaderror: () => setPlayingId(null),
      onplayerror: () => setPlayingId(null),
    });
    howlRef.current.play();
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border-default shrink-0">
        <span className="font-mono text-[10px] text-text-muted uppercase tracking-wider">Team Radio</span>
        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="bg-bg-elevated text-[10px] border border-border-default rounded px-1 py-0.5"
        >
          <option value="all">All Teams</option>
          {teams.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Radio messages */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((msg) => (
          <div key={msg.id} className="px-2 py-2 border-b border-border-default">
            <div className="flex items-center gap-1 text-[10px] text-text-muted mb-1">
              <span className="font-mono">LAP {msg.lap}</span>
              <span>•</span>
              <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
            </div>
            <div className="flex items-start gap-2">
              {/* Driver avatar circle */}
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0"
                style={{ backgroundColor: msg.teamColor + "33", borderColor: msg.teamColor, borderWidth: 1 }}
              >
                🎧
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold" style={{ color: msg.teamColor }}>{msg.broadcastName}</span>
                {msg.recordingUrl && (
                  <button
                    onClick={() => playAudio(msg.recordingUrl!, msg.id)}
                    className={cn(
                      "ml-2 px-2 py-0.5 rounded text-[10px] transition-colors",
                      playingId === msg.id
                        ? "bg-f1-red text-white"
                        : "bg-bg-elevated text-text-secondary hover:text-white"
                    )}
                  >
                    {playingId === msg.id ? "⏸ Playing..." : "▶ Play"}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
