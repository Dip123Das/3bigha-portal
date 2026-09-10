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
  "/location",
  "/market",
  "/market-rfq",
  "/need",
  "/founding-vendors",
  "/ai-search-guide",
  "/cost-calculator",
  "/logout",
  "/offline",
  "/vendor-opportunities",
  "/verify/registration",
  "/banking-finance-assistance",
  "/banker/apply",
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

const PRIVATE_PATH_PREFIXES = [
  "/auth/post-login",
  "/auth/register-role",
  "/test",
  "/admin",
  "/dashboard",
  "/buyer",
  "/inbox",
  "/settings",
  "/onboarding",
  "/enquiries",
  "/delivery-track",
  "/payment",
  "/checkout",
  "/subscription",
  "/thread",
  "/chat",
  "/rfq",
  "/support",
  "/vendor-inbox",
  "/property/add",
  "/property/edit",
  "/property/inventory",
  "/property/my",
  "/property/builder/projects",
  "/materials/add",
  "/materials/my",
  "/materials/rfq",
  "/rentals/add",
  "/rentals/my",
  "/services/add",
  "/services/my",
  "/services/turnkey/add",
  "/blog/my",
];

const PRIVATE_VENDOR_PATH_PREFIXES = [
  "/vendor/inbox",
  "/vendor/inbox-v2",
  "/vendor/price-updates",
];

const PUBLIC_ASSET_PATTERN =
  /\.(?:avif|bmp|css|eot|gif|ico|jpe?g|js|json|map|otf|png|svg|ttf|txt|webmanifest|webp|woff2?)$/i;

function matchesPathPrefix(pathname: string, prefix: string) {
  return (
    pathname === prefix ||
    pathname.startsWith(prefix + "/")
  );
}

function isPublicPath(pathname: string) {
  if (
    matchesPathPrefix(pathname, "/api") ||
    PRIVATE_PATH_PREFIXES.some((prefix) =>
      matchesPathPrefix(pathname, prefix)
    )
  ) {
    return false;
  }

  if (
    pathname.startsWith("/_next") ||
    PUBLIC_ASSET_PATTERN.test(pathname)
  ) {
    return true;
  }

  if (pathname === "/vendor") {
    return false;
  }

  if (matchesPathPrefix(pathname, "/vendor")) {
    return !PRIVATE_VENDOR_PATH_PREFIXES.some((prefix) =>
      matchesPathPrefix(pathname, prefix)
    );
  }

  if (
    PUBLIC_PATH_PREFIXES.some((prefix) =>
      matchesPathPrefix(pathname, prefix)
    )
  ) {
    return true;
  }

  /*
   * Unknown URLs must reach the Next.js router so that
   * missing pages return a genuine HTTP 404. Treating an
   * unknown path as a private workspace would redirect
   * crawlers to login and create soft-404 signals.
   *
   * Every real protected route must therefore remain
   * explicitly classified above.
   */
  return true;
}

const RENTAL_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const RENTAL_RESERVED_SEGMENTS = new Set([
  "add",
  "my",
  "catalog",
]);

function rentalDetailId(pathname: string) {
  const match = pathname.match(
    /^\/rentals\/([^/]+)$/
  );

  if (!match) {
    return null;
  }

  let segment: string;

  try {
    segment = decodeURIComponent(
      match[1] || ""
    ).trim();
  } catch {
    return "__invalid_rental_identifier__";
  }

  if (
    !segment ||
    RENTAL_RESERVED_SEGMENTS.has(
      segment.toLowerCase()
    )
  ) {
    return null;
  }

  return segment;
}

