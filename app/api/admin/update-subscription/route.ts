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

function getPlanAmount(plan: string) {
  if (plan === "hub_vendor") return 2999;
  if (plan === "premium_vendor") return 1299;
  if (plan === "basic_vendor") return 599;
  return 0;
}

export async function POST(req: Request) {
  const supabase = getSupabaseAdmin();
  const form = await req.formData();

  const userId = String(form.get("user_id") || "");
  const plan = String(form.get("subscription_plan") || "free");
  const status = String(form.get("subscription_status") || "free");
  const expiresAt = String(form.get("subscription_expires_at") || "");
  const referenceNo = String(form.get("reference_no") || "");
  const notes = String(form.get("notes") || "");

  if (!userId) {
    return NextResponse.redirect(new URL("/admin/dashboard", req.url));
  }

  const subscriptionExpiresAt = expiresAt ? `${expiresAt}T23:59:59` : null;

  await supabase
    .from("business_profiles")
    .update({
      subscription_plan: plan,
      subscription_status: status,
      subscription_expires_at: subscriptionExpiresAt,
    })
    .eq("user_id", userId);

  if (status === "active" && plan !== "free") {
    await supabase.from("payment_records").insert({
      user_id: userId,
      subscription_plan: plan,
      amount: getPlanAmount(plan),
      currency: "INR",
      payment_method: "manual",
      payment_status: "paid",
      reference_no: referenceNo || null,
      notes: notes || null,
      subscription_expires_at: subscriptionExpiresAt,
    });
  }

  return NextResponse.redirect(new URL("/admin/dashboard", req.url));
}