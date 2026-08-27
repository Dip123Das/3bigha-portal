// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import {
  adminRoleCanAccessPath,
  isAdminRole,
} from "@/lib/admin/access-policy";

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

  /*
   * Authenticated workspaces contain personal and rapidly changing
   * operational information. They must never be shared-cached or
   * retained across application deployments.
   */
  res.headers.set(
    "Cache-Control",
    "private, no-store, no-cache, must-revalidate, max-age=0"
  );
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  res.headers.set("Vary", "Cookie, Authorization");
  res.headers.set("X-3Bigha-Workspace-Cache", "private-no-store");

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
    .select("role,account_status,approval_status,onboarding_completed")
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

  /*
   * CRS-3_REGISTRATION_COMPLETION_GATE
   *
   * Authentication alone never grants workspace access.
   * A member must finish the registration pathway they explicitly selected
   * before any dashboard can open.
   */
  const registrationPath = String(
    data.user.user_metadata?.registration_path || ""
  );

  const individualRegistrationStatus = String(
    data.user.user_metadata
      ?.individual_professional_registration_status || ""
  );

  const isDashboardRoute =
    authPathname === "/dashboard" ||
    authPathname.startsWith("/dashboard/");

  const isAdministrativeIdentity =
    isAdminRole(accessProfile?.role);

  if (isDashboardRoute && !isAdministrativeIdentity) {
    const returnTo =
      authPathname + req.nextUrl.search;

    if (registrationPath === "individual_professional") {
      if (
        individualRegistrationStatus !==
        "foundation_complete"
      ) {
        const onboardingUrl =
          req.nextUrl.clone();

        onboardingUrl.pathname =
          "/onboarding/individual-professional";

        onboardingUrl.search = "";
        onboardingUrl.searchParams.set(
          "registrationPath",
          "individual_professional"
        );
        onboardingUrl.searchParams.set(
          "returnTo",
          returnTo
        );

        return NextResponse.redirect(
          onboardingUrl
        );
      }
    } else if (registrationPath === "customer") {
      if (
        accessProfile?.onboarding_completed !== true
      ) {
        const onboardingUrl =
          req.nextUrl.clone();

        onboardingUrl.pathname =
          "/onboarding/customer";

        onboardingUrl.search = "";
        onboardingUrl.searchParams.set(
          "returnTo",
          returnTo
        );

        return NextResponse.redirect(
          onboardingUrl
        );
      }
    } else if (registrationPath === "business") {
      if (
        accessProfile?.onboarding_completed !== true
      ) {
        const onboardingUrl =
          req.nextUrl.clone();

        onboardingUrl.pathname =
          "/onboarding/business";

        onboardingUrl.search = "";
        onboardingUrl.searchParams.set(
          "registration",
          "1"
        );
        onboardingUrl.searchParams.set(
          "registrationPath",
          "business"
        );
        onboardingUrl.searchParams.set(
          "returnTo",
          returnTo
        );

        return NextResponse.redirect(
          onboardingUrl
        );
      }
    } else if (
      accessProfile?.onboarding_completed !== true
    ) {
      const registrationUrl =
        req.nextUrl.clone();

      registrationUrl.pathname =
        "/auth/register-role";

      registrationUrl.search = "";
      registrationUrl.searchParams.set(
        "next",
        returnTo
      );

      return NextResponse.redirect(
        registrationUrl
      );
    }
  }

  if (pathname.startsWith("/admin")) {
    const canAccessAdminRoute = adminRoleCanAccessPath(
      accessProfile?.role,
      authPathname
    );

    if (!canAccessAdminRoute) {
      const dashboardUrl = req.nextUrl.clone();
      dashboardUrl.pathname = "/dashboard";
      dashboardUrl.search = "";
      return NextResponse.redirect(dashboardUrl);
    }
  }

  if (authPathname.startsWith("/dashboard/vendor")) {
    const vendorRoles = new Set([
      "vendor",
      "hub_vendor",
      "builder",
      "blogger",
    ]);

    /*
     * ESSENTIAL_WORKSPACE_MUST_REMAIN_AVAILABLE
     *
     * A formally approved member may enter the workspace.
     * An established active and onboarded vendor may also
     * continue working while newer approval records are
     * being aligned.
     *
     * A paid Growth Plan is optional support and must never
     * control access to the Vendor Dashboard.
     */
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
