// app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const FALLBACK_URL = "https://lynnvmqzdxqhhpkxuzvt.supabase.co";
const FALLBACK_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5bm52bXF6ZHhxaGhwa3h1enZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyNjk3ODMsImV4cCI6MjA4Mjg0NTc4M30.y5E3EhDIX2gw8xav1QOMzk6eUhty0VegL6CC4lH_Jrk";

function safeNextPath(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//")) return "/";
  return raw;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const origin = url.origin;

  const next = safeNextPath(url.searchParams.get("next"));
  const code = url.searchParams.get("code");

  const err = url.searchParams.get("error");
  const errDesc = url.searchParams.get("error_description");

  if (err || errDesc) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("next", next);
    if (err) loginUrl.searchParams.set("error", err);
    if (errDesc) loginUrl.searchParams.set("error_description", errDesc);
    return NextResponse.redirect(loginUrl);
  }

  if (!code) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("next", next);
    loginUrl.searchParams.set("error", "missing_code");
    return NextResponse.redirect(loginUrl);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY;

  const postLoginUrl = new URL("/auth/post-login", origin);
  postLoginUrl.searchParams.set("next", next);

  const res = NextResponse.redirect(postLoginUrl);

  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
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

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  // If PKCE verifier missing on server -> fallback to client exchanger page
  if (error) {
    const msg = (error.message || "").toLowerCase();
    if (msg.includes("pkce") && msg.includes("code verifier") && msg.includes("not found")) {
      const clientCb = new URL("/auth/callback-client", origin);
      clientCb.searchParams.set("next", next);
      clientCb.searchParams.set("code", code);
      return NextResponse.redirect(clientCb);
    }

    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("next", next);
    loginUrl.searchParams.set("error", "auth_callback_failed");
    loginUrl.searchParams.set("error_description", error.message || "Unknown callback error");
    return NextResponse.redirect(loginUrl);
  }

  return res;
}