import { cn } from "@/lib/utils";

interface SectorTimeProps {
  value: number | null;
  isOverallBest?: boolean;
  isPersonalBest?: boolean;
  width: string;
}

export function SectorTime({ value, isOverallBest, isPersonalBest, width }: SectorTimeProps) {
  const color = isOverallBest
    ? "text-sector-purple"
    : isPersonalBest
    ? "text-sector-green"
    : "text-sector-yellow";

  return (
    <div className={cn(width, "text-right font-mono text-[10px] tabular-nums", value ? color : "text-text-muted")}>
      {value ? (value / 1000).toFixed(3) : "—"}
    </div>
  );
}
