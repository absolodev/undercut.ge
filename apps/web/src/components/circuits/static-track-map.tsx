"use client";

type Point = { x: number; y: number };

type Zone = {
  activationPathSegment?: string;
  detectionPathSegment?: string;
  label?: string;
};

type Corner = {
  number: number | string;
  position?: Point;
};

export function StaticTrackMap({
  svgPath,
  corners,
  drsZones,
  viewBox,
  startFinishLine,
  variant = "full",
}: {
  svgPath: string | null;
  corners: unknown;
  drsZones: unknown;
  viewBox?: { x: number; y: number; width: number; height: number } | string | null;
  startFinishLine?: { x1: number; y1: number; x2: number; y2: number } | null;
  variant?: "full" | "card";
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
  const minDim = Math.min(vbWidth, vbHeight);
  const track = Math.max(14, minDim * 0.034);
  const label = Math.max(11, minDim * 0.028);
  const zones = (Array.isArray(drsZones) ? drsZones : []) as Zone[];
  const cornerList = (Array.isArray(corners) ? corners : []) as Corner[];
  const hasFinish =
    startFinishLine &&
    (startFinishLine.x1 !== 0 || startFinishLine.y1 !== 0 || startFinishLine.x2 !== 0 || startFinishLine.y2 !== 0);

  return (
    <div
      className={
        variant === "card"
          ? "w-full h-56 bg-[#070707] relative overflow-hidden"
          : "w-full bg-[#070707] rounded-lg border border-white/10 relative overflow-hidden"
      }
      style={variant === "card" ? undefined : { aspectRatio: `${vbWidth} / ${vbHeight}` }}
    >
      <svg
        viewBox={vb}
        preserveAspectRatio="xMidYMid meet"
        width="100%"
        height="100%"
        className="block w-full h-full"
        role="img"
        aria-label="Circuit map with straight-mode zones"
      >
        <path d={svgPath} fill="none" stroke="#050505" strokeWidth={track * 1.45} strokeLinecap="round" strokeLinejoin="round" />
        <path d={svgPath} fill="none" stroke="#8a8a8a" strokeWidth={track * 1.02} strokeLinecap="round" strokeLinejoin="round" />
        <path d={svgPath} fill="none" stroke="#1c1c1c" strokeWidth={track * 0.72} strokeLinecap="round" strokeLinejoin="round" />

        {zones.map(
          (zone, i) =>
            zone.activationPathSegment && (
              <path
                key={`zone-${i}`}
                d={zone.activationPathSegment}
                fill="none"
                stroke="#d6ff4a"
                strokeWidth={track * 0.34}
                strokeLinecap="butt"
                strokeLinejoin="round"
              />
            )
        )}

        {zones.map(
          (zone, i) =>
            zone.detectionPathSegment && (
              <path
                key={`det-${i}`}
                d={zone.detectionPathSegment}
                fill="none"
                stroke="#E10600"
                strokeWidth={Math.max(2.5, track * 0.12)}
                strokeLinecap="round"
              />
            )
        )}

        {hasFinish && startFinishLine && (
          <line
            x1={startFinishLine.x1}
            y1={startFinishLine.y1}
            x2={startFinishLine.x2}
            y2={startFinishLine.y2}
            stroke="#ffffff"
            strokeWidth={Math.max(2.5, track * 0.14)}
            strokeLinecap="butt"
          />
        )}

        {cornerList.map((corner) =>
          corner.position ? (
            <g key={corner.number} transform={`translate(${corner.position.x}, ${corner.position.y})`}>
              <circle r={label * 0.72} fill="#111111" stroke="#ffffff" strokeWidth={Math.max(1, label * 0.08)} />
              <text
                y={label * 0.32}
                textAnchor="middle"
                fill="#ffffff"
                fontSize={label * 0.72}
                fontFamily="ui-monospace, monospace"
                fontWeight="700"
              >
                {corner.number}
              </text>
            </g>
          ) : null
        )}
      </svg>

      {variant === "full" && (
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-3 text-[10px] font-mono text-white/70 bg-black/75 px-3 py-2 rounded">
          <Legend swatch="bg-[#8a8a8a]" label="Track" />
          <Legend swatch="bg-[#d6ff4a]" label="Straight mode" />
          <Legend swatch="bg-[#E10600]" label="Overtake detection" />
          <Legend swatch="bg-white" label="Start" />
        </div>
      )}
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-4 h-1 rounded-full ${swatch}`} />
      <span>{label}</span>
    </div>
  );
}
