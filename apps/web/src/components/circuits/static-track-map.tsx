"use client";

export function StaticTrackMap({
  svgPath,
  corners,
  drsZones,
  viewBox,
}: {
  svgPath: string | null;
  corners: unknown;
  drsZones: unknown;
  viewBox?: { x: number; y: number; width: number; height: number } | string | null;
}) {
  if (!svgPath) {
    return (
      <div className="text-white/30 text-center py-20 font-mono text-sm border border-dashed border-white/10 rounded">
        Map data not available
      </div>
    );
  }

  const vb =
    typeof viewBox === "string"
      ? viewBox
      : viewBox
        ? `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`
        : "0 0 1000 600";

  const [, , vbWidth = 1000, vbHeight = 600] = vb.split(/\s+/).map(Number);

  return (
    <div
      className="w-full min-h-[420px] md:min-h-[520px] lg:min-h-[600px] bg-[#0a0a0a] rounded border border-white/5 relative overflow-hidden"
      style={{ aspectRatio: `${vbWidth} / ${vbHeight}` }}
    >
      <svg
        viewBox={vb}
        preserveAspectRatio="xMidYMid meet"
        width="100%"
        height="100%"
        className="block w-full h-full"
      >
        <path
          d={svgPath}
          fill="none"
          stroke="#cccccc"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {(drsZones as Array<{ activationPathSegment?: string }>)?.map(
          (zone, i) =>
            zone.activationPathSegment && (
              <path
                key={i}
                d={zone.activationPathSegment}
                fill="none"
                stroke="#00FF00"
                strokeWidth="4"
                strokeDasharray="8 4"
                opacity="0.7"
              />
            )
        )}

        {(corners as Array<{ number: number | string; position?: { x: number; y: number } }>)?.map(
          (c) => (
            <g key={c.number} transform={`translate(${c.position?.x ?? 0}, ${c.position?.y ?? 0})`}>
              <circle cx="0" cy="0" r="8" fill="#111" stroke="#E10600" strokeWidth="1.5" />
              <text
                x="0"
                y="3"
                textAnchor="middle"
                fill="#fff"
                fontSize="7"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {c.number}
              </text>
            </g>
          )
        )}
      </svg>

      <div className="absolute bottom-4 right-4 flex gap-4 text-[10px] font-mono text-white/50 bg-black/80 px-3 py-2 rounded">
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-[#ccc] rounded-full" />
          <span>TRACK</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-[#00FF00] rounded-full" />
          <span>DRS ZONE</span>
        </div>
      </div>
    </div>
  );
}
