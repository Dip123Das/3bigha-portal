import { NextResponse } from "next/server";
import { refreshMarketplaceLiquidityScores } from "@/lib/marketplace/liquidity-engine";
import { authorizeInternalJobRequest } from "@/lib/security/internal-job-authorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = authorizeInternalJobRequest(request);
  if (denied) return denied;
  const result = await refreshMarketplaceLiquidityScores();

  return NextResponse.json(result, {
    status: result.ok ? 200 : 500,
  });
}

export async function POST(request: Request) {
  const denied = authorizeInternalJobRequest(request);
  if (denied) return denied;
  const result = await refreshMarketplaceLiquidityScores();

  return NextResponse.json(result, {
    status: result.ok ? 200 : 500,
  });
}
