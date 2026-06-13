import { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Privacy Policy — UnderCut",
  path: "/legal/privacy",
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

export default function PrivacyPage() {
  return (
    <AppShell>
      <article className="p-8 max-w-3xl mx-auto prose-invert">
        <PageHeader
          title="Privacy Policy"
          description="Last updated: June 2026. This is placeholder text for an F1 statistics application — not legal advice."
          breadcrumbs={[{ label: "Legal", href: "/legal/terms" }, { label: "Privacy" }]}
        />
        <div className="space-y-6">
          <LegalSection title="Overview">
            <p>
              UnderCut provides Formula 1 statistics, historical results, and optional live timing features.
              We collect minimal personal data necessary to operate the service.
            </p>
          </LegalSection>
          <LegalSection title="Data we process">
            <p>
              When you use UnderCut, we may process technical logs (IP address, browser type), preferences
              stored in your browser (season selection, cookie consent), and usage data if you accept optional
              analytics cookies.
            </p>
          </LegalSection>
          <LegalSection title="Third parties">
            <p>
              Live timing data may be sourced from public F1 data providers. We do not sell your personal
              information. Third-party services are subject to their own privacy policies.
            </p>
          </LegalSection>
          <LegalSection title="Your rights">
            <p>
              Depending on your jurisdiction, you may have rights to access, correct, or delete personal data.
              Contact the site operator for requests related to your data.
            </p>
          </LegalSection>
          <LegalSection title="Contact">
            <p>
              For privacy questions, contact the UnderCut project maintainers through the repository or support
              channel listed on the project homepage.
            </p>
          </LegalSection>
        </div>
      </article>
    </AppShell>
  );
}
