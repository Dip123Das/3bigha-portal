import { createServerClient } from "@supabase/ssr";

type CookieStoreLike = {
  get: (name: string) => { value: string } | undefined;
  set: (input: { name: string; value: string; [key: string]: any }) => void;
};

const FALLBACK_URL = "https://lynnvmqzdxqhhpkxuzvt.supabase.co";
const FALLBACK_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5bm52bXF6ZHhxaGhwa3h1enZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyNjk3ODMsImV4cCI6MjA4Mjg0NTc4M30.y5E3EhDIX2gw8xav1QOMzk6eUhty0VegL6CC4lH_Jrk";

export function getSupabaseServerClient(cookieStore: CookieStoreLike) {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    FALLBACK_URL;

  const anon =
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    FALLBACK_ANON_KEY;

  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {}
      },
      remove(name: string, options: any) {
        try {
          cookieStore.set({ name, value: "", ...options, maxAge: 0 });
        } catch {}
      },
    },
  });
}