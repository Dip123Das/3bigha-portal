import { NextResponse } from "next/server";
import { refreshVendorMarketplaceIntelligence } from "@/lib/marketplace/vendor-intelligence-refresh";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await refreshVendorMarketplaceIntelligence();

  return NextResponse.json(result, {
    status: result.ok ? 200 : 500,
  });
}

export async function POST() {
  const result = await refreshVendorMarketplaceIntelligence();

  return NextResponse.json(result, {
    status: result.ok ? 200 : 500,
  });
}
