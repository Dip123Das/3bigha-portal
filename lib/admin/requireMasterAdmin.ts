import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function requireMasterAdmin() {
  const cookieStore = await cookies();
  const sessionClient = getSupabaseServerClient(cookieStore);
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401 } as const;

  const { data: profile } = await sessionClient.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "master_admin") return { error: "Forbidden", status: 403 } as const;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { error: "Missing server configuration", status: 500 } as const;

  return { user, admin: createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) } as const;
}
