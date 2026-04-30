import { NextResponse } from "next/server";
import Razorpay from "razorpay";

export const runtime = "nodejs";

const PLAN_PRICES: Record<string, number> = {
  basic_vendor: 49900,
  premium_vendor: 99900,
  hub_vendor: 199900,
};

export async function POST(req: Request) {
  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
    const body = await req.json();
    const plan = String(body?.plan || "");

    if (!PLAN_PRICES[plan]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const order = await razorpay.orders.create({
      amount: PLAN_PRICES[plan],
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    return NextResponse.json(order);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Order creation failed" },
      { status: 500 }
    );
  }
}