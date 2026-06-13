"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { readStoredValue, STORAGE_KEYS, writeStoredValue } from "@/lib/storage-keys";

type Consent = "accepted" | "declined";

export function CookieConsent() {
  const [consent, setConsent] = useState<Consent | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = readStoredValue(
      STORAGE_KEYS.cookieConsent,
      STORAGE_KEYS.cookieConsentLegacy
    ) as Consent | null;
    if (stored === "accepted" || stored === "declined") {
      setConsent(stored);
    }
  }, []);

  if (!mounted || consent !== null) return null;

  function save(value: Consent) {
    writeStoredValue(STORAGE_KEYS.cookieConsent, value);
    setConsent(value);
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 inset-x-0 z-[100] p-4 md:p-6"
    >
      <div className="max-w-3xl mx-auto bg-[#111] border border-white/10 rounded-lg p-5 shadow-2xl flex flex-col md:flex-row gap-4 md:items-center">
        <div className="flex-1 text-sm text-white/70">
          <p className="font-mono text-xs text-white/40 uppercase mb-1">Cookies</p>
          <p>
            We use essential cookies and local storage for preferences (e.g. season selection, live
            settings). Analytics are optional. See our{" "}
            <Link href="/legal/cookies" className="text-[#E10600] hover:underline">
              Cookie Policy
            </Link>
            .
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => save("declined")}
            className="px-4 py-2 text-xs font-mono border border-white/20 rounded hover:bg-white/5 transition-colors"
          >
            Decline optional
          </button>
          <button
            type="button"
            onClick={() => save("accepted")}
            className="px-4 py-2 text-xs font-mono bg-[#E10600] text-white rounded hover:bg-[#ff1a1a] transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
