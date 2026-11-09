"use client";

import { useEffect, useMemo, useState } from "react";
import { getCircuitData } from "@/lib/track-maps";
import type { TelemetryComparePoint } from "@/lib/telemetry/fetch-compare";

type Point = { x: number; y: number };

function parsePath(svgPath: string): Point[] {
  const re = /[ML]\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/g;
  const points: Point[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(svgPath))) {
    points.push({ x: Number(match[1]), y: Number(match[2]) });
  }
  if (points.length > 2) {
    const start = points[0];
    const end = points[points.length - 1];
    if (Math.hypot(start.x - end.x, start.y - end.y) < 1.5) points.pop();
  }
  return points;
}

function pointAt(points: Point[], fraction: number): Point {
  if (points.length < 2) return points[0] ?? { x: 0, y: 0 };
  const lengths = [0];
  for (let i = 1; i < points.length; i++) {
    lengths.push(lengths[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  }
  const close = Math.hypot(points[0].x - points[points.length - 1].x, points[0].y - points[points.length - 1].y);
  const total = lengths[lengths.length - 1] + close;
  const target = ((fraction % 1) + 1) % 1 * total;
  let index = 0;
  while (index < lengths.length - 1 && lengths[index + 1] < target) index++;
  if (index >= points.length - 1) {
    const span = close || 1;
    const t = (target - lengths[lengths.length - 1]) / span;
    const a = points[points.length - 1];
    const b = points[0];
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }
  const span = lengths[index + 1] - lengths[index] || 1;
  const t = (target - lengths[index]) / span;
  const a = points[index];
  const b = points[index + 1];
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function LapMapReplay({
  circuitRef,
  data,
  nameA,
  nameB,
}: {
  circuitRef: string;
  data: TelemetryComparePoint[];
  nameA: string;
  nameB: string;
}) {
  const circuit = getCircuitData(circuitRef);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setProgress((value) => (value >= 100 ? 0 : value + 0.4));
    }, 30);
    return () => window.clearInterval(timer);
  }, [playing]);

  const geometry = useMemo(() => (circuit ? parsePath(circuit.svgPath) : []), [circuit]);
  if (!circuit || data.length < 2) return null;

  const maxDistance = Math.max(...data.map((row) => row.distance_m), 1);
  const maxTime = Math.max(...data.map((row) => Math.max(row.timeA, row.timeB)), 1);
  const time = (progress / 100) * maxTime;
  const closest = (key: "timeA" | "timeB") =>
    data.reduce((best, row) => (Math.abs(row[key] - time) < Math.abs(best[key] - time) ? row : best));
  const sampleA = closest("timeA");
  const sampleB = closest("timeB");
  const marker = (distance: number) => pointAt(geometry, distance / maxDistance);
  const carA = marker(sampleA.distance_m);
  const carB = marker(sampleB.distance_m);
  const viewBox = `${circuit.viewBox.x} ${circuit.viewBox.y} ${circuit.viewBox.width} ${circuit.viewBox.height}`;
  const track = Math.max(10, Math.min(circuit.viewBox.width, circuit.viewBox.height) * 0.03);
  const dot = track * 0.55;

  return (
    <div className="bg-[#111] border border-white/10 rounded-lg p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-sm font-bold">LAP POSITION</h3>
        <button
          onClick={() => setPlaying((value) => !value)}
          className="px-3 py-1 text-[10px] font-mono font-bold bg-white text-black rounded"
        >
          {playing ? "PAUSE" : "PLAY"}
        </button>
      </div>
      <svg viewBox={viewBox} className="w-full h-72 bg-[#070707] rounded">
        <path d={circuit.svgPath} fill="none" stroke="#000" strokeWidth={track * 1.35} strokeLinecap="round" strokeLinejoin="round" />
        <path d={circuit.svgPath} fill="none" stroke="#8a8a8a" strokeWidth={track} strokeLinecap="round" strokeLinejoin="round" />
        <path d={circuit.svgPath} fill="none" stroke="#1c1c1c" strokeWidth={track * 0.72} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={carA.x} cy={carA.y} r={dot} fill="#E10600" stroke="#fff" strokeWidth={dot * 0.2} />
        <circle cx={carB.x} cy={carB.y} r={dot} fill="#00A2FF" stroke="#fff" strokeWidth={dot * 0.2} />
      </svg>
      <div className="mt-3 flex items-center gap-3 font-mono text-[10px] text-white/50">
        <span className="text-[#E10600]">{nameA} {sampleA.speedA} km/h</span>
        <span className="text-[#00A2FF]">{nameB} {sampleB.speedB} km/h</span>
        <input
          type="range"
          min={0}
          max={100}
          value={progress}
          onChange={(event) => setProgress(Number(event.target.value))}
          className="flex-1 accent-[#E10600]"
        />
      </div>
    </div>
  );
}
