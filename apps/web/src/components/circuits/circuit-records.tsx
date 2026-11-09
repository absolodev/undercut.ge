import { formatLapTime } from "@pitwall/utils";

export function CircuitRecords({
  fastestQualifying,
  mostWins,
  fastestRaceLap,
  latestWeather,
}: {
  fastestQualifying: any[];
  mostWins: any[];
  fastestRaceLap?: any[] | null;
  latestWeather?: { race_name: string; year: number | null; track_temp: number | null; rainfall: boolean } | null;
}) {
  const fastest = fastestQualifying?.[0];
  const raceLap = fastestRaceLap?.[0];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-bg-surface border border-border-default rounded-lg p-4">
        <h2 className="font-display text-sm font-bold mb-3">Fastest Qualifying (All-Time)</h2>
        {fastest ? (
          <div className="flex justify-between items-center bg-[#222] p-4 rounded border border-white/5">
            <div>
              <div className="font-bold">{fastest.full_name}</div>
              <div className="text-xs text-white/50">{fastest.season_year}</div>
            </div>
            <div className="font-mono text-xl text-sector-purple font-bold">
              {formatLapTime(Number(fastest.time_ms))}
            </div>
          </div>
        ) : (
          <div className="text-white/50 text-sm">No data available</div>
        )}
      </div>

      <div className="bg-bg-surface border border-border-default rounded-lg p-4">
        <h2 className="font-display text-sm font-bold mb-3">Fastest race lap</h2>
        {raceLap?.time_ms ? (
          <div className="flex justify-between items-center bg-[#222] p-4 rounded border border-white/5">
            <div>
              <div className="font-bold">{raceLap.full_name}</div>
              <div className="text-xs text-white/50">
                {raceLap.season_year}
                {raceLap.speed != null ? ` · ${Number(raceLap.speed).toFixed(3)} kph` : ""}
              </div>
            </div>
            <div className="font-mono text-xl text-sector-purple font-bold">
              {formatLapTime(Number(raceLap.time_ms))}
            </div>
          </div>
        ) : (
          <div className="text-white/50 text-sm">Not loaded</div>
        )}
      </div>

      <div className="bg-bg-surface border border-border-default rounded-lg p-4">
        <h2 className="font-display text-sm font-bold mb-3">Most Wins</h2>
        <div className="space-y-2">
          {mostWins?.map((w, i) => (
            <div key={i} className="flex justify-between items-center text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0">
              <span className="text-white/70">{i + 1}. {w.broadcast_name || w.full_name}</span>
              <span className="font-mono text-[#E10600] font-bold">{Number(w.wins)}</span>
            </div>
          ))}
          {(!mostWins || mostWins.length === 0) && (
             <div className="text-white/50 text-sm">No data available</div>
          )}
        </div>
      </div>

      {latestWeather && (
        <div className="bg-bg-surface border border-border-default rounded-lg p-4">
          <h2 className="font-display text-sm font-bold mb-3">Latest race weather</h2>
          <div className="text-sm text-white/70">
            <div className="font-semibold text-white">{latestWeather.race_name}</div>
            <div className="text-xs font-mono text-white/40 mt-1">{latestWeather.year}</div>
            <div className="mt-3 font-mono text-xs">
              {latestWeather.track_temp != null ? `Track ${latestWeather.track_temp.toFixed(1)}°` : "Track —"}
              {" · "}
              {latestWeather.rainfall ? "Rain" : "Dry"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
