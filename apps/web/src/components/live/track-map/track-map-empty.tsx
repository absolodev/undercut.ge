interface TrackMapEmptyProps {
  circuitName: string | null;
  reason?: "no-circuit" | "no-session" | "unsupported-circuit";
}

const MESSAGES: Record<NonNullable<TrackMapEmptyProps["reason"]>, { title: string; detail: string }> = {
  "no-session": {
    title: "No live session",
    detail: "The track map activates when a session is in progress. Check back on race weekend or visit the home dashboard.",
  },
  "no-circuit": {
    title: "Waiting for circuit",
    detail: "Circuit information will appear once the live feed identifies the current venue.",
  },
  "unsupported-circuit": {
    title: "Map data loading",
    detail: "High-detail maps are available for supported circuits. We load outline data from the database when available.",
  },
};

export function TrackMapEmpty({ circuitName, reason = "no-session" }: TrackMapEmptyProps) {
  const msg = MESSAGES[reason];

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-black text-center px-6">
      <div className="text-4xl mb-4 opacity-30" aria-hidden>
        🏎️
      </div>
      <p className="text-white/70 text-sm font-mono font-bold">{msg.title}</p>
      <p className="text-white/40 text-xs font-mono max-w-sm mt-2">{msg.detail}</p>
      {circuitName && (
        <p className="text-white/30 text-xs font-mono mt-2 uppercase">{circuitName}</p>
      )}
    </div>
  );
}
