import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

function cleanPin(value: unknown) {
  const pin = String(value || "").trim();
  return /^[1-9][0-9]{5}$/.test(pin) ? pin : "";
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const geoPlaceId = String(body.geo_place_id || body.geoPlaceId || "").trim();
    const submittedPin = cleanPin(body.pincode);

    if (!geoPlaceId || !submittedPin) {
      return NextResponse.json(
        { error: "geo_place_id and valid 6-digit pincode are required" },
        { status: 400 }
      );
    }

    const { data: place, error: placeError } = await supabase
      .from("geo_places")
      .select("id,name,place_type,pincode,lgd_code")
      .eq("id", geoPlaceId)
      .maybeSingle();

    if (placeError || !place) {
      return NextResponse.json({ error: "Place not found" }, { status: 404 });
    }

    const oldPin = String(place.pincode || "").trim();
    let action = "logged_only";

    if (!oldPin) {
      const { error: updatePlaceError } = await supabase
        .from("geo_places")
        .update({ pincode: submittedPin, updated_at: new Date().toISOString() })
        .eq("id", geoPlaceId);

      if (updatePlaceError) throw updatePlaceError;

      action = "geo_places_updated";

      if (place.place_type === "village" && place.lgd_code) {
        await supabase
          .from("geo_lgd_villages")
          .update({ pincode: submittedPin, updated_at: new Date().toISOString() })
          .eq("lgd_village_code", Number(place.lgd_code))
          .is("pincode", null);
      }
    } else if (oldPin === submittedPin) {
      action = "already_same_pin";
    } else {
      action = "conflict_logged_no_overwrite";
    }

    await supabase.from("geo_user_pincode_learning_log").insert({
      geo_place_uuid: geoPlaceId,
      lgd_village_code: place.lgd_code || null,
      place_name: place.name,
      place_type: place.place_type,
      old_pincode: oldPin || null,
      submitted_pincode: submittedPin,
      action,
      source: "user_address_input",
    });

    return NextResponse.json({ ok: true, action });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
