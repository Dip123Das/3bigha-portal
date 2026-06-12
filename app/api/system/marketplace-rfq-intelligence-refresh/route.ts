import { NextResponse } from "next/server";
import { refreshMarketplaceRfqIntelligence } from "@/lib/marketplace/rfq-intelligence-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await refreshMarketplaceRfqIntelligence();

  return NextResponse.json(result, {
    status: result.ok ? 200 : 500,
  });
}

export async function POST() {
  const result = await refreshMarketplaceRfqIntelligence();

  return NextResponse.json(result, {
    status: result.ok ? 200 : 500,
  });
}
