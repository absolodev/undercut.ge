import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { detectLocaleFromHeaders, defaultLocale, isLocale } from "@/i18n/config";

/** Fallback when middleware is unavailable (e.g. webpack dev). Production uses middleware.ts. */
export default async function RootPage() {
  const headerStore = await headers();
  const cookieLocale = headerStore.get("cookie")?.match(/NEXT_LOCALE=([^;]+)/)?.[1];
  if (cookieLocale && isLocale(cookieLocale)) {
    redirect(`/${cookieLocale}`);
  }
  const locale = detectLocaleFromHeaders(
    headerStore.get("cf-ipcountry"),
    headerStore.get("x-vercel-ip-country"),
    headerStore.get("accept-language"),
    undefined
  );
  redirect(`/${locale ?? defaultLocale}`);
}
