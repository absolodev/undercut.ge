import { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";

export function LiveShell({ children }: { children: ReactNode }) {
  return (
    <AppShell variant="live" showFooter={false}>
      {children}
    </AppShell>
  );
}
