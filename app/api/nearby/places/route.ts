import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  nearbyBoundingBox,
  nearbySearch,
  normalizeRadiusKm,
  parseCenterFromSearchParams,
} from "@/lib/geography/nearby";

type GeoPlaceRow = {
  id: string;
  name: string | null;
  slug: string | null;
  latitude: number | null;
  longitude: number | null;
  pincode: string | null;
  is_active: boolean | null;
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const center = parseCenterFromSearchParams(searchParams);
  const radiusKm = normalizeRadiusKm(searchParams.get("radiusKm"), 25);
  const limit = Math.min(Number(searchParams.get("limit") || 50), 100);

  if (!center) {
    return NextResponse.json(
      {
        error: "Valid lat/lng query parameters are required.",
      },
      { status: 400 }
    );
  }

  const box = nearbyBoundingBox(center, radiusKm);
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("nearby_geo_places_box", {
    min_lat: box.minLatitude,
    max_lat: box.maxLatitude,
    min_lng: box.minLongitude,
    max_lng: box.maxLongitude,
    row_limit: 2000,
  });

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
      },
      { status: 500 }
    );
  }

  const results = nearbySearch<GeoPlaceRow>({
    center,
    radiusKm,
    items: data || [],
    getCoordinates: (place) =>
      place.latitude !== null && place.longitude !== null
        ? {
            latitude: place.latitude,
            longitude: place.longitude,
          }
        : null,
  }).slice(0, limit);

  return NextResponse.json({
    center,
    radiusKm,
    count: results.length,
    results,
  });
}
