import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase env vars");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

export async function POST(req: Request) {
  const supabase = getSupabaseAdmin();
  const form = await req.formData();

  const userId = String(form.get("user_id") || "");
  const plan = String(form.get("subscription_plan") || "free");
  const status = String(form.get("subscription_status") || "free");
  const expiresAt = String(form.get("subscription_expires_at") || "");

  if (!userId) {
    return NextResponse.redirect(new URL("/admin/users", req.url));
  }

  await supabase
    .from("business_profiles")
    .update({
      subscription_plan: plan,
      subscription_status: status,
      subscription_expires_at: expiresAt ? `${expiresAt}T23:59:59` : null,
    })
    .eq("user_id", userId);

  return NextResponse.redirect(new URL("/admin/users", req.url));
}