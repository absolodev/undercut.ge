"use client";

import { useState } from "react";
import { useStandingsStore } from "@pitwall/stores";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

export function PaceDeltaChart() {
  const standings = useStandingsStore((s) => s.standings);
  const [driverA, setDriverA] = useState(standings[0]?.driverNumber);
  const [driverB, setDriverB] = useState(standings[1]?.driverNumber);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <DriverSelector label="Driver A" value={driverA} onChange={setDriverA} standings={standings} />
        <span className="text-text-muted text-xs">vs</span>
        <DriverSelector label="Driver B" value={driverB} onChange={setDriverB} standings={standings} />
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={[]}>
            <XAxis dataKey="lap" stroke="#555" fontSize={10} />
            <YAxis stroke="#555" fontSize={10} tickFormatter={(v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}s`} />
            <ReferenceLine y={0} stroke="#555" strokeDasharray="3 3" />
            <Tooltip contentStyle={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }} />
            <Line type="monotone" dataKey="delta" stroke="#E10600" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function DriverSelector({ label, value, onChange, standings }: any) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-text-muted">{label}:</span>
      <select value={value} onChange={(e) => onChange(Number(e.target.value))} className="bg-bg-elevated text-xs border border-border-default rounded px-1.5 py-0.5">
        {standings.map((s: any) => (
          <option key={s.driverNumber} value={s.driverNumber}>{s.broadcastName}</option>
        ))}
      </select>
    </div>
  );
}
