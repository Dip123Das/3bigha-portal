import { NextResponse } from "next/server";

import {
  buildMarketplaceDiscovery,
  filterVendorsForDiscovery,
} from "@/lib/seo/marketplace-discovery-engine";

import { getMarketplaceDiscoveryVendors } from "@/lib/seo/marketplace-discovery-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const query = body?.query || body?.searchIntent || null;
    const city = body?.city || null;
    const district = body?.district || null;
    const locality = body?.locality || null;
    const category = body?.category || null;

    const vendors = await getMarketplaceDiscoveryVendors();

    const filteredVendors = filterVendorsForDiscovery(vendors, query);

    const discovery = buildMarketplaceDiscovery({
      query,
      city,
      district,
      locality,
      category,
      vendors: filteredVendors.length > 0 ? filteredVendors : vendors,
    });

    return NextResponse.json({
      ok: true,
      discovery,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "Unable to generate marketplace discovery intelligence.",
      },
      { status: 500 }
    );
  }
}