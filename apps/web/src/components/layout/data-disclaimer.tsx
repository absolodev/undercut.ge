"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { readStoredValue, STORAGE_KEYS, writeStoredValue } from "@/lib/storage-keys";

export function DataDisclaimer() {
  const [accepted, setAccepted] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState(false);
  const t = useTranslations("Disclaimer");

  useEffect(() => {
    setMounted(true);
    const stored = readStoredValue(
      STORAGE_KEYS.dataDisclaimer,
      STORAGE_KEYS.dataDisclaimerLegacy
    );
    setAccepted(stored === "accepted");
  }, []);

  if (!mounted || accepted) return null;

  function accept() {
    writeStoredValue(STORAGE_KEYS.dataDisclaimer, "accepted");
    setAccepted(true);
  }

  return (
    <div
      role="dialog"
      aria-label={t("title")}
      className="fixed bottom-0 inset-x-0 z-[90] p-4 md:p-6 pointer-events-none"
    >
      <div className="max-w-3xl mx-auto bg-[#111] border border-[#E10600]/30 rounded-lg p-5 shadow-2xl pointer-events-auto">
        <p className="font-mono text-xs text-[#E10600] uppercase mb-1">{t("title")}</p>
        <p className="text-sm text-white/70 mb-4">{t("body")}</p>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <Link href="/legal/terms" className="text-xs font-mono text-white/40 hover:text-[#E10600]">
            {t("termsLink")}
          </Link>
          <button
            type="button"
            onClick={accept}
            className="px-4 py-2.5 text-xs font-mono bg-[#E10600] text-white rounded hover:bg-[#ff1a1a] transition-colors min-h-[44px]"
          >
            {t("accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
