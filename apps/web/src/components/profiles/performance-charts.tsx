"use client";

import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, Cell } from "recharts";

export function PerformanceCharts({ seasonData, driverId }: { seasonData: any, driverId: string | number }) {
  // Recharts requires a stable array of objects.
  const chartData = useMemo(() => {
    return [...(seasonData as any[])]
      .reverse()
      .map((d) => ({
        year: d.year,
        position: d.championship_position ? Number(d.championship_position) : null,
        points: Number(d.points),
        teamColor: d.team_color || "#888",
      }))
      .filter((d) => d.position != null || d.points > 0);
  }, [seasonData]);

  if (!chartData.length) return null;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-bold mb-4">Championship Position</h2>
        <div className="bg-[#111] rounded-lg border border-white/10 p-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="year" stroke="#ffffff50" tick={{ fontSize: 12, fill: "#ffffff50" }} />
              <YAxis reversed stroke="#ffffff50" tick={{ fontSize: 12, fill: "#ffffff50" }} domain={[1, 24]} />
              <Tooltip
                contentStyle={{ backgroundColor: "#222", border: "1px solid rgba(255,255,255,0.1)" }}
                itemStyle={{ color: "#fff" }}
              />
              <Line type="monotone" dataKey="position" stroke="#E10600" strokeWidth={3} dot={{ r: 4, fill: "#E10600" }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h2 className="font-display text-2xl font-bold mb-4">Points Scored</h2>
        <div className="bg-[#111] rounded-lg border border-white/10 p-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="year" stroke="#ffffff50" tick={{ fontSize: 12, fill: "#ffffff50" }} />
              <YAxis stroke="#ffffff50" tick={{ fontSize: 12, fill: "#ffffff50" }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#222", border: "1px solid rgba(255,255,255,0.1)" }}
                itemStyle={{ color: "#fff" }}
                cursor={{ fill: "rgba(255,255,255,0.05)" }}
              />
              <Bar dataKey="points">
                {
                  chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.teamColor} />
                  ))
                }
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
