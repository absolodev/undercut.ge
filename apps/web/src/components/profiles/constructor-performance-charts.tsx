"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";
import type { ConstructorSeasonRow } from "@/lib/data/constructors-profile";

type Labels = {
  championshipPosition: string;
  pointsScored: string;
  winsPerSeason: string;
  noChartData: string;
};

export function ConstructorPerformanceCharts({
  seasonData,
  teamColor,
  labels,
}: {
  seasonData: ConstructorSeasonRow[];
  teamColor?: string | null;
  labels: Labels;
}) {
  const accent = teamColor ?? "#E10600";

  const chartData = useMemo(() => {
    return [...seasonData]
      .reverse()
      .map((d) => ({
        year: d.year,
        position: d.position,
        points: d.points,
        wins: d.wins,
      }))
      .filter((d) => d.position != null || d.points > 0 || d.wins > 0);
  }, [seasonData]);

  if (!chartData.length) {
    return (
      <p className="text-sm text-white/40 font-mono py-8 text-center bg-[#111] border border-dashed border-white/20 rounded-lg">
        {labels.noChartData}
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-bold mb-4">{labels.championshipPosition}</h2>
        <div className="bg-[#111] rounded-lg border border-white/10 p-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="year" stroke="#ffffff50" tick={{ fontSize: 12, fill: "#ffffff50" }} />
              <YAxis
                reversed
                stroke="#ffffff50"
                tick={{ fontSize: 12, fill: "#ffffff50" }}
                domain={[1, 12]}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "#222", border: "1px solid rgba(255,255,255,0.1)" }}
                itemStyle={{ color: "#fff" }}
              />
              <Line
                type="monotone"
                dataKey="position"
                stroke={accent}
                strokeWidth={3}
                dot={{ r: 4, fill: accent }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h2 className="font-display text-2xl font-bold mb-4">{labels.pointsScored}</h2>
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
              <Bar dataKey="points" fill={accent} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h2 className="font-display text-2xl font-bold mb-4">{labels.winsPerSeason}</h2>
        <div className="bg-[#111] rounded-lg border border-white/10 p-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="year" stroke="#ffffff50" tick={{ fontSize: 12, fill: "#ffffff50" }} />
              <YAxis stroke="#ffffff50" tick={{ fontSize: 12, fill: "#ffffff50" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#222", border: "1px solid rgba(255,255,255,0.1)" }}
                itemStyle={{ color: "#fff" }}
                cursor={{ fill: "rgba(255,255,255,0.05)" }}
              />
              <Bar dataKey="wins" fill={accent} opacity={0.85} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
