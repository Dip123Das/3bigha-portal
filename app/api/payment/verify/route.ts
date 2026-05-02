import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLAN_BOOST_PRIORITY: Record<string, number> = {
  basic_vendor: 5,
  premium_vendor: 10,
  hub_vendor: 20,
  boost_starter: 5,
  boost_pro: 12,
  boost_elite: 25,
};

const BOOST_DAYS: Record<string, number> = {
  boost_starter: 3,
  boost_pro: 7,
  boost_elite: 15,
};

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

    if (String(plan).startsWith("boost_")) {
      const days = BOOST_DAYS[plan] || 3;
      const expires = new Date();
      expires.setDate(expires.getDate() + days);

      await supabase
        .from("business_profiles")
        .update({
          boost_priority: PLAN_BOOST_PRIORITY[plan] || 0,
          boost_expires_at: expires.toISOString(),
          ai_revenue_score: (PLAN_BOOST_PRIORITY[plan] || 0) * 3, // 🧠 BOOST REVENUE SIGNAL
        })
        .eq("user_id", user_id);

      await supabase
        .from("vendor_boost_orders")
        .update({
          status: "active",
          razorpay_payment_id,
          activated_at: new Date().toISOString(),
          expires_at: expires.toISOString(),
        })
        .eq("user_id", user_id)
        .eq("razorpay_order_id", razorpay_order_id);

      return NextResponse.json({ ok: true, type: "boost" });
    }

    const expires = new Date();
    expires.setMonth(expires.getMonth() + 1);

    await supabase
      .from("business_profiles")
      .update({
        subscription_plan: plan,
        subscription_status: "active",
        subscription_expires_at: expires.toISOString(),
        boost_priority: PLAN_BOOST_PRIORITY[plan] || 0,
        ai_revenue_score: (PLAN_BOOST_PRIORITY[plan] || 0) * 5, // 🧠 REVENUE SIGNAL
      })
      .eq("user_id", user_id);
    return NextResponse.json({ ok: true, type: "subscription" });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Verification failed" },
      { status: 500 }
    );
  }
}