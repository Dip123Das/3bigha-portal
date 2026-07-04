import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  nearbyBoundingBox,
  nearbySearch,
  normalizeRadiusKm,
  parseCenterFromSearchParams,
} from "@/lib/geography/nearby";
import { resolveVendorCoordinates } from "@/lib/geography/vendorCoordinates";
import {
  isEligibleVendorProfile,
  matchesBusinessCategory,
  sortNearbyVendors,
  vendorCoversDistance,
} from "@/lib/geography/vendorMatching";

type VendorRow = {
  user_id: string;
  business_name: string | null;
  business_type: string | null;
  nature_of_business: string[] | null;
  contact_person: string | null;
  phone_primary: string | null;
  phone_whatsapp: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  locality: string | null;
  service_radius_km: number | null;
  delivery_radius_km: number | null;
  statewide_service: boolean | null;
  nationwide_service: boolean | null;
  verified_lat: number | string | null;
  verified_lng: number | string | null;
  location_verification_status: string | null;
  subscription_plan: string | null;
  subscription_status: string | null;
  boost_priority: number | null;
  is_complete: boolean | null;
  registration_complete: boolean | null;
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const center = parseCenterFromSearchParams(searchParams);
  const radiusKm = normalizeRadiusKm(searchParams.get("radiusKm"), 25);
  const limit = Math.min(Number(searchParams.get("limit") || 50), 100);
  const category = searchParams.get("category");

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
    .limit(500);

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
      },
      { status: 500 }
    );
  }

  const filteredVendors = nearbySearch<VendorRow>({
    center,
    radiusKm,
    items: data || [],
    getCoordinates: (vendor) => resolveVendorCoordinates(vendor).coordinates,
  })
    .filter((vendor) => matchesBusinessCategory(vendor, category))
    .filter(isEligibleVendorProfile)
    .filter(vendorCoversDistance);

  const nearbyVendors = sortNearbyVendors(filteredVendors).slice(0, limit);

  return NextResponse.json({
    center,
    radiusKm,
    category,
    count: nearbyVendors.length,
    results: nearbyVendors,
  });
}
