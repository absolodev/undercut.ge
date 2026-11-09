import { Link } from "@/i18n/navigation";
import { LiveShell } from "@/components/live/live-shell";
import { getOffAirRaceStrip } from "@/lib/data/current/season";
import { resolveLiveSessionStatus } from "@/lib/live-status-server";
import { LiveClient } from "./live-client";

export const dynamic = "force-dynamic";

export default async function LivePage() {
  const status = await resolveLiveSessionStatus();
  const summary = status.mode === "live" ? null : await getOffAirRaceStrip();

  return (
    <LiveShell>
      {summary && (
        <div className="shrink-0 border-b border-white/10 bg-[#111] px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="font-mono text-[10px] uppercase text-white/40">Last race</span>
            <span className="font-semibold">{summary.race_name}</span>
            {summary.podium.length > 0 && (
              <span className="font-mono text-xs text-white/70">
                {summary.podium.map((name, index) => `${index + 1} ${name}`).join(" · ")}
              </span>
            )}
            <Link
              href={`/f1/seasons/${summary.year}/${summary.round}`}
              className="font-mono text-xs text-[#E10600] hover:underline"
            >
              RESULTS →
            </Link>
            {summary.weather && (
              <span className="font-mono text-xs text-white/50">
                Air {summary.weather.air_temp == null ? "—" : `${summary.weather.air_temp.toFixed(1)}°`}
                {" · "}
                Track {summary.weather.track_temp == null ? "—" : `${summary.weather.track_temp.toFixed(1)}°`}
                {" · "}
                {summary.weather.rainfall ? "Rain" : "Dry"}
              </span>
            )}
          </div>
        </div>
      )}
      <LiveClient />
    </LiveShell>
  );
}
