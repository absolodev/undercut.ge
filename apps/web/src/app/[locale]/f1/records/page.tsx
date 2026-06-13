import { redirect } from "@/i18n/navigation";
import { setLocaleFromParams } from "@/i18n/set-request-locale";

/** Records moved to the home page; keep route for bookmarks. */
export default async function RecordsRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await setLocaleFromParams(params);
  redirect({ href: "/", locale });
}
