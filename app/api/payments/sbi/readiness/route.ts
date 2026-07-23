import { NextResponse } from "next/server";
import { SBI_INTEGRATION_READY } from "@/lib/payments/sbi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      gatewayReady: SBI_INTEGRATION_READY,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
