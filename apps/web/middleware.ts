import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "./src/i18n/routing";
import { detectLocaleFromHeaders } from "./src/i18n/config";

const intlMiddleware = createMiddleware({
  ...routing,
  localeDetection: false,
});

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    const country = request.headers.get("x-vercel-ip-country");
    const acceptLanguage = request.headers.get("accept-language");
    const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
    const locale = detectLocaleFromHeaders(cookieLocale, country, acceptLanguage);
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}`;
    return NextResponse.redirect(url);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
