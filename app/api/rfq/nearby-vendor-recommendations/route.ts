import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  createVendorCandidateBoundingBox,
  recommendNearbyVendors,
  RfqVendorCandidate,
} from "@/lib/geography/rfqMatching";
import {
  normalizeRadiusKm,
  parseCenterFromSearchParams,
} from "@/lib/geography/nearby";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const center = parseCenterFromSearchParams(searchParams);
  const radiusKm = normalizeRadiusKm(searchParams.get("radiusKm"), 50);
  const category = searchParams.get("category");
  const limit = Math.min(Number(searchParams.get("limit") || 25), 100);

  if (!center) {
    return NextResponse.json(
      {
        error: "Valid lat/lng query parameters are required.",
      },
      { status: 400 }
    );
  }

  const box = createVendorCandidateBoundingBox(center, radiusKm);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("business_profiles")
    .select(
      "user_id,business_name,business_type,nature_of_business,contact_person,phone_primary,phone_whatsapp,city,district,state,pincode,locality,service_radius_km,delivery_radius_km,statewide_service,nationwide_service,verified_lat,verified_lng,location_verification_status,subscription_plan,subscription_status,boost_priority,is_complete,registration_complete"
    )
    .not("verified_lat", "is", null)
    .not("verified_lng", "is", null)
    .gte("verified_lat", box.minLatitude)
    .lte("verified_lat", box.maxLatitude)
    .gte("verified_lng", box.minLongitude)
    .lte("verified_lng", box.maxLongitude)
    .limit(1000);

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
      },
      { status: 500 }
    );
  }

  const recommendations = recommendNearbyVendors({
    center,
    radiusKm,
    category,
    vendors: (data || []) as RfqVendorCandidate[],
    limit,
  });

  return NextResponse.json({
    center,
    radiusKm,
    category,
    count: recommendations.length,
    recommendations,
  });
}
