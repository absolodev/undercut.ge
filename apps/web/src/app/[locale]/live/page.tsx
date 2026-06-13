"use client";

import { useWebSocketConnection } from "@/lib/ws-connector";
import { TimingTower } from "@/components/live/timing-tower";
import dynamic from "next/dynamic";
import { SessionHeader } from "@/components/live/session-header";
import { RightPanel } from "@/components/live/right-panel";
import { BottomBar } from "@/components/live/bottom-bar";
import { ProToolsOverlay } from "@/components/pro-tools/pro-tools-overlay";
import { LiveShell } from "@/components/live/live-shell";

const TrackMap = dynamic(
  () => import("@/components/live/track-map/track-map").then((mod) => mod.TrackMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-black text-white/50 text-xs font-mono">
        LOADING MAP...
      </div>
    ),
  }
);

export default function LivePage() {
  useWebSocketConnection();

  return (
    <LiveShell>
      <SessionHeader />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 border-r border-white/10 flex flex-col relative">
          <TimingTower />
          <ProToolsOverlay />
        </div>

        <section className="flex-1 flex flex-col min-w-0 bg-[#000] relative" aria-label="Track map">
          <div className="flex-1 overflow-hidden">
            <TrackMap />
          </div>
          <div className="h-10 border-t border-white/10 bg-[#111] shrink-0">
            <BottomBar />
          </div>
        </section>

        <aside className="w-[320px] border-l border-white/10 bg-[#111] flex flex-col shrink-0" aria-label="Session details">
          <RightPanel />
        </aside>
      </div>
    </LiveShell>
  );
}
