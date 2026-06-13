import { Link } from "@/i18n/navigation";
import { DriverAvatar } from "@/components/ui/driver-avatar";
import type { ConstructorDriverRow, ConstructorTopDrivers } from "@/lib/data/constructors-profile";

type Labels = {
  title: string;
  empty: string;
  seasons: string;
  wins: string;
  podiums: string;
  poles: string;
  points: string;
  championships: string;
  teamLeader: string;
  mostWins: string;
  mostPoles: string;
  mostPoints: string;
};

function formatSeasons(seasons: number[]): string {
  if (!seasons.length) return "—";
  if (seasons.length === 1) return String(seasons[0]);
  return `${seasons[0]}–${seasons[seasons.length - 1]}`;
}

export function ConstructorDriversList({
  drivers,
  topDrivers,
  teamColor,
  labels,
  leaderNames,
}: {
  drivers: ConstructorDriverRow[];
  topDrivers: ConstructorTopDrivers;
  teamColor?: string | null;
  labels: Labels;
  leaderNames: { wins: string; poles: string; points: string };
}) {
  if (!drivers.length) {
    return (
      <div>
        <h2 className="font-display text-2xl font-bold mb-4">{labels.title}</h2>
        <p className="text-sm text-white/40 font-mono py-8 text-center bg-[#111] border border-dashed border-white/20 rounded-lg">
          {labels.empty}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-display text-2xl font-bold mb-4">{labels.title}</h2>

      {(topDrivers.wins_leader || topDrivers.poles_leader || topDrivers.points_leader) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {topDrivers.wins_leader && (
            <LeaderBadge
              label={labels.mostWins}
              name={topDrivers.wins_leader}
              accent={teamColor}
            />
          )}
          {topDrivers.poles_leader && (
            <LeaderBadge
              label={labels.mostPoles}
              name={topDrivers.poles_leader}
              accent={teamColor}
            />
          )}
          {topDrivers.points_leader && (
            <LeaderBadge
              label={labels.mostPoints}
              name={topDrivers.points_leader}
              accent={teamColor}
            />
          )}
        </div>
      )}

      <div className="bg-[#111] rounded-lg border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[640px]">
            <thead className="bg-[#222] font-mono text-[10px] text-white/50 border-b border-white/10">
              <tr>
                <th className="p-3">DRIVER</th>
                <th className="p-3">{labels.seasons}</th>
                <th className="p-3 text-right">{labels.wins}</th>
                <th className="p-3 text-right">{labels.podiums}</th>
                <th className="p-3 text-right">{labels.poles}</th>
                <th className="p-3 text-right">{labels.points}</th>
                <th className="p-3 text-right">{labels.championships}</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver) => {
                const isLeader =
                  driver.full_name === leaderNames.wins ||
                  driver.full_name === leaderNames.poles ||
                  driver.full_name === leaderNames.points;

                return (
                  <tr
                    key={driver.driver_id}
                    className={`border-b border-white/5 hover:bg-white/5 ${isLeader ? "bg-white/[0.03]" : ""}`}
                  >
                    <td className="p-3">
                      <Link
                        href={`/f1/drivers/${driver.driver_ref}`}
                        className="flex items-center gap-3 group"
                      >
                        <DriverAvatar
                          driverRef={driver.driver_ref}
                          name={driver.full_name}
                          headshotUrl={driver.headshot_url}
                          size={36}
                        />
                        <span className="font-semibold group-hover:text-[#E10600] transition-colors">
                          {driver.full_name}
                          {isLeader && (
                            <span className="ml-2 text-[9px] font-mono text-[#E10600] uppercase">
                              {labels.teamLeader}
                            </span>
                          )}
                        </span>
                      </Link>
                    </td>
                    <td className="p-3 font-mono text-white/60 text-xs">
                      {formatSeasons(driver.seasons)}
                    </td>
                    <td className="p-3 font-mono text-right">{driver.wins}</td>
                    <td className="p-3 font-mono text-right">{driver.podiums}</td>
                    <td className="p-3 font-mono text-right">{driver.poles}</td>
                    <td className="p-3 font-mono font-bold text-[#E10600] text-right">
                      {driver.points}
                    </td>
                    <td className="p-3 font-mono text-right">{driver.championships}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function LeaderBadge({
  label,
  name,
  accent,
}: {
  label: string;
  name: string;
  accent?: string | null;
}) {
  return (
    <div
      className="bg-[#111] border border-white/10 rounded-lg p-3"
      style={accent ? { borderLeftColor: accent, borderLeftWidth: 3 } : undefined}
    >
      <div className="text-[10px] font-mono text-white/50 uppercase">{label}</div>
      <div className="font-display font-bold text-white mt-1">{name}</div>
    </div>
  );
}
