"use client";

import { useRaceControlStore } from "@pitwall/stores";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const CATEGORY_STYLES: Record<string, { bg: string; icon: string }> = {
  Flag: { bg: "bg-flag-yellow/10", icon: "🟡" },
  "Flag:GREEN": { bg: "bg-flag-green/10", icon: "🟢" },
  "Flag:RED": { bg: "bg-flag-red/15", icon: "🔴" },
  "Flag:BLUE": { bg: "bg-flag-blue/10", icon: "🔵" },
  SafetyCar: { bg: "bg-flag-sc/10", icon: "🚨" },
  Penalty: { bg: "bg-flag-red/12", icon: "⚖️" },
  Investigation: { bg: "bg-sector-yellow/8", icon: "🔍" },
  TrackLimits: { bg: "bg-text-muted/8", icon: "⚫" },
  Drs: { bg: "bg-flag-green/8", icon: "📡" },
  Other: { bg: "bg-bg-surface", icon: "📋" },
};

export function RaceControlFeed() {
  const messages = useRaceControlStore((s) => s.messages);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<string>("all");

  // Auto-scroll to top (newest messages first)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [messages.length]);

  const filtered = filter === "all"
    ? messages
    : messages.filter((m) => m.category === filter);

  return (
    <div className="flex flex-col h-full">
      {/* Header with filter */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border-default shrink-0">
        <span className="font-mono text-[10px] text-text-muted uppercase tracking-wider">Race Control</span>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-bg-elevated text-[10px] border border-border-default rounded px-1 py-0.5"
        >
          <option value="all">All</option>
          <option value="Flag">Flags</option>
          <option value="Penalty">Penalties</option>
          <option value="Investigation">Investigations</option>
          <option value="SafetyCar">Safety Car</option>
          <option value="TrackLimits">Track Limits</option>
        </select>
      </div>

      {/* Message list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {filtered.map((msg) => {
          const styleKey = msg.flag ? `Flag:${msg.flag}` : msg.category;
          const style = CATEGORY_STYLES[styleKey] || CATEGORY_STYLES[msg.category] || CATEGORY_STYLES.Other;

          return (
            <div
              key={msg.id}
              className={cn("px-2 py-2 border-b border-border-default text-xs", style.bg)}
            >
              <div className="flex items-center gap-1 text-text-muted mb-0.5">
                <span className="font-mono">LAP {msg.lap}</span>
                <span>•</span>
                <span className="font-mono">{new Date(msg.timestamp).toLocaleTimeString()}</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span>{style.icon}</span>
                <span className="text-text-primary leading-tight">{msg.message}</span>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center text-text-muted text-xs py-8">No messages yet</div>
        )}
      </div>
    </div>
  );
}
