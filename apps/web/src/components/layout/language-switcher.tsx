"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { locales, type Locale } from "@/i18n/config";

const LOCALE_COOKIE = "NEXT_LOCALE";

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("Nav");

  function onChange(next: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=31536000;SameSite=Lax`;
    router.replace(pathname, { locale: next });
  }

  return (
    <label className="flex items-center gap-1.5 text-xs font-mono text-white/50 shrink-0">
      <span className="sr-only">{t("language")}</span>
      <select
        value={locale}
        onChange={(e) => onChange(e.target.value as Locale)}
        className="bg-[#1a1a1a] border border-white/10 rounded px-2 py-1.5 text-white text-xs font-mono cursor-pointer hover:border-white/20 focus:outline-none focus:border-[#E10600]/50 min-h-[36px]"
        aria-label={t("language")}
      >
        {locales.map((loc) => (
          <option key={loc} value={loc}>
            {t(`locale.${loc}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
