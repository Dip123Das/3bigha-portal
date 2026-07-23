import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import {
  SBI_GATEWAY_PROVIDER,
  SBI_INTEGRATION_READY,
  SUBSCRIPTION_PLANS,
  isPaidSubscriptionPlan,
} from "@/lib/payments/sbi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const session = getSupabaseServerClient(cookieStore);
  const {
    data: { user },
  } = await session.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const plan = String(body?.plan || "").trim().toLowerCase();
  if (!isPaidSubscriptionPlan(plan)) {
    return NextResponse.json({ error: "Select a valid paid plan." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const [{ data: profile }, { data: verification }] = await Promise.all([
    admin
      .from("profiles")
      .select("role,approval_status,account_status")
      .eq("id", user.id)
      .maybeSingle(),
    admin
      .from("registration_verification_cases")
      .select("status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (profile?.account_status && profile.account_status !== "active") {
    return NextResponse.json({ error: "This account is currently restricted." }, { status: 403 });
  }

  if (!profile?.role) {
    return NextResponse.json({ error: "Complete identity registration first." }, { status: 409 });
  }

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const planInfo = SUBSCRIPTION_PLANS[plan];

  const { data: paymentRequest, error } = await admin
    .from("subscription_payment_requests")
    .insert({
      user_id: user.id,
      provider: SBI_GATEWAY_PROVIDER,
      subscription_plan: plan,
      amount_paise: planInfo.amountPaise,
      currency: "INR",
      status: "gateway_configuration_pending",
      share_token: token,
      expires_at: expiresAt,
      verification_status: verification?.status || "not_checked",
      metadata: {
        approval_status: profile.approval_status || "pending",
        gateway_ready: SBI_INTEGRATION_READY,
      },
    })
    .select("id,share_token,status,expires_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await admin
    .from("business_profiles")
    .update({
      subscription_plan: plan,
      subscription_status: "payment_pending",
      subscription_expires_at: null,
    })
    .eq("user_id", user.id);

  const origin = new URL(req.url).origin;
  return NextResponse.json({
    ok: true,
    gatewayReady: SBI_INTEGRATION_READY,
    status: paymentRequest.status,
    paymentRequestId: paymentRequest.id,
    shareUrl: `${origin}/payment/sbi/${paymentRequest.share_token}`,
    expiresAt: paymentRequest.expires_at,
  });
}
