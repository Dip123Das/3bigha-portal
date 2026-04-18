import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { lat, lng, accuracy } = body;

    if (!lat || !lng) {
      return NextResponse.json({ error: "Missing coordinates" }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const cookieStore = await cookies();

    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 🔹 Google Reverse Geocoding
    const geoRes = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.GOOGLE_MAPS_API_KEY}`
    );

    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      return NextResponse.json({ error: "Unable to resolve location" }, { status: 400 });
    }

    const components = geoData.results[0].address_components;

    let district = "";
    let state = "";
    let country = "";
    let locality = "";
    let postcode = "";

    for (const c of components) {
      if (c.types.includes("administrative_area_level_2")) {
        district = c.long_name;
      }
      if (c.types.includes("administrative_area_level_1")) {
        state = c.long_name;
      }
      if (c.types.includes("country")) {
        country = c.long_name;
      }
      if (c.types.includes("locality")) {
        locality = c.long_name;
      }
      if (c.types.includes("postal_code")) {
        postcode = c.long_name;
      }
    }

    // 🔹 Match with district policy
    const { data: policy } = await supabase
      .from("district_policies")
      .select("*")
      .eq("district", district)
      .eq("state", state)
      .eq("country", country)
      .eq("is_active", true)
      .maybeSingle();

    const eligible_free = policy?.free_onboarding === true;

    // 🔹 Update business profile
    await supabase
      .from("business_profiles")
      .update({
        verified_lat: lat,
        verified_lng: lng,
        verified_accuracy_m: accuracy,
        verified_source: "browser_geolocation",
        verified_country: country,
        verified_state: state,
        verified_district: district,
        verified_locality: locality,
        verified_postcode: postcode,
        verified_at: new Date().toISOString(),
        location_verification_status: "verified",
        eligible_free,
        eligibility_reason: eligible_free
          ? "allowed_district"
          : "outside_allowed_district",
        eligibility_checked_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    return NextResponse.json({
      success: true,
      district,
      state,
      country,
      eligible_free,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}