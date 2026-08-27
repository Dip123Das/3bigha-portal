import { NextResponse } from "next/server";

import {
  aggregateMarketplaceIntelligence,
} from "@/lib/marketplace/intelligence/services/marketplace-intelligence-aggregator";

// This operational endpoint performs live aggregation and must never execute
// during static generation.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result =
      await aggregateMarketplaceIntelligence();

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Marketplace intelligence refresh failed.",
      },
      { status: 500 }
    );
  }
}
