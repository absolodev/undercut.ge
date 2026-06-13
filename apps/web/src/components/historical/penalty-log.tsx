"use client";

import { PENALTY_LABELS } from "@pitwall/constants";

export function PenaltyLog({ penalties }: { penalties: any[] }) {
  if (!penalties || penalties.length === 0) {
    return <div className="p-8 text-center text-white/50 font-mono text-xs">No penalties in this session</div>;
  }

  return (
    <div className="bg-[#111] border border-white/10 rounded-lg overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="bg-[#222] font-mono text-[10px] text-white/50 border-b border-white/10">
          <tr>
            <th className="p-3">LAP</th>
            <th className="p-3">DRIVER</th>
            <th className="p-3">PENALTY</th>
            <th className="p-3">REASON</th>
          </tr>
        </thead>
        <tbody>
          {penalties.map((p) => {
            const info = (PENALTY_LABELS as any)[p.penalty_type] || { label: p.penalty_type, icon: "⚠️" };
            return (
              <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 font-mono text-xs">
                <td className="p-3 text-white/50">{p.lap_number || "—"}</td>
                <td className="p-3 font-semibold text-f1-red">{p.driver.broadcast_name}</td>
                <td className="p-3">
                  <span className="flex items-center gap-1.5">
                    <span>{info.icon}</span>
                    <span className="font-bold">{info.label}</span>
                  </span>
                </td>
                <td className="p-3 text-white/70">{p.reason}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
