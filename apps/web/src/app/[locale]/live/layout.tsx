import { ReactNode } from "react";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Live Console — UnderCut",
  description: "Real-time F1 timing, track map, and session data.",
  path: "/live",
});

export default function LiveLayout({ children }: { children: ReactNode }) {
  return children;
}
