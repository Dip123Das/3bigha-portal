import { NextResponse } from "next/server";
import { razorpayReady } from "@/lib/payments/razorpay";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      gatewayReady: razorpayReady(),
      provider: "razorpay",
      manualRenewal: true,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
