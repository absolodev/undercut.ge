"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { SpeedTrace, DeltaTrace } from "@/components/telemetry/speed-trace";
import { ThrottleBrakeTrace } from "@/components/telemetry/throttle-brake-trace";
import { GearTrace } from "@/components/telemetry/gear-trace";
import { LapMapReplay } from "@/components/telemetry/lap-map-replay";
import { SectorDelta } from "@/components/telemetry/sector-delta";
import { TelemetrySelector, type TelemetrySelection } from "@/components/telemetry/telemetry-selector";
import { TelemetryBetaBanner } from "@/components/telemetry/beta-banner";
import { useTelemetryCompare } from "@/hooks/use-telemetry-compare";

export default function ComparePage() {
  const t = useTranslations("Telemetry");
  const [selection, setSelection] = useState<TelemetrySelection | null>(null);
  const [xAxis, setXAxis] = useState<"distance" | "time">("distance");
  const { data, sectors, loading, error } = useTelemetryCompare(
    selection?.sessionId ?? null,
    selection?.driverA ?? null,
    selection?.driverB ?? null
  );

  const nameA = selection?.driverA.name ?? "A";
  const nameB = selection?.driverB.name ?? "B";
  const last = data[data.length - 1];
  const top = (key: "speedA" | "speedB") => (data.length ? Math.max(...data.map((row) => row[key])) : 0);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      <TelemetryBetaBanner />

      <div className="border-b border-white/10 pb-4">
        <h1 className="font-display text-2xl sm:text-3xl font-bold">{t("title")}</h1>
        <p className="text-white/50 text-sm mt-2">{t("subtitle")}</p>
      </div>

      <TelemetrySelector onSelection={setSelection} />

      <div className="flex gap-2">
        <button
          onClick={() => setXAxis("distance")}
          className={`px-4 py-2.5 text-xs font-mono font-bold rounded min-h-[44px] ${xAxis === "distance" ? "bg-[#E10600] text-white" : "bg-[#111] text-white/50 border border-white/10 hover:bg-[#222]"}`}
        >
          {t("distance")}
        </button>
        <button
          onClick={() => setXAxis("time")}
          className={`px-4 py-2.5 text-xs font-mono font-bold rounded min-h-[44px] ${xAxis === "time" ? "bg-[#E10600] text-white" : "bg-[#111] text-white/50 border border-white/10 hover:bg-[#222]"}`}
        >
          {t("time")}
        </button>
      </div>

      {selection && data.length > 0 && last && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label={`${nameA} top speed`} value={`${top("speedA")} km/h`} />
          <Stat label={`${nameB} top speed`} value={`${top("speedB")} km/h`} />
          <Stat label={`${nameA} lap`} value={`${last.timeA.toFixed(3)}s`} />
          <Stat label={`${nameA} vs ${nameB}`} value={`${last.delta > 0 ? "+" : ""}${last.delta.toFixed(3)}s`} />
        </div>
      )}

      {selection ? (
        <div className="space-y-6">
          {selection.circuitRef && (
            <LapMapReplay circuitRef={selection.circuitRef} data={data} nameA={nameA} nameB={nameB} />
          )}
          <SpeedTrace data={data} loading={loading} error={error} xAxis={xAxis} nameA={nameA} nameB={nameB} />
          <DeltaTrace data={data} xAxis={xAxis} nameA={nameA} nameB={nameB} />
          <ThrottleBrakeTrace data={data} xAxis={xAxis} nameA={nameA} nameB={nameB} />
          <GearTrace data={data} xAxis={xAxis} nameA={nameA} nameB={nameB} />
          <SectorDelta sectors={sectors} nameA={nameA} nameB={nameB} />
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center border border-dashed border-white/10 rounded-lg text-white/30 font-mono text-center px-4">
          {t("selectPrompt")}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#111] border border-white/10 rounded-lg p-3">
      <div className="text-[10px] font-mono text-white/40 uppercase">{label}</div>
      <div className="font-display text-lg font-bold mt-1">{value}</div>
    </div>
  );
}
