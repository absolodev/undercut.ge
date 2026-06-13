"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { formatLapTime } from "@pitwall/utils";

export function LapTimeEvolution({ data }: { data: Array<{ year: number; pole_time_ms: number }> }) {
  if (!data || data.length === 0) return null;

  const regulationChanges = [
    { year: 2009, label: "Aero Regs" },
    { year: 2014, label: "Turbo Hybrid" },
    { year: 2017, label: "Wider Cars" },
    { year: 2022, label: "Ground Effect" },
  ];

  const chartData = data.map(d => ({
    year: d.year,
    pole_time_ms: Number(d.pole_time_ms)
  }));

  return (
    <div className="bg-bg-surface border border-border-default rounded-lg p-4">
      <h2 className="font-display text-sm font-bold mb-3">Pole Position Time Evolution</h2>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <XAxis dataKey="year" stroke="#555" fontSize={10} />
            <YAxis tickFormatter={(v) => formatLapTime(v)} stroke="#555" fontSize={10} domain={['auto', 'auto']} />
            {regulationChanges.map((rc) => (
              <ReferenceLine key={rc.year} x={rc.year} stroke="#E10600" strokeDasharray="3 3" label={{ value: rc.label, fill: "#888", fontSize: 8, position: 'top' }} />
            ))}
            <Tooltip formatter={(v: any) => formatLapTime(Number(v))} contentStyle={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }} />
            <Line type="monotone" dataKey="pole_time_ms" stroke="#FFD700" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
