import type { ConstructorCareerStats } from "@/lib/data/constructors-profile";

type Labels = {
  title: string;
  races: string;
  wins: string;
  podiums: string;
  poles: string;
  points: string;
  constructorChampionships: string;
  driverChampionships: string;
  bestFinish: string;
};

export function ConstructorCareerStatsGrid({
  stats,
  labels,
}: {
  stats: ConstructorCareerStats;
  labels: Labels;
}) {
  return (
    <div>
      <h2 className="font-display text-2xl font-bold mb-4">{labels.title}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label={labels.wins} value={stats.wins} />
        <StatCard label={labels.podiums} value={stats.podiums} />
        <StatCard label={labels.poles} value={stats.poles} />
        <StatCard label={labels.points} value={stats.total_points} />
        <StatCard label={labels.races} value={stats.races} />
        <StatCard label={labels.constructorChampionships} value={stats.constructor_championships} />
        <StatCard label={labels.driverChampionships} value={stats.driver_championships} />
        <StatCard
          label={labels.bestFinish}
          value={stats.best_finish != null ? `P${stats.best_finish}` : "—"}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-[#111] border border-white/10 rounded-lg p-4 flex flex-col items-center justify-center text-center">
      <div className="text-[10px] font-mono text-white/50 mb-1">{label}</div>
      <div className="text-3xl font-display font-bold text-white">{value}</div>
    </div>
  );
}
