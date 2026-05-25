import { createClient } from "@supabase/supabase-js";

export async function getVerifiedBankerProfile(
  userId?: string | null
) {
  if (!userId) {
    return null;
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
      },
    }
  );

  const { data } = await supabase
    .from("finance_banker_profiles")
    .select("*")
    .eq("user_id", userId)
    .eq("final_status", "verified")
    .single();

  return data || null;
}