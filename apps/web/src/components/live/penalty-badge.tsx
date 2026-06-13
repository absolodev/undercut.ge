import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { PENALTY_LABELS } from "@pitwall/constants";
import type { Penalty } from "@pitwall/types";

interface PenaltyBadgeProps {
  penalties: Penalty[];
  driverName: string;
}

export function PenaltyBadge({ penalties, driverName }: PenaltyBadgeProps) {
  const latest = penalties[penalties.length - 1];
  const info = PENALTY_LABELS[latest.type];

  return (
    <HoverCard>
      <HoverCardTrigger>
        <button className="text-[10px] text-f1-red hover:text-white transition-colors">
          {info?.icon || "⚠️"}
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-72 bg-bg-surface border-border-default" side="left">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{info?.icon}</span>
            <span className="font-bold text-f1-red text-sm">{info?.label}</span>
          </div>
          <div className="text-xs text-text-secondary">
            <p><span className="text-text-muted">Driver:</span> {driverName}</p>
            <p><span className="text-text-muted">Lap:</span> {latest.lap}</p>
            <p className="mt-1"><span className="text-text-muted">Reason:</span> {latest.reason}</p>
            {latest.regulationRef && (
              <p><span className="text-text-muted">Regulation:</span> {latest.regulationRef}</p>
            )}
          </div>
          <div className="pt-1 border-t border-border-default">
            <p className="text-[10px] text-text-muted">
              Status: {latest.isServed ? "✅ Served" : "⏳ Not Yet Served"}
            </p>
          </div>
          <div className="pt-1 border-t border-border-default">
            <p className="text-[10px] text-text-muted italic">
              📖 {info?.description}
            </p>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
