import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

/** Records moved to the home page; keep route for bookmarks. */
export default async function RecordsRedirectPage() {
  const locale = await getLocale();
  redirect({ href: "/", locale });
}
