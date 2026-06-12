import { NextResponse } from "next/server";
import { refreshMarketplacePromotionIntelligence } from "@/lib/marketplace/marketplace-promotion-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await refreshMarketplacePromotionIntelligence();

  return NextResponse.json(result, {
    status: result.ok ? 200 : 500,
  });
}

export async function POST() {
  const result = await refreshMarketplacePromotionIntelligence();

  return NextResponse.json(result, {
    status: result.ok ? 200 : 500,
  });
}
