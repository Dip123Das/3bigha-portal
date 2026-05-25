import { createClient } from "@supabase/supabase-js";

export async function getLenderRegistry() {
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
    .from("finance_lender_registry")
    .select("*")
    .eq("is_active", true)
    .order("lender_name");

  return data || [];
}