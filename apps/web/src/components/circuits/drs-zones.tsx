"use client";

export function DrsZoneVisualization({ drsZones, svgPath, viewBox }: { drsZones: any, svgPath: any, viewBox: string | null }) {
  if (!svgPath || !drsZones || !drsZones.length) return null;

  return (
    <div className="bg-bg-surface border border-border-default rounded-lg p-4">
      <h2 className="font-display text-sm font-bold mb-3">DRS Zones Visualization</h2>
      <div className="max-w-xl mx-auto">
        <svg viewBox={viewBox || "0 0 1000 600"} className="w-full h-auto">
          {/* Track outline */}
          <path d={svgPath} fill="none" stroke="#333" strokeWidth="4" strokeLinecap="round" />

          {/* DRS zones */}
          {drsZones?.map((zone: any, i: number) => (
            <path key={i} d={zone.activationPathSegment} fill="none" stroke="#00ff00" strokeWidth="6" opacity="0.8" />
          ))}
        </svg>
      </div>
    </div>
  );
}
