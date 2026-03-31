// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const FALLBACK_URL = "https://lynnvmqzdxqhhpkxuzvt.supabase.co";
const FALLBACK_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5bm52bXF6ZHhxaGhwa3h1enZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyNjk3ODMsImV4cCI6MjA4Mjg0NTc4M30.y5E3EhDIX2gw8xav1QOMzk6eUhty0VegL6CC4lH_Jrk";

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({
    request: { headers: req.headers },
  });

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

  // Refresh session cookies if needed (critical for persistence + SSR checks).
  await supabase.auth.getUser();

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
