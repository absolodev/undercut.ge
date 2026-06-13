import { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";

export default function F1Layout({ children }: { children: ReactNode }) {
  return (
    <AppShell mainClassName="p-0">
      {children}
    </AppShell>
  );
}
