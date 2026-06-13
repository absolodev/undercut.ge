"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { SeasonSelector } from "./season-selector";
import { LanguageSwitcher } from "./language-switcher";
import { useTranslations } from "next-intl";

const NAV_ITEMS = [
  { href: "/f1/seasons", labelKey: "seasons" as const },
  { href: "/f1/drivers", labelKey: "drivers" as const },
  { href: "/f1/constructors", labelKey: "constructors" as const },
  { href: "/f1/compare", labelKey: "telemetry" as const, accent: true },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNav({ variant = "default" }: { variant?: "default" | "compact" }) {
  const pathname = usePathname();
  const compact = variant === "compact";
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = useTranslations("Nav");

  const navLinks = (
    <>
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setMobileOpen(false)}
          className={`whitespace-nowrap hover:text-white transition-colors min-h-[44px] flex items-center px-2 ${
            isActive(pathname, item.href) ? "text-white" : ""
          } ${"accent" in item && item.accent ? "text-[#E10600] font-bold" : ""}`}
        >
          {t(item.labelKey).toUpperCase()}
        </Link>
      ))}
    </>
  );

  return (
    <header className="relative h-14 border-b border-white/10 bg-[#111] flex items-center px-4 md:px-6 gap-2 md:gap-4 sticky top-0 z-50 shrink-0">
      <Link
        href="/"
        className="font-display font-bold text-xl text-[#E10600] hover:text-[#ff1a1a] transition-colors shrink-0"
        aria-label="UnderCut home"
      >
        UNDERCUT
      </Link>

      <SeasonSelector />

      <div className="w-px h-5 bg-white/10 hidden sm:block" />

      <nav
        className={`items-center gap-4 text-sm font-mono text-white/70 overflow-x-auto ${
          compact ? "hidden lg:flex" : "hidden md:flex"
        }`}
        aria-label="Main navigation"
      >
        {navLinks}
      </nav>

      <div className="flex-1" />

      <div className="hidden md:flex items-center gap-2">
        <LanguageSwitcher />
        <Link
          href="/live"
          className={`text-xs font-mono bg-[#E10600] text-white px-3 py-2 rounded hover:bg-[#ff1a1a] transition-colors shrink-0 min-h-[44px] flex items-center ${
            pathname === "/live" ? "ring-2 ring-white/30" : ""
          }`}
        >
          {t("liveConsole")}
        </Link>
      </div>

      <button
        type="button"
        className="md:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-white/70 hover:text-white"
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((o) => !o)}
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {mobileOpen && (
        <div className="md:hidden absolute top-14 inset-x-0 bg-[#111] border-b border-white/10 shadow-xl z-50">
          <nav className="flex flex-col p-4 gap-1 font-mono text-sm text-white/70" aria-label="Mobile navigation">
            {navLinks}
            <div className="pt-3 mt-2 border-t border-white/10 flex flex-col gap-3">
              <LanguageSwitcher />
              <Link
                href="/live"
                onClick={() => setMobileOpen(false)}
                className="text-xs font-mono bg-[#E10600] text-white px-3 py-2.5 rounded text-center min-h-[44px] flex items-center justify-center"
              >
                {t("liveConsole")}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
