"use client";

import { useDnfStore } from "@pitwall/stores";

export function DnfTicker() {
  const dnfs = useDnfStore((s) => s.dnfs);
  if (dnfs.length === 0) return null;

  return (
    <div className="flex items-center gap-2 text-[10px] shrink-0">
      <span className="text-text-muted uppercase">DNF:</span>
      <div className="flex gap-3">
        {dnfs.map((d) => (
          <span key={d.driverNumber} className="text-text-secondary">
            💥 L{d.lap}: <span className="font-semibold text-white">{d.broadcastName}</span> — {d.reason}
          </span>
        ))}
      </div>
    </div>
  );
}
