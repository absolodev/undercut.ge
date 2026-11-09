"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { TelemetryComparePoint } from "@/lib/telemetry/fetch-compare";

export function ThrottleBrakeTrace({
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
      <h3 className="font-display text-sm font-bold mb-4">THROTTLE & BRAKE</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} syncId="telemetry" margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
            <Line type="stepAfter" dataKey="throttleA" stroke="#E10600" strokeWidth={1.5} dot={false} name={`${nameA} throttle`} isAnimationActive={false} />
            <Line type="stepAfter" dataKey="brakeA" stroke="#E10600" strokeWidth={1.5} strokeDasharray="4 3" dot={false} name={`${nameA} brake`} isAnimationActive={false} />
            <Line type="stepAfter" dataKey="throttleB" stroke="#00A2FF" strokeWidth={1.5} dot={false} name={`${nameB} throttle`} isAnimationActive={false} />
            <Line type="stepAfter" dataKey="brakeB" stroke="#00A2FF" strokeWidth={1.5} strokeDasharray="4 3" dot={false} name={`${nameB} brake`} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
