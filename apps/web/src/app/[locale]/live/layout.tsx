import { ReactNode } from "react";
import { buildPageMetadata } from "@/lib/seo";
import { setLocaleFromParams } from "@/i18n/set-request-locale";

export const metadata = buildPageMetadata({
  title: "Live Console — UnderCut",
  description: "Real-time F1 timing, track map, and session data.",
  path: "/live",
});

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LiveLayout({ children, params }: Props) {
  await setLocaleFromParams(params);
  return children;
}
