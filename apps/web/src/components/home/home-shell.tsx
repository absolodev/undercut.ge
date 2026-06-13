import { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { LiveBanner } from "./live-banner";

export function HomeShell({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <LiveBanner autoRedirect />
      <div className="p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto">{children}</div>
      </div>
    </AppShell>
  );
}
