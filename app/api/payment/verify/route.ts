import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      plan,
      user_id,
    } = body;

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const expires = new Date();
    expires.setMonth(expires.getMonth() + 1);

    await supabase
      .from("business_profiles")
      .update({
        subscription_plan: plan,
        subscription_status: "active",
        subscription_expires_at: expires.toISOString(),
        boost_priority:
          plan === "hub_vendor"
            ? 20
            : plan === "premium_vendor"
            ? 10
            : plan === "basic_vendor"
            ? 5
            : 0,
      })
      .eq("user_id", user_id);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Verification failed" },
      { status: 500 }
    );
  }
}