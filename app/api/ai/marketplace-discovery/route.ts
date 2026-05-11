import { NextResponse } from "next/server";

import {
  buildMarketplaceDiscovery,
  filterVendorsForDiscovery,
} from "@/lib/seo/marketplace-discovery-engine";

import { getMarketplaceDiscoveryVendors } from "@/lib/seo/marketplace-discovery-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function runDiscovery(input: {
  query?: string | null;
  city?: string | null;
  district?: string | null;
  locality?: string | null;
  category?: string | null;
}) {
  const vendors = await getMarketplaceDiscoveryVendors();

  const filteredVendors = filterVendorsForDiscovery(
    vendors,
    input.query || input.category
  );

  return buildMarketplaceDiscovery({
    query: input.query || input.category || "recommended vendors",
    city: input.city || null,
    district: input.district || null,
    locality: input.locality || null,
    category: input.category || null,
    vendors: filteredVendors.length > 0 ? filteredVendors : vendors,
  });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const discovery = await runDiscovery({
      query: url.searchParams.get("q") || url.searchParams.get("query"),
      city: url.searchParams.get("city"),
      district: url.searchParams.get("district"),
      locality: url.searchParams.get("locality"),
      category: url.searchParams.get("category"),
    });

    return NextResponse.json({
      ok: true,
      method: "GET",
      discovery: {
        ...discovery,
        summary:
          discovery?.summary ||
          "3bigha AI is reading vendor, category and local marketplace signals.",
      },
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

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const discovery = await runDiscovery({
      query: body?.query || body?.searchIntent || null,
      city: body?.city || null,
      district: body?.district || null,
      locality: body?.locality || null,
      category: body?.category || null,
    });

    return NextResponse.json({
      ok: true,
      method: "POST",
      discovery: {
        ...discovery,
        summary:
          discovery?.summary ||
          "3bigha AI is reading vendor, category and local marketplace signals.",
      },
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