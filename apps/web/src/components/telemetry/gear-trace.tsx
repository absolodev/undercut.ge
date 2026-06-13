"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useTelemetryCompare } from "@/hooks/use-telemetry-compare";

interface TraceProps {
  sessionId: number;
  driverA: { id: number; lap: number };
  driverB: { id: number; lap: number };
  xAxis: "distance" | "time";
}

export function GearTrace({ sessionId, driverA, driverB, xAxis }: TraceProps) {
  const { data, loading } = useTelemetryCompare(sessionId, driverA, driverB);

  if (loading || data.length === 0) return null;

  return (
    <div className="bg-[#111] border border-white/10 rounded-lg p-6">
      <h3 className="font-display text-sm font-bold mb-4">GEAR</h3>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} syncId="telemetry" margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey={xAxis === "distance" ? "distance_m" : "timeA"} hide />
            <YAxis stroke="#555" fontSize={10} domain={[0, 9]} tick={{ fill: "#ffffff50", fontFamily: "monospace" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#111",
                border: "1px solid #ffffff10",
                borderRadius: "8px",
                fontFamily: "monospace",
              }}
            />
            <Line type="stepAfter" dataKey="gearA" stroke="#E10600" strokeWidth={2} dot={false} name="Gear A" isAnimationActive={false} />
            <Line type="stepAfter" dataKey="gearB" stroke="#00A2FF" strokeWidth={2} dot={false} name="Gear B" isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
