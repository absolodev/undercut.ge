"use client";

export function WeatherTimeline({ snapshots }: { snapshots: any[] }) {
  if (!snapshots || snapshots.length === 0) {
    return <div className="p-8 text-center text-white/50 font-mono text-xs">No weather data available</div>;
  }

  return (
    <div className="bg-[#111] border border-white/10 rounded-lg p-6">
      <h3 className="font-display text-sm font-bold mb-4">WEATHER TIMELINE</h3>
      <div className="flex gap-1 overflow-x-auto pb-4">
        {snapshots.map((s, i) => (
          <div key={i} className="flex flex-col items-center gap-2 p-3 bg-[#222] rounded border border-white/5 min-w-[80px]">
            <span className="text-[10px] text-white/50 font-mono">{new Date(s.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <span className="text-xl">{s.rainfall ? "🌧️" : "🌤️"}</span>
            <div className="text-xs font-mono font-bold text-sector-yellow">{s.air_temperature}°C</div>
            <div className="text-[10px] font-mono text-white/50">{s.track_temperature}°C TRK</div>
          </div>
        ))}
      </div>
    </div>
  );
}
