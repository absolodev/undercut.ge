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
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[#E10600] font-mono text-xs font-bold mb-1">RACE WEEKEND</p>
          <h1 className="font-display text-3xl md:text-4xl font-bold">{race.race_name}</h1>
          <p className="text-white/50 font-mono text-sm mt-1">
            Round {race.round} · {race.circuit.name}
            {race.circuit.country ? `, ${race.circuit.country}` : ""}
          </p>
        </div>
        {status.countdownSeconds !== null && (
          <div className="bg-[#111] border border-white/10 rounded-lg px-5 py-3 text-center">
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
          <h2 className="font-mono text-xs text-white/40 uppercase tracking-wider mb-4">Weekend Schedule</h2>
          <div className="space-y-2">
            {race.sessions.map((session) => {
              const isPast = new Date(session.date_start) < new Date();
              return (
                <div
                  key={session.session_type}
                  className={`flex items-center justify-between py-2 px-3 rounded text-sm font-mono ${
                    isPast ? "text-white/30" : "text-white bg-white/5"
                  }`}
                >
                  <span>{session.session_name ?? session.session_type}</span>
                  <span>
                    {new Date(session.date_start).toLocaleString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
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
