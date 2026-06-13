"use client";

import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export function LapChart({ laps }: { laps: any[] }) {
  // Transform data: we want an array of objects where each object is a lap.
  // { lap: 1, "driver_1": 1, "driver_2": 2, ... }
  
  const chartData = useMemo(() => {
    if (!laps || laps.length === 0) return [];
    
    const lapMap = new Map<number, any>();
    const maxLap = Math.max(...laps.map(l => l.lap_number));

    for (let i = 1; i <= maxLap; i++) {
      lapMap.set(i, { lap: i });
    }

    laps.forEach(l => {
      const lapObj = lapMap.get(l.lap_number);
      const driverName = l.driver?.broadcast_name ?? `Driver ${l.driver_id}`;
      if (lapObj && l.position != null) {
        lapObj[driverName] = l.position;
      }
    });

    return Array.from(lapMap.values());
  }, [laps]);

  const drivers = useMemo(() => {
    if (!laps || laps.length === 0) return [];
    const unique = new Set(laps.map(l => l.driver?.broadcast_name ?? `Driver ${l.driver_id}`));
    return Array.from(unique);
  }, [laps]);

  // Generates a random color for now, ideally would map to team colors
  const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + "00000".substring(0, 6 - c.length) + c;
  };

  if (!laps || laps.length === 0) {
    return <div className="p-8 text-center text-white/50 font-mono border border-dashed border-white/10 rounded-lg bg-[#111]">No lap data available.</div>;
  }

  return (
    <div className="bg-[#111] border border-white/10 rounded-lg p-6 h-[600px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
          <XAxis 
            dataKey="lap" 
            stroke="#ffffff50" 
            tick={{ fill: "#ffffff50", fontSize: 12, fontFamily: "monospace" }} 
            label={{ value: "LAP", position: "bottom", fill: "#ffffff50", fontSize: 10, fontFamily: "monospace" }} 
          />
          <YAxis 
            reversed 
            domain={[1, Math.max(20, ...laps.map(l => l.position ?? 1))]} 
            stroke="#ffffff50" 
            tick={{ fill: "#ffffff50", fontSize: 12, fontFamily: "monospace" }} 
            label={{ value: "POS", angle: -90, position: "insideLeft", fill: "#ffffff50", fontSize: 10, fontFamily: "monospace" }} 
          />
          <Tooltip 
            contentStyle={{ backgroundColor: "#111", border: "1px solid #ffffff10", borderRadius: "8px", fontFamily: "monospace" }}
            itemStyle={{ fontSize: 12 }}
            labelStyle={{ color: "#ffffff50", marginBottom: "8px" }}
          />
          
          {drivers.map(driver => (
            <Line 
              key={driver}
              type="monotone"
              dataKey={driver}
              stroke={stringToColor(driver)}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
