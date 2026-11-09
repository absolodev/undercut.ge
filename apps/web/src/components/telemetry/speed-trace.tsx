"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import type { TelemetryComparePoint } from "@/lib/telemetry/fetch-compare";

const tooltipStyle = {
  backgroundColor: "#111",
  border: "1px solid #ffffff10",
  borderRadius: "8px",
  fontFamily: "monospace",
};

export function SpeedTrace({
  data,
  loading,
  error,
  xAxis,
  nameA,
  nameB,
}: {
  data: TelemetryComparePoint[];
  loading: boolean;
  error: string | null;
  xAxis: "distance" | "time";
  nameA: string;
  nameB: string;
}) {
  if (loading) return <div className="h-64 bg-[#111] animate-pulse rounded-lg" />;
  if (error) {
    return (
      <div className="h-64 bg-[#111] border border-white/10 rounded-lg flex items-center justify-center text-white/40 font-mono text-sm">
        {error}
      </div>
    );
  }
  if (data.length === 0) return null;

  const peak = Math.max(...data.map((row) => Math.max(row.speedA, row.speedB)), 100);

  return (
    <div className="bg-[#111] border border-white/10 rounded-lg p-4 sm:p-6">
      <h3 className="font-display text-sm font-bold mb-4">SPEED</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} syncId="telemetry" margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <XAxis
              dataKey={xAxis === "distance" ? "distance_m" : "timeA"}
              stroke="#555"
              fontSize={10}
              tick={{ fill: "#ffffff50", fontFamily: "monospace" }}
              tickFormatter={(value) => (xAxis === "distance" ? `${(value / 1000).toFixed(1)}km` : `${Number(value).toFixed(0)}s`)}
            />
            <YAxis
              stroke="#555"
              fontSize={10}
              domain={[0, Math.ceil(peak / 10) * 10]}
              unit=" km/h"
              tick={{ fill: "#ffffff50", fontFamily: "monospace" }}
            />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="speedA" stroke="#E10600" strokeWidth={2} dot={false} name={nameA} isAnimationActive={false} />
            <Line type="monotone" dataKey="speedB" stroke="#00A2FF" strokeWidth={2} dot={false} name={nameB} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function DeltaTrace({
  data,
  xAxis,
  nameA,
  nameB,
}: {
  data: TelemetryComparePoint[];
  xAxis: "distance" | "time";
  nameA: string;
  nameB: string;
}) {
  if (data.length === 0) return null;
  return (
    <div className="bg-[#111] border border-white/10 rounded-lg p-4 sm:p-6">
      <h3 className="font-display text-sm font-bold mb-1">TIME DELTA</h3>
      <p className="text-[10px] font-mono text-white/40 mb-4">
        {nameA} minus {nameB}. Above zero means {nameA} is behind at that point.
      </p>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} syncId="telemetry" margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <XAxis
              dataKey={xAxis === "distance" ? "distance_m" : "timeA"}
              stroke="#555"
              fontSize={10}
              tick={{ fill: "#ffffff50", fontFamily: "monospace" }}
              tickFormatter={(value) => (xAxis === "distance" ? `${(value / 1000).toFixed(1)}km` : `${Number(value).toFixed(0)}s`)}
            />
            <YAxis stroke="#555" fontSize={10} unit="s" tick={{ fill: "#ffffff50", fontFamily: "monospace" }} />
            <ReferenceLine y={0} stroke="#ffffff40" />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="delta" stroke="#d6ff4a" strokeWidth={2} dot={false} name="Delta" isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
