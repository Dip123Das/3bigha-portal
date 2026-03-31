// lib/supabasePublicBrowser.ts
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let _publicClient: SupabaseClient | null = null;

// in-memory storage so public client NEVER touches localStorage
function createMemoryStorage() {
  const mem = new Map<string, string>();
  return {
    getItem: (key: string) => (mem.has(key) ? (mem.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      mem.set(key, value);
    },
    removeItem: (key: string) => {
      mem.delete(key);
    },
  };
}

// Use ONLY env vars here (recommended).
export function getSupabasePublicBrowser(): SupabaseClient {
  if (_publicClient) return _publicClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  _publicClient = createBrowserClient(url, anon, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,

      // IMPORTANT: isolate PUBLIC client from vendor/admin auth storage
      storageKey: "sb-public-noauth",
      storage: createMemoryStorage() as any,
    },
  }) as unknown as SupabaseClient;

  return _publicClient;
}
