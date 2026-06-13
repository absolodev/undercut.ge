import { useUIStore } from "@pitwall/stores";

const COLUMNS = [
  { key: "gap", label: "GAP" },
  { key: "interval", label: "INT" },
  { key: "lastLap", label: "LAST" },
  { key: "s1", label: "S1" },
  { key: "s2", label: "S2" },
  { key: "s3", label: "S3" },
  { key: "tire", label: "TYR" },
  { key: "age", label: "AGE" },
  { key: "pit", label: "PT" },
  { key: "penalty", label: "PEN" },
];

export function TimingTowerControls() {
  const { visibleColumns, toggleColumn } = useUIStore();

  return (
    <div className="flex items-center gap-1 px-2 py-1 border-t border-border-default shrink-0">
      <span className="text-[9px] text-text-muted mr-1">COLS:</span>
      {COLUMNS.map((col) => (
        <button
          key={col.key}
          onClick={() => toggleColumn(col.key)}
          className={`text-[9px] px-1.5 py-0.5 rounded transition-colors ${
            visibleColumns.has(col.key)
              ? "bg-bg-elevated text-text-primary"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          {col.label}
        </button>
      ))}
    </div>
  );
}
