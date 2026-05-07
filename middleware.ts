// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const FALLBACK_URL = "https://lynnvmqzdxqhhpkxuzvt.supabase.co";
const FALLBACK_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6Imx5bm52bXF6ZHhxaGhwa3h1enZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyNjk3ODMsImV4cCI6MjA4Mjg0NTc4M30.y5E3EhDIX2gw8xav1QOMzk6eUhty0VegL6CC4lH_Jrk";

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

function getLocaleFromPath(pathname: string) {
  const first = pathname.split("/").filter(Boolean)[0];
  return LOCALES.includes(first) ? first : null;
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
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

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY;

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

  await supabase.auth.getUser();

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};