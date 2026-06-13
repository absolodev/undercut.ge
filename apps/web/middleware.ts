import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "./src/i18n/routing";
import { detectLocaleFromHeaders, isLocale } from "./src/i18n/config";

const intlMiddleware = createMiddleware({
  ...routing,
  // Sync NEXT_LOCALE from URL on navigation; prefixed paths are never overridden.
  localeDetection: true,
});

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bare `/` only: redirect to a locale. Cookie wins; geo applies on first visit with no cookie.
  if (pathname === "/") {
    const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
    if (cookieLocale && isLocale(cookieLocale)) {
      const url = request.nextUrl.clone();
      url.pathname = `/${cookieLocale}`;
      return NextResponse.redirect(url);
    }

    const locale = detectLocaleFromHeaders(
      request.headers.get("cf-ipcountry"),
      request.headers.get("x-vercel-ip-country"),
      request.headers.get("accept-language"),
      undefined
    );
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}`;
    return NextResponse.redirect(url);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
