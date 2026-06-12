import { NextResponse } from "next/server";
import { refreshMarketplaceExpansionAutomation } from "@/lib/marketplace/marketplace-expansion-automation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await refreshMarketplaceExpansionAutomation();

  return NextResponse.json(result, {
    status: result.ok ? 200 : 500,
  });
}

export async function POST() {
  const result = await refreshMarketplaceExpansionAutomation();

  return NextResponse.json(result, {
    status: result.ok ? 200 : 500,
  });
}
