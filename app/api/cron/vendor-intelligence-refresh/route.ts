import { NextResponse } from "next/server";
import { refreshVendorMarketplaceIntelligence } from "@/lib/marketplace/vendor-intelligence-refresh";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await refreshVendorMarketplaceIntelligence();

  return NextResponse.json(
    {
      ok: result.ok,
      job: "vendor-intelligence-refresh",
      ...result,
      refreshed_at: new Date().toISOString(),
    },
    { status: result.ok ? 200 : 500 },
  );
}
