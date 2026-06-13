"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useTelemetryCompare } from "@/hooks/use-telemetry-compare";

interface TraceProps {
  sessionId: number;
  driverA: { id: number; lap: number };
  driverB: { id: number; lap: number };
  xAxis: "distance" | "time";
}

export function ThrottleBrakeTrace({ sessionId, driverA, driverB, xAxis }: TraceProps) {
  const { data, loading } = useTelemetryCompare(sessionId, driverA, driverB);

  if (loading || data.length === 0) return null;

  const chartData = data.map((row) => ({
    ...row,
    brakeAVal: row.brakeA ? 100 : 0,
    brakeBVal: row.brakeB ? 100 : 0,
  }));

  return (
    <div className="bg-[#111] border border-white/10 rounded-lg p-6">
      <h3 className="font-display text-sm font-bold mb-4">THROTTLE & BRAKE</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} syncId="telemetry" margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey={xAxis === "distance" ? "distance_m" : "timeA"} hide />
            <YAxis stroke="#555" fontSize={10} domain={[0, 100]} tick={{ fill: "#ffffff50", fontFamily: "monospace" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#111",
                border: "1px solid #ffffff10",
                borderRadius: "8px",
                fontFamily: "monospace",
              }}
            />
            <Line type="stepAfter" dataKey="throttleA" stroke="#E10600" strokeWidth={1.5} dot={false} name="Throttle A" isAnimationActive={false} />
            <Line type="stepAfter" dataKey="throttleB" stroke="#00A2FF" strokeWidth={1.5} dot={false} name="Throttle B" isAnimationActive={false} />
            <Line type="stepAfter" dataKey="brakeAVal" stroke="#ff6666" strokeWidth={1} dot={false} name="Brake A" isAnimationActive={false} />
            <Line type="stepAfter" dataKey="brakeBVal" stroke="#6699ff" strokeWidth={1} dot={false} name="Brake B" isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
