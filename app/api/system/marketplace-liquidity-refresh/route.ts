import { NextResponse } from "next/server";
import { refreshMarketplaceLiquidityScores } from "@/lib/marketplace/liquidity-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await refreshMarketplaceLiquidityScores();

  return NextResponse.json(result, {
    status: result.ok ? 200 : 500,
  });
}

export async function POST() {
  const result = await refreshMarketplaceLiquidityScores();

  return NextResponse.json(result, {
    status: result.ok ? 200 : 500,
  });
}
