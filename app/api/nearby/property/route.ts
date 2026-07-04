import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  nearbyBoundingBox,
  nearbySearch,
  normalizeRadiusKm,
  parseCenterFromSearchParams,
} from "@/lib/geography/nearby";

type NearbyPropertyRow = {
  id: string;
  owner_id: string | null;
  title: string | null;
  slug: string | null;
  listing_intent: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  locality: string | null;
  price: number | null;
  latitude: number | null;
  longitude: number | null;
  owner_name: string | null;
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const center = parseCenterFromSearchParams(searchParams);
  const radiusKm = normalizeRadiusKm(searchParams.get("radiusKm"), 25);
  const limit = Math.min(Number(searchParams.get("limit") || 50), 100);

  if (!center) {
    return NextResponse.json({ error: "Valid lat/lng query parameters are required." }, { status: 400 });
  }

  const box = nearbyBoundingBox(center, radiusKm);
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("nearby_property_listings", {
    min_lat: box.minLatitude,
    max_lat: box.maxLatitude,
    min_lng: box.minLongitude,
    max_lng: box.maxLongitude,
    row_limit: 2000,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const q = String(searchParams.get("q") || "").trim().toLowerCase();

  const filtered = ((data || []) as NearbyPropertyRow[]).filter((item) => {
    if (!q) return true;
    return [
      item.title,
      item.slug,
      item.listing_intent,
      item.city,
      item.district,
      item.state,
      item.locality,
      item.owner_name,
    ].filter(Boolean).join(" ").toLowerCase().includes(q);
  });

  const results = nearbySearch<NearbyPropertyRow>({
    center,
    radiusKm,
    items: filtered,
    getCoordinates: (item) =>
      item.latitude !== null && item.longitude !== null
        ? { latitude: item.latitude, longitude: item.longitude }
        : null,
  }).slice(0, limit);

  return NextResponse.json({
    center,
    radiusKm,
    q: q || null,
    count: results.length,
    results,
  });
}
