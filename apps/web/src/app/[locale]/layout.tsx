import type { Metadata, Viewport } from "next";
import { Orbitron, JetBrains_Mono, Geist, Exo_2, Noto_Sans_Georgian } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import "../globals.css";
import { CommandPalette } from "@/components/pro-tools/command-palette";
import { CookieConsent } from "@/components/layout/cookie-consent";
import { DataDisclaimer } from "@/components/layout/data-disclaimer";
import { JsonLd } from "@/components/layout/json-ld";
import { cn } from "@/lib/utils";
import { defaultMetadata, getSiteUrl } from "@/lib/seo";
import { routing } from "@/i18n/routing";
import type { Locale } from "@/i18n/config";

const orbitron = Orbitron({
  variable: "--font-display",
  subsets: ["latin"],
});

const exo2 = Exo_2({
  variable: "--font-display-es",
  subsets: ["latin"],
});

const notoGeorgian = Noto_Sans_Georgian({
  variable: "--font-display-ka",
  subsets: ["georgian", "latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

/** Matches sticky nav/header `bg-[#111]` */
const NAV_THEME_COLOR = "#111111";

export const viewport: Viewport = {
  themeColor: NAV_THEME_COLOR,
  colorScheme: "dark",
};

export const metadata: Metadata = {
  ...defaultMetadata,
  metadataBase: new URL(getSiteUrl()),
  appleWebApp: {
    statusBarStyle: "black-translucent",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "UnderCut",
  url: getSiteUrl(),
  description: "Formula 1 companion app with live timing, telemetry, and historical data.",
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "UnderCut",
  url: getSiteUrl(),
  potentialAction: {
    "@type": "SearchAction",
    target: `${getSiteUrl()}/f1/drivers?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

function localeFontClass(locale: Locale): string {
  if (locale === "ka") return notoGeorgian.variable;
  if (locale === "es") return exo2.variable;
  return orbitron.variable;
}

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale: localeParam } = await params;
  if (!hasLocale(routing.locales, localeParam)) {
    notFound();
  }

  const locale = localeParam as Locale;
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={cn(
        "h-full",
        "antialiased",
        "dark",
        orbitron.variable,
        exo2.variable,
        notoGeorgian.variable,
        jetbrainsMono.variable,
        geist.variable,
        locale === "ka" ? "font-display-ka" : locale === "es" ? "font-display-es" : "font-display-en"
      )}
    >
      <head>
        <meta name="theme-color" content={NAV_THEME_COLOR} />
      </head>
      <body
        suppressHydrationWarning
        className={cn(
          "min-h-full flex flex-col font-sans bg-bg-primary text-text-primary",
          localeFontClass(locale)
        )}
        style={
          locale === "ka"
            ? { fontFamily: "var(--font-display-ka), var(--font-sans), sans-serif" }
            : locale === "es"
              ? { fontFamily: "var(--font-display-es), var(--font-sans), sans-serif" }
              : undefined
        }
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <JsonLd data={[organizationJsonLd, websiteJsonLd]} />
          {children}
          <CommandPalette />
          <CookieConsent />
          <DataDisclaimer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
