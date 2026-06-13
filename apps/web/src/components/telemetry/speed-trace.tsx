"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Brush } from "recharts";
import { useTelemetryCompare } from "@/hooks/use-telemetry-compare";

interface TraceProps {
  sessionId: number;
  driverA: { id: number; lap: number };
  driverB: { id: number; lap: number };
  xAxis: "distance" | "time";
}

export function SpeedTrace({ sessionId, driverA, driverB, xAxis }: TraceProps) {
  const { data, loading, error } = useTelemetryCompare(sessionId, driverA, driverB);

  if (loading) return <div className="h-64 bg-[#111] animate-pulse rounded-lg" />;
  if (error) {
    return (
      <div className="h-64 bg-[#111] border border-white/10 rounded-lg flex items-center justify-center text-white/40 font-mono text-sm">
        {error}
      </div>
    );
  }
  if (data.length === 0) return null;

  return (
    <div className="bg-[#111] border border-white/10 rounded-lg p-6">
      <h3 className="font-display text-sm font-bold mb-4">SPEED TRACE</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} syncId="telemetry" margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey={xAxis === "distance" ? "distance_m" : "timeA"}
              stroke="#555"
              fontSize={10}
              tick={{ fill: "#ffffff50", fontFamily: "monospace" }}
              tickFormatter={(v) =>
                xAxis === "distance" ? `${(v / 1000).toFixed(1)}km` : `${(v / 1000).toFixed(1)}s`
              }
            />
            <YAxis
              stroke="#555"
              fontSize={10}
              domain={[0, 360]}
              unit=" km/h"
              tick={{ fill: "#ffffff50", fontFamily: "monospace" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#111",
                border: "1px solid #ffffff10",
                borderRadius: "8px",
                fontFamily: "monospace",
              }}
            />
            <Line
              type="monotone"
              dataKey="speedA"
              stroke="#E10600"
              strokeWidth={2}
              dot={false}
              name="Driver A"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="speedB"
              stroke="#00A2FF"
              strokeWidth={2}
              dot={false}
              name="Driver B"
              isAnimationActive={false}
            />
            <Brush
              dataKey={xAxis === "distance" ? "distance_m" : "timeA"}
              height={30}
              stroke="#555"
              fill="#222"
              tickFormatter={() => ""}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
