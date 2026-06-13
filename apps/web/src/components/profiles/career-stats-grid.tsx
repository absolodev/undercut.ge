export function CareerStatsGrid({ stats, poles, fastestLaps }: { stats: any, poles: any, fastestLaps: number }) {
  const s = (stats as any[])[0] || {};
  const p = (poles as any[])[0] || { poles: 0 };

  return (
    <div>
      <h2 className="font-display text-2xl font-bold mb-4">Career Stats</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="WINS" value={Number(s.wins) || 0} />
        <StatCard label="PODIUMS" value={Number(s.podiums) || 0} />
        <StatCard label="POLES" value={Number(p.poles) || 0} />
        <StatCard label="FASTEST LAPS" value={fastestLaps || 0} />
        <StatCard label="RACE STARTS" value={Number(s.races) || 0} />
        <StatCard label="CAREER POINTS" value={Number(s.total_points) || 0} />
        <StatCard label="AVG FINISH" value={Number(s.avg_finish)?.toFixed(1) || "-"} />
        <StatCard label="AVG GRID" value={Number(s.avg_grid)?.toFixed(1) || "-"} />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string, value: string | number }) {
  return (
    <div className="bg-[#111] border border-white/10 rounded-lg p-4 flex flex-col items-center justify-center text-center">
      <div className="text-[10px] font-mono text-white/50 mb-1">{label}</div>
      <div className="text-3xl font-display font-bold text-white">{value}</div>
    </div>
  );
}
