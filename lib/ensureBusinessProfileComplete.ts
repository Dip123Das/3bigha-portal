import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type GateResult = { ok: true; redirectTo: "" } | { ok: false; redirectTo: string };

function safePath(p: string, fallback: string) {
  if (!p) return fallback;
  if (!p.startsWith("/")) return fallback;
  return p;
}

/**
 * Gate vendor-only actions (submit/publish).
 * Uses v_vendor_profile_completeness first (preferred).
 * Falls back to business_profiles.is_complete if the view is missing.
 *
 * IMPORTANT: uses `next` query param (your app standard).
 */
export async function ensureBusinessProfileComplete(returnTo: string): Promise<GateResult> {
  const supabase = getSupabaseBrowser();
  const safeReturnTo = safePath(returnTo, "/dashboard");

  // ✅ Avoid JWT errors (expired token) by refreshing before any DB reads
  const { data: sess0 } = await supabase.auth.getSession();
  if (!sess0?.session?.user?.id) {
    return { ok: false, redirectTo: `/login?next=${encodeURIComponent(safeReturnTo)}` };
  }

  const { data: sess1, error: refreshErr } = await supabase.auth.refreshSession();
  if (refreshErr || !sess1?.session?.user?.id) {
    return { ok: false, redirectTo: `/login?next=${encodeURIComponent(safeReturnTo)}` };
  }

  const userId = sess1.session.user.id;

  // 1) Preferred: canonical completeness view
  const { data: comp, error: compErr } = await supabase
    .from("v_vendor_profile_completeness")
    .select("is_complete,business_profile_complete,percent,completion_percent")
    .eq("user_id", userId)
    .maybeSingle();

  if (!compErr && comp) {
    const isComplete =
      comp.is_complete === true ||
      comp.business_profile_complete === true ||
      comp.percent === 100 ||
      comp.completion_percent === 100;

    if (!isComplete) {
      return { ok: false, redirectTo: `/onboarding/business?next=${encodeURIComponent(safeReturnTo)}` };
    }

    return { ok: true, redirectTo: "" };
  }

  // 2) Fallback: old flag
  const { data: bp, error: bpErr } = await supabase
    .from("business_profiles")
    .select("is_complete")
    .eq("user_id", userId)
    .maybeSingle();

  if (bpErr || !bp?.is_complete) {
    return { ok: false, redirectTo: `/onboarding/business?next=${encodeURIComponent(safeReturnTo)}` };
  }

  return { ok: true, redirectTo: "" };
}
