"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { SpeedTrace } from "@/components/telemetry/speed-trace";
import { ThrottleBrakeTrace } from "@/components/telemetry/throttle-brake-trace";
import { GearTrace } from "@/components/telemetry/gear-trace";
import { GhostCarReplay } from "@/components/telemetry/ghost-car-replay";
import { CornerAnalysis } from "@/components/telemetry/corner-analysis";
import { TelemetrySelector } from "@/components/telemetry/telemetry-selector";
import { TelemetryBetaBanner } from "@/components/telemetry/beta-banner";

export default function ComparePage() {
  const t = useTranslations("Telemetry");
  const [session, setSession] = useState<number | null>(null);
  const [driverA, setDriverA] = useState<{ id: number; lap: number } | null>(null);
  const [driverB, setDriverB] = useState<{ id: number; lap: number } | null>(null);
  const [xAxis, setXAxis] = useState<"distance" | "time">("distance");

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      <TelemetryBetaBanner />

      <div className="border-b border-white/10 pb-4">
        <h1 className="font-display text-2xl sm:text-3xl font-bold">{t("title")}</h1>
        <p className="text-white/50 text-sm mt-2">{t("subtitle")}</p>
      </div>

      <TelemetrySelector
        onSessionChange={setSession}
        onDriverAChange={setDriverA}
        onDriverBChange={setDriverB}
      />

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

      {session && driverA && driverB ? (
        <div className="space-y-6">
          <SpeedTrace sessionId={session} driverA={driverA} driverB={driverB} xAxis={xAxis} />
          <ThrottleBrakeTrace sessionId={session} driverA={driverA} driverB={driverB} xAxis={xAxis} />
          <GearTrace sessionId={session} driverA={driverA} driverB={driverB} xAxis={xAxis} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GhostCarReplay sessionId={session} driverA={driverA} driverB={driverB} />
            <CornerAnalysis sessionId={session} driverA={driverA} driverB={driverB} />
          </div>
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center border border-dashed border-white/10 rounded-lg text-white/30 font-mono text-center px-4">
          {t("selectPrompt")}
        </div>
      )}
    </div>
  );
}
