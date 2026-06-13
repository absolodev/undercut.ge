"use client";

import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { CURRENT_SEASON } from "@/lib/config";
import { getSeasonYears, parseSeasonYear } from "@/lib/season";

const SEASONS = getSeasonYears();

export function SeasonSelector() {
  const t = useTranslations("Nav");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = parseSeasonYear(searchParams.get("season"));

  const onChange = useCallback(
    (year: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (year === CURRENT_SEASON) {
        params.delete("season");
      } else {
        params.set("season", String(year));
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams]
  );

  return (
    <label className="flex items-center gap-2 text-xs font-mono text-white/50 shrink-0">
      <span className="hidden sm:inline">{t("seasonSelector")}</span>
      <select
        value={selected}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="bg-[#1a1a1a] border border-white/10 rounded px-2 py-1 text-white text-xs font-mono cursor-pointer hover:border-white/20 focus:outline-none focus:border-[#E10600]/50"
        aria-label={t("selectSeason")}
      >
        {SEASONS.map((year) => (
          <option key={year} value={year}>
            {year}
            {year === CURRENT_SEASON ? ` ${t("currentSeasonMark")}` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
