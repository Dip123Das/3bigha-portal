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

  const { data, error } = await supabase
    .from("geo_places")
    .select("id,name,slug,latitude,longitude,pincode,is_active")
    .eq("is_active", true)
    .gte("latitude", box.minLatitude)
    .lte("latitude", box.maxLatitude)
    .gte("longitude", box.minLongitude)
    .lte("longitude", box.maxLongitude)
    .limit(500);

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
