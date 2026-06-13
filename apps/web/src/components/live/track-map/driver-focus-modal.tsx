"use client";

import { useStandingsStore, useTelemetryStore, useUIStore } from "@pitwall/stores";
import { subscribeToTelemetry, unsubscribeFromTelemetry } from "@pitwall/socket-client";
import { useEffect } from "react";
import { TIRE_COLORS } from "@pitwall/constants";

interface DriverFocusModalProps {
  driverNumber: number;
}

export function DriverFocusModal({ driverNumber }: DriverFocusModalProps) {
  const standings = useStandingsStore((s) => s.standings);
  const telemetry = useTelemetryStore((s) => s.telemetry);
  const setSelectedDriver = useUIStore((s) => s.setSelectedDriver);

  const driver = standings.find((s) => s.driverNumber === driverNumber);

  useEffect(() => {
    subscribeToTelemetry(driverNumber);
    return () => unsubscribeFromTelemetry();
  }, [driverNumber]);

  if (!driver) return null;

  const tireColor = driver.compound ? TIRE_COLORS[driver.compound] : "#888888";

  return (
    <div className="absolute bottom-4 left-4 w-64 bg-bg-surface/95 backdrop-blur-md border border-border-default rounded-lg p-3 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 rounded" style={{ backgroundColor: driver.teamColor }} />
          <span className="font-display text-sm font-bold">#{driverNumber} {driver.broadcastName}</span>
        </div>
        <button
          onClick={() => setSelectedDriver(null)}
          className="text-text-muted hover:text-white text-xs"
        >
          ✕
        </button>
      </div>

      {/* Telemetry data */}
      <div className="space-y-1.5 font-mono text-xs">
        <TelemetryBar label="SPEED" value={telemetry?.speed ?? 0} max={370} unit="km/h" color="#00ff00" />
        <TelemetryBar label="THROTTLE" value={telemetry?.throttle ?? 0} max={100} unit="%" color="#00ff00" />
        <TelemetryBar label="BRAKE" value={telemetry?.brake ? 100 : 0} max={100} unit="%" color="#ff0000" />

        <div className="flex justify-between">
          <span className="text-text-muted">GEAR</span>
          <span className="font-bold">{telemetry?.gear ?? "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">RPM</span>
          <span>{telemetry?.rpm?.toLocaleString() ?? "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">DRS</span>
          <span className={telemetry?.drs === 2 ? "text-flag-green font-bold" : "text-text-muted"}>
            {telemetry?.drs === 2 ? "🟢 ACTIVE" : telemetry?.drs === 1 ? "AVAILABLE" : "OFF"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">GAP</span>
          <span>{driver.position === 1 ? "LEADER" : driver.gapToLeader}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">TIRE</span>
          <span style={{ color: tireColor }}>
            {driver.compound || "UNKNOWN"} ({driver.tyreAge || 0}L)
          </span>
        </div>
      </div>
    </div>
  );
}

function TelemetryBar({ label, value, max, unit, color }: {
  label: string; value: number; max: number; unit: string; color: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-text-muted w-16">{label}</span>
      <div className="flex-1 h-2 bg-bg-elevated rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-75" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="w-14 text-right">{Math.round(value)} {unit}</span>
    </div>
  );
}
