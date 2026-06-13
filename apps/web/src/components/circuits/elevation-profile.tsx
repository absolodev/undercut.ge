"use client";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export function ElevationProfile({ data }: { data: Array<{ distance_m: number; elevation_m: number }> }) {
  return (
    <div className="bg-bg-surface border border-border-default rounded-lg p-4">
      <h2 className="font-display text-sm font-bold mb-3">Elevation Profile</h2>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data}>
          <XAxis dataKey="distance_m" tickFormatter={(v) => `${(v / 1000).toFixed(1)}km`} stroke="#555" fontSize={10} />
          <YAxis stroke="#555" fontSize={10} unit="m" />
          <Tooltip contentStyle={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }} />
          <Area type="monotone" dataKey="elevation_m" stroke="#E10600" fill="#E10600" fillOpacity={0.15} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
