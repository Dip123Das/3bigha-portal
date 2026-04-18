import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type GoogleAddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

type DistrictPolicyRow = {
  id: string;
  country: string;
  state: string;
  district: string;
  is_active: boolean;
  free_onboarding: boolean;
};

function normalizePlaceValue(value: string) {
  return value.trim().toLowerCase();
}

function placeMatches(policyValue: string, actualValue: string) {
  const p = normalizePlaceValue(policyValue);
  const a = normalizePlaceValue(actualValue);

  if (!p || !a) return false;
  return p === a || p.includes(a) || a.includes(p);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const lat = Number(body?.lat);
    const lng = Number(body?.lng);
    const accuracy =
      body?.accuracy === undefined || body?.accuracy === null
        ? null
        : Number(body.accuracy);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: "Missing coordinates" }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!url || !anon) {
      return NextResponse.json(
        { error: "Missing Supabase environment variables" },
        { status: 500 }
      );
    }

    if (!googleApiKey) {
      return NextResponse.json(
        { error: "Missing GOOGLE_MAPS_API_KEY" },
        { status: 500 }
      );
    }

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
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const geoUrl =
      `https://maps.googleapis.com/maps/api/geocode/json` +
      `?latlng=${encodeURIComponent(`${lat},${lng}`)}` +
      `&key=${encodeURIComponent(googleApiKey)}`;

    const geoRes = await fetch(geoUrl, {
      method: "GET",
      cache: "no-store",
    });

    if (!geoRes.ok) {
      return NextResponse.json(
        { error: "Failed to contact geocoding service" },
        { status: 502 }
      );
    }

    const geoData = await geoRes.json();

    if (geoData?.status && geoData.status !== "OK") {
      return NextResponse.json(
        { error: `Geocoding failed: ${geoData.status}` },
        { status: 400 }
      );
    }

    if (!Array.isArray(geoData?.results) || geoData.results.length === 0) {
      return NextResponse.json({ error: "Unable to resolve location" }, { status: 400 });
    }

    const components = (geoData.results[0].address_components || []) as GoogleAddressComponent[];

    let district = "";
    let state = "";
    let country = "";
    let locality = "";
    let postcode = "";

    for (const c of components) {
      if (c.types.includes("administrative_area_level_2") && !district) {
        district = c.long_name;
      }
      if (c.types.includes("administrative_area_level_1") && !state) {
        state = c.long_name;
      }
      if (c.types.includes("country") && !country) {
        country = c.long_name;
      }
      if (
        (c.types.includes("locality") ||
          c.types.includes("sublocality") ||
          c.types.includes("administrative_area_level_3")) &&
        !locality
      ) {
        locality = c.long_name;
      }
      if (c.types.includes("postal_code") && !postcode) {
        postcode = c.long_name;
      }
    }

    const { data: policies, error: policyErr } = await supabase
      .from("district_policies")
      .select("*")
      .eq("is_active", true);

    if (policyErr) {
      console.error("district_policies fetch error:", policyErr);
      return NextResponse.json({ error: "Policy lookup failed" }, { status: 500 });
    }

    const matchedPolicy =
      (policies as DistrictPolicyRow[] | null)?.find((policy) => {
        const countryOk = placeMatches(policy.country, country);
        const stateOk = placeMatches(policy.state, state);

        // 🔥 PRIORITY: locality first (most accurate)
        const districtOk =
          placeMatches(policy.district, locality) || // primary
          placeMatches(policy.district, district);   // fallback

        return countryOk && stateOk && districtOk;
      }) || null;

    const eligible_free = matchedPolicy?.free_onboarding === true;

    const { error: updateErr } = await supabase
      .from("business_profiles")
      .update({
        verified_lat: lat,
        verified_lng: lng,
        verified_accuracy_m: Number.isFinite(accuracy as number) ? accuracy : null,
        verified_source: "browser_geolocation",
        verified_country: country || null,
        verified_state: state || null,
        verified_district: district || null,
        verified_locality: locality || null,
        verified_postcode: postcode || null,
        verified_at: new Date().toISOString(),
        location_verification_status: "verified",
        eligible_free,
        eligibility_reason: eligible_free
          ? "allowed_district"
          : "outside_allowed_district",
        eligibility_checked_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updateErr) {
      console.error("business_profiles update error:", updateErr);
      return NextResponse.json({ error: "Failed to save verification" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      district,
      state,
      country,
      locality,
      postcode,
      matched_policy_district: matchedPolicy?.district ?? null,
      eligible_free,
    });
  } catch (err) {
    console.error("verify-location error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}