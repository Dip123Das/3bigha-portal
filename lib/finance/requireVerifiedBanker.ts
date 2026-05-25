import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getVerifiedBankerProfile } from "./getVerifiedBankerProfile";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function requireVerifiedBanker() {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const adminSupabase = getAdminClient();

  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "master_admin") {
    const { data: bankerProfile } = await adminSupabase
      .from("finance_banker_profiles")
      .select("*")
      .eq("final_status", "verified")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return (
      bankerProfile || {
        id: "master-admin-preview",
        user_id: user.id,
        full_name: "Master Admin",
        bank_name: "Admin Finance Desk",
        branch_name: "3Bigha Finance Control",
        ifsc_code: "ADMIN",
        branch_code: null,
        employee_id: "MASTER_ADMIN",
        designation: "Finance Administrator",
        official_email: user.email,
        official_mobile: null,
        employee_card_url: null,
        id_card_ocr_text: null,
        ai_verification_status: "admin",
        ai_verification_notes: null,
        manual_verification_status: "verified",
        manual_verification_notes: "Master admin access",
        final_status: "verified",
        verified_by: user.id,
        verified_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    );
  }

  const bankerProfile = await getVerifiedBankerProfile(user.id);

  if (!bankerProfile) {
    redirect("/banker/apply");
  }

  return bankerProfile;
}