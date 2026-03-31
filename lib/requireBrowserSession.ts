// lib/requireBrowserSession.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export async function requireBrowserSession(opts: {
  supabase: SupabaseClient;
  router: { replace: (url: string) => void };
  nextUrl: string;
}) {
  const { supabase, router, nextUrl } = opts;

  // getSession() shape differs across supabase client versions
  const sRes: any = await supabase.auth.getSession();
  if (sRes?.error) {
    throw new Error(sRes.error.message ?? "Failed to get session");
  }

  const session = sRes?.data?.session ?? sRes?.session ?? null;
  if (session) return session;

  // Silent refresh once
  const rRes: any = await supabase.auth.refreshSession();
  if (rRes?.error) {
    router.replace(`/login?reason=expired&next=${encodeURIComponent(nextUrl)}`);
    return null;
  }

  const refreshed = rRes?.data?.session ?? rRes?.session ?? null;
  if (refreshed) return refreshed;

  router.replace(`/login?reason=expired&next=${encodeURIComponent(nextUrl)}`);
  return null;
}