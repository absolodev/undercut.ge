import { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Cookie Policy — UnderCut",
  path: "/legal/cookies",
  noIndex: true,
});

function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      <div className="text-sm text-white/70 space-y-2">{children}</div>
    </section>
  );
}

export default function CookiesPage() {
  return (
    <AppShell>
      <article className="p-8 max-w-3xl mx-auto">
        <PageHeader
          title="Cookie Policy"
          description="How UnderCut uses cookies and browser storage."
          breadcrumbs={[{ label: "Legal", href: "/legal/terms" }, { label: "Cookies" }]}
        />
        <div className="space-y-6">
          <LegalSection title="Essential storage">
            <p>
              UnderCut stores your cookie consent choice in localStorage. Season preferences may be reflected in
              the URL query string. These are required for basic functionality.
            </p>
          </LegalSection>
          <LegalSection title="Optional analytics">
            <p>
              If you accept optional cookies, we may use analytics to understand feature usage. Declining optional
              cookies limits tracking to essential storage only.
            </p>
          </LegalSection>
          <LegalSection title="Managing preferences">
            <p>
              You can clear site data in your browser settings or change your choice when prompted by the consent
              banner on a fresh visit (after clearing localStorage).
            </p>
          </LegalSection>
          <LegalSection title="More information">
            <p>
              See our <Link href="/legal/privacy" className="text-[#E10600] hover:underline">Privacy Policy</Link>{" "}
              for how we handle personal data.
            </p>
          </LegalSection>
        </div>
      </article>
    </AppShell>
  );
}
