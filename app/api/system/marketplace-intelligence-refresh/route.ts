import { NextResponse } from "next/server";

import {
  aggregateMarketplaceIntelligence,
} from "@/lib/marketplace/intelligence/services/marketplace-intelligence-aggregator";
import { authorizeInternalJobRequest } from "@/lib/security/internal-job-authorization";

// This operational endpoint performs live aggregation and must never execute
// during static generation.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = authorizeInternalJobRequest(request);
  if (denied) return denied;
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
