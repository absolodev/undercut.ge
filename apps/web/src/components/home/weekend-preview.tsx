import { Link } from "@/i18n/navigation";
import type { LiveStanding } from "@pitwall/types";
import type { WeatherData } from "@pitwall/types";
import type { LiveSessionStatus } from "@/lib/live-status-types";
import { LiveStandingsPreview } from "./live-standings-preview";
import { WeatherPreviewCard } from "./weather-preview-card";

interface WeekendPreviewProps {
  status: LiveSessionStatus;
  liveStandings?: LiveStanding[] | null;
  liveLap?: { current: number; total: number } | null;
  weather?: (WeatherData & { source?: string }) | null;
  race: {
    id?: number;
    race_name: string;
    round: number;
    race_date: Date;
    circuit: {
      name: string;
      location: string | null;
      country: string | null;
      circuit_ref: string;
      length_meters: number | null;
      turns: number | null;
    };
    sessions: Array<{
      session_type: string;
      session_name: string | null;
      date_start: Date;
    }>;
  };
}

function formatCountdown(seconds: number | null): string {
  if (seconds === null) return "—";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function WeekendPreview({ status, race, liveStandings, liveLap, weather }: WeekendPreviewProps) {
  // Ensure we always have the 5 standard F1 weekend sessions if not populated
  let sessions = race.sessions;
  if (!sessions || sessions.length === 0) {
    const raceSunday = new Date(race.race_date);
    const fri = new Date(raceSunday);
    fri.setUTCDate(fri.getUTCDate() - 2);
    const sat = new Date(raceSunday);
    sat.setUTCDate(sat.getUTCDate() - 1);

    const fp1Date = new Date(fri);
    fp1Date.setUTCHours(11, 30, 0, 0);
    const fp2Date = new Date(fri);
    fp2Date.setUTCHours(15, 0, 0, 0);
    const fp3Date = new Date(sat);
    fp3Date.setUTCHours(10, 30, 0, 0);
    const qualiDate = new Date(sat);
    qualiDate.setUTCHours(14, 0, 0, 0);
    const raceDate = new Date(raceSunday);
    raceDate.setUTCHours(13, 0, 0, 0);

    sessions = [
      { session_type: "FP1", session_name: "Practice 1", date_start: fp1Date },
      { session_type: "FP2", session_name: "Practice 2", date_start: fp2Date },
      { session_type: "FP3", session_name: "Practice 3", date_start: fp3Date },
      { session_type: "Q", session_name: "Qualifying", date_start: qualiDate },
      { session_type: "R", session_name: "Grand Prix", date_start: raceDate },
    ];
  }

  // Sort sessions chronologically
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime()
  );

  const nowTime = Date.now();
  const nextSessionIndex = sortedSessions.findIndex(
    (s) => new Date(s.date_start).getTime() > nowTime
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[#E10600] font-mono text-xs font-bold">RACE WEEKEND</span>
            <span className="text-[10px] font-mono bg-white/10 text-white/70 px-2 py-0.5 rounded">
              ROUND {race.round}
            </span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">{race.race_name}</h1>
          <p className="text-white/50 font-mono text-sm mt-1">
            {race.circuit.name}
            {race.circuit.country ? `, ${race.circuit.country}` : ""}
          </p>
        </div>
        {status.countdownSeconds !== null && (
          <div className="bg-[#111] border border-white/10 rounded-lg px-5 py-3 text-center min-w-[200px]">
            <p className="text-[10px] font-mono text-white/40 uppercase">Next session</p>
            <p className="font-display text-2xl font-bold text-[#E10600]">
              {formatCountdown(status.countdownSeconds)}
            </p>
            {status.sessionName && (
              <p className="text-xs font-mono text-white/50 mt-1">{status.sessionName}</p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#111] border border-white/10 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-xs text-white/40 uppercase tracking-wider">
              Weekend Schedule
            </h2>
            <span className="text-[11px] font-mono text-white/30">Local time</span>
          </div>
          <div className="space-y-2.5">
            {sortedSessions.map((session, idx) => {
              const sessionTime = new Date(session.date_start).getTime();
              const isPast = sessionTime < nowTime;
              const isNext = idx === nextSessionIndex;

              return (
                <div
                  key={`${session.session_type}-${idx}`}
                  className={`flex items-center justify-between py-3 px-4 rounded text-sm font-mono transition-colors ${
                    isNext
                      ? "bg-[#E10600]/10 border border-[#E10600]/40 text-white"
                      : isPast
                        ? "text-white/30 bg-white/[0.02]"
                        : "text-white/90 bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        isNext
                          ? "bg-[#E10600] text-white"
                          : isPast
                            ? "bg-white/5 text-white/30"
                            : "bg-white/10 text-white/70"
                      }`}
                    >
                      {session.session_type}
                    </span>
                    <span className="font-sans font-medium text-sm">
                      {session.session_name ?? session.session_type}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs">
                      {new Date(session.date_start).toLocaleString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          {liveStandings && liveStandings.length > 0 && (
            <LiveStandingsPreview standings={liveStandings} lap={liveLap} />
          )}

          <div className="bg-[#111] border border-white/10 rounded-lg p-5">
            <h2 className="font-mono text-xs text-white/40 uppercase tracking-wider mb-3">Circuit</h2>
            <p className="font-display font-bold text-lg">{race.circuit.name}</p>
            {race.circuit.location && (
              <p className="text-sm text-white/50 mt-1">{race.circuit.location}</p>
            )}
            <div className="flex gap-4 mt-3 text-xs font-mono text-white/40">
              {race.circuit.length_meters && (
                <span>{(race.circuit.length_meters / 1000).toFixed(3)} km</span>
              )}
              {race.circuit.turns && <span>{race.circuit.turns} turns</span>}
            </div>
            <Link
              href={`/f1/circuits/${race.circuit.circuit_ref}`}
              className="inline-block mt-4 text-xs font-mono text-[#E10600] hover:underline"
            >
              VIEW CIRCUIT →
            </Link>
          </div>

          <WeatherPreviewCard initialWeather={weather} />
        </div>
      </div>
    </div>
  );
}
