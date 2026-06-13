import { ReactNode, Suspense } from "react";
import { SiteNav } from "./site-nav";
import { SiteFooter } from "./site-footer";

interface AppShellProps {
  children: ReactNode;
  variant?: "default" | "live";
  showFooter?: boolean;
  mainClassName?: string;
}

export function AppShell({
  children,
  variant = "default",
  showFooter = true,
  mainClassName = "",
}: AppShellProps) {
  const isLive = variant === "live";

  return (
    <div className={`flex flex-col bg-[#000] text-white ${isLive ? "h-screen overflow-hidden" : "min-h-screen"}`}>
      <Suspense fallback={<header className="h-14 border-b border-white/10 bg-[#111]" />}>
        <SiteNav variant={isLive ? "compact" : "default"} />
      </Suspense>
      <main className={`flex-1 ${isLive ? "flex flex-col overflow-hidden" : "overflow-y-auto"} ${mainClassName}`}>
        {children}
      </main>
      {showFooter && !isLive && <SiteFooter />}
    </div>
  );
}
