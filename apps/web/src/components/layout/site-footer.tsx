"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CURRENT_SEASON } from "@/lib/config";

export function SiteFooter() {
  const t = useTranslations("Footer");
  const nav = useTranslations("Nav");

  return (
    <footer className="border-t border-white/10 bg-[#111] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row gap-6 md:items-start md:justify-between">
        <div className="max-w-2xl">
          <p className="font-display font-bold text-[#E10600]">UNDERCUT</p>
          <p className="text-xs font-mono text-white/40 mt-1">{t("tagline")}</p>
          <p className="text-sm text-white/45 leading-relaxed mt-4">{t("description", { year: CURRENT_SEASON })}</p>
        </div>
        <nav className="flex flex-wrap gap-4 text-xs font-mono text-white/50" aria-label="Footer">
          <Link href="/legal/privacy" className="hover:text-white transition-colors min-h-[44px] flex items-center">
            {t("privacy")}
          </Link>
          <Link href="/legal/terms" className="hover:text-white transition-colors min-h-[44px] flex items-center">
            {t("terms")}
          </Link>
          <Link href="/legal/cookies" className="hover:text-white transition-colors min-h-[44px] flex items-center">
            {t("cookies")}
          </Link>
          <Link href="/f1/seasons" className="hover:text-white transition-colors min-h-[44px] flex items-center">
            {nav("seasons")}
          </Link>
          <Link href="/live" className="hover:text-white transition-colors min-h-[44px] flex items-center">
            {nav("liveConsole")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
