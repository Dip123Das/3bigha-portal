// middleware.ts
import { NextResponse, type NextRequest } from "next/server";

const LOCALES = [
  "en",
  "bn",
  "hi",
  "as",
  "or",
  "gu",
  "mr",
  "pa",
  "ta",
  "te",
  "kn",
  "ml",
  "ur",
  "ne",
  "sa",
  "kok",
  "mai",
  "mni",
  "sd",
  "ks",
  "doi",
  "sat",
];


const PUBLIC_PATH_PREFIXES = [
  "/",
  "/login",
  "/signup",
  "/auth/callback",
  "/auth/account-disabled",
  "/property",
  "/materials",
  "/services",
  "/rentals",
  "/blog",
  "/search",
  "/seo",
  "/price-today",
  "/investment",
  "/emi-calculator",
  "/land-area-calculator",
  "/construction-cost",
  "/house-construction-cost",
  "/compare-rates",
  "/about",
  "/contact",
  "/privacy-policy",
  "/terms-and-conditions",
  "/refund-cancellation-policy",
];

function isPublicPath(pathname: string) {
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/vendor") ||
    pathname.startsWith("/buyer") ||
    pathname.startsWith("/inbox")
  ) {
    return false;
  }

  return PUBLIC_PATH_PREFIXES.some(
    (prefix) =>
      pathname === prefix ||
      pathname.startsWith(prefix + "/")
  );
}

function getLocaleFromPath(pathname: string) {
  const first = pathname.split("/").filter(Boolean)[0];
  return LOCALES.includes(first) ? first : null;
}

function loginRedirect(req: NextRequest, pathname: string) {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Supabase may return auth code to root if redirect URL is misconfigured.
  // Move it to the server callback route to avoid client-side crashes.
  if (pathname === "/" && req.nextUrl.searchParams.has("code")) {
    const callbackUrl = req.nextUrl.clone();
    callbackUrl.pathname = "/auth/callback";
    return NextResponse.redirect(callbackUrl);
  }

  const locale = getLocaleFromPath(pathname);

  const requestHeaders = new Headers(req.headers);

  if (locale) {
    requestHeaders.set("x-3bigha-locale", locale);
  }

  let res: NextResponse;

  if (locale) {
    const cleanPath = pathname.replace(`/${locale}`, "") || "/";
    const rewriteUrl = req.nextUrl.clone();

    rewriteUrl.pathname = cleanPath;

    res = NextResponse.rewrite(rewriteUrl, {
      request: { headers: requestHeaders },
    });

    res.cookies.set("3bigha_locale", locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  } else {
    res = NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  const authPathname = locale
    ? pathname.replace(`/${locale}`, "") || "/"
    : pathname;

  if (isPublicPath(authPathname)) {
    return res;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    return res;
  }

  const { createServerClient } = await import("@supabase/ssr");

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return loginRedirect(req, pathname);
  }

  const { data: accessProfile } = await supabase
    .from("profiles")
    .select("role,account_status")
    .eq("id", data.user.id)
    .maybeSingle();

  if (["deactivated", "permanently_blocked"].includes(accessProfile?.account_status || "")) {
    const disabledUrl = req.nextUrl.clone();
    disabledUrl.pathname = "/auth/account-disabled";
    disabledUrl.search = "";
    return NextResponse.redirect(disabledUrl);
  }

  if (accessProfile?.account_status === "re_registration_required" && !pathname.startsWith("/auth/register-role")) {
    const registrationUrl = req.nextUrl.clone();
    registrationUrl.pathname = "/auth/register-role";
    registrationUrl.search = "?registration=1";
    return NextResponse.redirect(registrationUrl);
  }

  if (pathname.startsWith("/admin")) {
    const profile = accessProfile;

    const canAccessAdminRoute =
      profile?.role === "master_admin" ||
      (profile?.role === "blog_admin" && pathname.startsWith("/admin/blog"));

    if (!canAccessAdminRoute) {
      const dashboardUrl = req.nextUrl.clone();
      dashboardUrl.pathname = "/dashboard";
      dashboardUrl.search = "";
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
