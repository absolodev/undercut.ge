"use client";

import { useEffect, useRef } from "react";
import { TrackMapScene } from "@/lib/pixi/scene-manager";
import { useUIStore, useSessionStore } from "@pitwall/stores";
import { subscribeToMap, unsubscribeFromMap } from "@pitwall/socket-client";
import { DriverFocusModal } from "./driver-focus-modal";
import { TrackMapEmpty } from "./track-map-empty";
import { getCircuitData } from "@/lib/track-maps";
import type { CircuitMapData } from "@/lib/track-maps/types";

export function TrackMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<TrackMapScene | null>(null);
  const isFullscreen = useUIStore((s) => s.isFullscreen);
  const selectedDriver = useUIStore((s) => s.selectedDriver);
  const toggleFullscreen = useUIStore((s) => s.toggleFullscreen);
  const circuitName = useSessionStore((s) => s.circuitName);
  const sessionType = useSessionStore((s) => s.sessionType);

  const circuit: CircuitMapData | undefined = circuitName
    ? getCircuitData(circuitName)
    : undefined;
  const showEmpty = !sessionType || !circuitName || !circuit;

  useEffect(() => {
    subscribeToMap();
    return () => unsubscribeFromMap();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !circuitName || !circuit) return;

    let cancelled = false;
    const scene = new TrackMapScene();
    sceneRef.current = scene;

    scene.init(canvas, circuit).catch((error) => {
      if (!cancelled) console.error(error);
    });

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        scene.resize(width, height);
      }
    });

    const parent = canvas.parentElement;
    if (parent) observer.observe(parent);

    return () => {
      cancelled = true;
      observer.disconnect();
      scene.destroy();
      sceneRef.current = null;
    };
  }, [circuitName, circuit]);

  if (showEmpty) {
    const reason = !sessionType
      ? "no-session"
      : !circuitName
        ? "no-circuit"
        : "unsupported-circuit";
    return (
      <div className={`relative h-full ${isFullscreen ? "fixed inset-0 z-50 bg-black" : ""}`}>
        <TrackMapEmpty circuitName={circuitName} reason={reason} />
      </div>
    );
  }

  return (
    <div className={`relative h-full ${isFullscreen ? "fixed inset-0 z-50 bg-black" : ""}`}>
      <canvas ref={canvasRef} className="w-full h-full" />

      <button
        onClick={toggleFullscreen}
        className="absolute top-2 right-2 bg-bg-elevated/80 text-text-secondary hover:text-white px-2 py-1 rounded text-xs backdrop-blur-sm"
      >
        {isFullscreen ? "EXIT ✕" : "⛶ FULLSCREEN"}
      </button>

      {selectedDriver && <DriverFocusModal driverNumber={selectedDriver} />}
    </div>
  );
}