function rentalNotFoundResponse() {
  return new NextResponse(
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex, nofollow">
<title>Rental Listing Not Found | 3bigha.com</title>
</head>
<body>
<main>
<h1>Rental listing not found</h1>
<p>This rental listing is unavailable or no longer public.</p>
<a href="/rentals">Browse available rentals</a>
</main>
</body>
</html>`,
    {
      status: 404,
      headers: {
        "Content-Type":
          "text/html; charset=utf-8",
        "Cache-Control":
          "public, max-age=0, s-maxage=60",
        "X-Robots-Tag":
          "noindex, nofollow, noarchive",
      },
    }
  );
}

async function publicRentalExists(
  id: string
): Promise<boolean | null> {
  if (!RENTAL_UUID_PATTERN.test(id)) {
    return false;
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return null;
  }

  try {
    const endpoint = new URL(
      "/rest/v1/rental_listings_public",
      supabaseUrl
    );

    endpoint.searchParams.set("id", `eq.${id}`);
    endpoint.searchParams.set("select", "id");
    endpoint.searchParams.set("limit", "1");

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const rows = await response.json();

    return (
      Array.isArray(rows) &&
      rows.length > 0
    );
  } catch {
    /*
     * Fail open on infrastructure errors. The server
     * page still supplies a noindex not-found result.
     */
    return null;
  }
}

const PROPERTY_RESERVED_SEGMENTS = new Set([
  "add",
  "my",
  "edit",
  "inventory",
  "projects",
  "builder",
]);

function propertyDetailId(pathname: string) {
  const match = pathname.match(
    /^\/property\/([^/]+)$/
  );

  if (!match) {
    return null;
  }

  let segment: string;

  try {
    segment = decodeURIComponent(
      match[1] || ""
    ).trim();
  } catch {
    return "__invalid_property_identifier__";
  }

  if (
    !segment ||
    PROPERTY_RESERVED_SEGMENTS.has(
      segment.toLowerCase()
    )
  ) {
    return null;
  }

  return segment;
}

function propertyNotFoundResponse() {
  return new NextResponse(
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex, nofollow">
<title>Property Not Found | 3bigha.com</title>
</head>
<body>
<main>
<h1>Property not found</h1>
<p>This property is unavailable or is not publicly published.</p>
<a href="/property">Browse available properties</a>
</main>
</body>
</html>`,
    {
      status: 404,
      headers: {
        "Content-Type":
          "text/html; charset=utf-8",
        "Cache-Control":
          "public, max-age=0, s-maxage=60",
        "X-Robots-Tag":
          "noindex, nofollow, noarchive",
      },
    }
  );
}

async function publicPropertyExists(
  id: string
): Promise<boolean | null> {
  if (!RENTAL_UUID_PATTERN.test(id)) {
    return false;
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return null;
  }

  try {
    const endpoint = new URL(
      "/rest/v1/property_listings",
      supabaseUrl
    );

    endpoint.searchParams.set("id", `eq.${id}`);
    endpoint.searchParams.set(
      "status",
      "eq.published"
    );
    endpoint.searchParams.set(
      "is_public",
      "eq.true"
    );
    endpoint.searchParams.set("select", "id");
    endpoint.searchParams.set("limit", "1");

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const rows = await response.json();

    return (
      Array.isArray(rows) &&
      rows.length > 0
    );
  } catch {
    /*
     * Fail open when the public-data service is
     * unavailable. The server page retains its own
     * publication filters and notFound gates.
     */
    return null;
  }
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

  const response = NextResponse.redirect(url);

  response.headers.set(
    "X-Robots-Tag",
    "noindex, nofollow, noarchive"
  );

  return response;
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

  const requestedRentalId =
    rentalDetailId(authPathname);

  if (requestedRentalId) {
    const exists = await publicRentalExists(
      requestedRentalId
    );

    if (exists === false) {
      return rentalNotFoundResponse();
    }
  }

  const requestedPropertyId =
    propertyDetailId(authPathname);

  if (requestedPropertyId) {
    const exists = await publicPropertyExists(
      requestedPropertyId
    );

    if (exists === false) {
      return propertyNotFoundResponse();
    }
  }

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
  res.headers.set(
    "X-Robots-Tag",
    "noindex, nofollow, noarchive"
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
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|seo-sitemap.xml|seo-sitemap-categories.xml).*)",
  ],
};
