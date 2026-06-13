import { Link } from "@/i18n/navigation";
import type { LiveStanding } from "@pitwall/types";

export function LiveStandingsPreview({
  standings,
  lap,
}: {
  standings: LiveStanding[];
  lap?: { current: number; total: number } | null;
}) {
  const top = standings.slice(0, 8);

  return (
    <div className="bg-[#111] border border-[#E10600]/30 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-mono text-xs text-[#E10600] uppercase tracking-wider">Live Timing</h2>
        {lap && (
          <span className="text-xs font-mono text-white/50">
            Lap {lap.current}/{lap.total}
          </span>
        )}
      </div>
      <div className="space-y-1">
        {top.map((row) => (
          <div key={row.driverNumber} className="flex items-center gap-3 py-1 text-sm font-mono">
            <span className="text-white/30 w-5 text-right">{row.position}</span>
            <span className="w-1 h-4 rounded-full shrink-0" style={{ backgroundColor: row.teamColor }} />
            <span className="w-10 text-white/70">{row.broadcastName}</span>
            <span className="flex-1 truncate text-white/40 text-xs">{row.teamName}</span>
            <span className="text-white/60 text-xs">{row.gapToLeader || row.interval}</span>
          </div>
        ))}
      </div>
      <Link href="/live" className="inline-block mt-4 text-xs font-mono text-[#E10600] hover:underline">
        OPEN LIVE CONSOLE →
      </Link>
    </div>
  );
}
