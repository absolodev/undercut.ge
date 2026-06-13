import { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { setLocaleFromParams } from "@/i18n/set-request-locale";

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function F1Layout({ children, params }: Props) {
  await setLocaleFromParams(params);
  return (
    <AppShell mainClassName="p-0">
      {children}
    </AppShell>
  );
}
