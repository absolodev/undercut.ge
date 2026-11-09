"use client";

import type { SectorTimes } from "@/lib/telemetry/fetch-compare";

function format(ms: number | null): string {
  if (ms == null) return "—";
  const seconds = ms / 1000;
  return seconds >= 60 ? `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(3).padStart(6, "0")}` : seconds.toFixed(3);
}

function delta(a: number | null, b: number | null): string | null {
  if (a == null || b == null) return null;
  const diff = (a - b) / 1000;
  return `${diff > 0 ? "+" : ""}${diff.toFixed(3)}s`;
}

export function SectorDelta({
  sectors,
  nameA,
  nameB,
}: {
  sectors: { a: SectorTimes | null; b: SectorTimes | null };
  nameA: string;
  nameB: string;
}) {
  const rows = [
    { label: "Sector 1", a: sectors.a?.s1 ?? null, b: sectors.b?.s1 ?? null },
    { label: "Sector 2", a: sectors.a?.s2 ?? null, b: sectors.b?.s2 ?? null },
    { label: "Sector 3", a: sectors.a?.s3 ?? null, b: sectors.b?.s3 ?? null },
    { label: "Lap", a: sectors.a?.lap ?? null, b: sectors.b?.lap ?? null },
  ];
  if (rows.every((row) => row.a == null && row.b == null)) return null;

  return (
    <div className="bg-[#111] border border-white/10 rounded-lg p-4 sm:p-6">
      <h3 className="font-display text-sm font-bold mb-4">SECTORS</h3>
      <table className="w-full text-left text-sm font-mono">
        <thead className="text-[10px] text-white/30 border-b border-white/10">
          <tr>
            <th className="py-2">SPLIT</th>
            <th className="py-2 text-right text-[#E10600]">{nameA}</th>
            <th className="py-2 text-right text-[#00A2FF]">{nameB}</th>
            <th className="py-2 text-right">DELTA</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const diff = delta(row.a, row.b);
            return (
              <tr key={row.label} className="border-b border-white/5">
                <td className="py-2">{row.label}</td>
                <td className="py-2 text-right">{format(row.a)}</td>
                <td className="py-2 text-right">{format(row.b)}</td>
                <td className={`py-2 text-right ${diff?.startsWith("+") ? "text-[#E10600]" : "text-[#7CFF6B]"}`}>
                  {diff ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
