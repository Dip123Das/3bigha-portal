import { NextRequest, NextResponse } from "next/server";

const MODULES = [
  "places",
  "vendors",
  "property",
  "materials",
  "services",
  "rentals",
] as const;

type NearbyModule = (typeof MODULES)[number];

async function fetchNearbyModule(
  request: NextRequest,
  moduleName: NearbyModule,
  params: URLSearchParams
) {
  const baseUrl =
    process.env.NEARBY_INTERNAL_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://127.0.0.1:3000";

  const url = new URL(`/api/nearby/${moduleName}`, baseUrl);
  url.search = params.toString();

  const res = await fetch(url.toString(), {
    cache: "no-store",
    headers: {
      accept: "application/json",
    },
  });

  const text = await res.text();

  try {
    return {
      ok: res.ok,
      status: res.status,
      data: JSON.parse(text),
    };
  } catch {
    return {
      ok: false,
      status: res.status,
      data: { error: text.slice(0, 300) },
    };
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json(
      { error: "Valid lat/lng query parameters are required." },
      { status: 400 }
    );
  }

  const radiusKm = searchParams.get("radiusKm") || "25";
  const limit = searchParams.get("limit") || "10";
  const q = searchParams.get("q") || "";

  const params = new URLSearchParams();
  params.set("lat", lat);
  params.set("lng", lng);
  params.set("radiusKm", radiusKm);
  params.set("limit", limit);
  if (q) params.set("q", q);

  const entries = await Promise.all(
    MODULES.map(async (moduleName) => {
      const result = await fetchNearbyModule(request, moduleName, params);
      return [moduleName, result] as const;
    })
  );

  const response: any = {
    center: {
      latitude: Number(lat),
      longitude: Number(lng),
    },
    radiusKm: Number(radiusKm),
    q: q || null,
    summary: {},
    errors: {},
  };

  for (const [moduleName, result] of entries) {
    if (result.ok) {
      const data = result.data || {};
      const results = Array.isArray(data.results) ? data.results : [];
      response[moduleName] = results;
      response.summary[moduleName] = results.length;
    } else {
      response[moduleName] = [];
      response.summary[moduleName] = 0;
      response.errors[moduleName] = result.data?.error || `HTTP ${result.status}`;
    }
  }

  if (Object.keys(response.errors).length === 0) {
    delete response.errors;
  }

  return NextResponse.json(response);
}
