import { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Terms of Service — UnderCut",
  path: "/legal/terms",
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

export default function TermsPage() {
  return (
    <AppShell>
      <article className="p-8 max-w-3xl mx-auto">
        <PageHeader
          title="Terms of Service"
          description="Last updated: June 2026. Placeholder terms for an unofficial F1 statistics app — not legal advice."
          breadcrumbs={[{ label: "Legal" }, { label: "Terms" }]}
        />
        <div className="space-y-6">
          <LegalSection title="Acceptance">
            <p>
              By using UnderCut, you agree to these terms. If you do not agree, please do not use the service.
            </p>
          </LegalSection>
          <LegalSection title="Service description">
            <p>
              UnderCut is an unofficial Formula 1 companion offering statistics, archives, and live timing when
              available. We are not affiliated with Formula 1, the FIA, or any teams.
            </p>
          </LegalSection>
          <LegalSection title="Disclaimer">
            <p>
              Data is provided &quot;as is&quot; without warranty. Live timing may be delayed or unavailable.
              Do not rely on UnderCut for betting, safety, or official timing decisions.
            </p>
          </LegalSection>
          <LegalSection title="Acceptable use">
            <p>
              You may not scrape, overload, or attempt to disrupt the service. Automated access must respect
              rate limits and robots.txt.
            </p>
          </LegalSection>
          <LegalSection title="Changes">
            <p>
              We may update these terms. Continued use after changes constitutes acceptance of the revised terms.
            </p>
          </LegalSection>
        </div>
      </article>
    </AppShell>
  );
}
