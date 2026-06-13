"use client";

import { useTranslations } from "next-intl";

export function TelemetryBetaBanner() {
  const t = useTranslations("Telemetry");

  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-lg border border-[#00A2FF]/40 bg-[#00A2FF]/10 px-4 py-3 text-sm"
    >
      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#00A2FF] shrink-0 mt-0.5">
        {t("betaLabel")}
      </span>
      <p className="text-white/70">{t("betaBody")}</p>
    </div>
  );
}
