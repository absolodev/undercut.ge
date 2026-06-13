import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "./routing";
import type { Locale } from "./config";

/** Call at the top of every `[locale]` page/layout so static RSC uses the URL locale. */
export async function setLocaleFromParams(
  params: Promise<{ locale: string }>
): Promise<Locale> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    return routing.defaultLocale;
  }
  setRequestLocale(locale);
  return locale;
}
