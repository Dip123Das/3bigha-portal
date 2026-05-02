import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAYMENT_ENABLED = process.env.PAYMENT_ENABLED === "true";

const PLAN_PRICES: Record<string, number> = {
  basic_vendor: 49900,
  premium_vendor: 99900,
  hub_vendor: 199900,
  boost_starter: 19900,
  boost_pro: 49900,
  boost_elite: 99900,
};

const BOOST_META: Record<
  string,
  { boost_priority: number; duration_days: number }
> = {
  boost_starter: { boost_priority: 5, duration_days: 3 },
  boost_pro: { boost_priority: 12, duration_days: 7 },
  boost_elite: { boost_priority: 25, duration_days: 15 },
};

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: "Invalid user" }, { status: 401 });
    }

    const body = await req.json();
    const plan = String(body?.plan || "");

    if (!PLAN_PRICES[plan]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (plan.startsWith("boost_")) {
      const boost = BOOST_META[plan];

      const { data: boostOrder, error } = await supabase
        .from("vendor_boost_orders")
        .insert({
          user_id: user.id,
          plan,
          amount_paise: PLAN_PRICES[plan],
          boost_priority: boost.boost_priority,
          duration_days: boost.duration_days,
          status: PAYMENT_ENABLED ? "created" : "payment_disabled",
          payment_enabled: PAYMENT_ENABLED,
        })
        .select("*")
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      if (!PAYMENT_ENABLED) {
        return NextResponse.json({
          ok: true,
          payment_enabled: false,
          message: "Payment coming soon",
          boostOrder,
        });
      }
    }

    if (!PAYMENT_ENABLED) {
      return NextResponse.json({
        ok: true,
        payment_enabled: false,
        message: "Payment coming soon",
      });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const order = await razorpay.orders.create({
      amount: PLAN_PRICES[plan],
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        user_id: user.id,
        plan,
      },
    });

    if (plan.startsWith("boost_")) {
      await supabase
        .from("vendor_boost_orders")
        .update({
          razorpay_order_id: order.id,
          status: "razorpay_order_created",
        })
        .eq("user_id", user.id)
        .eq("plan", plan)
        .eq("status", "created")
        .order("created_at", { ascending: false });
    }

    return NextResponse.json(order);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Order creation failed" },
      { status: 500 }
    );
  }
}