import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

function code(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function POST(request: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !anon || !serviceRole) {
      return NextResponse.json({ ok: false, error: "Geography service is unavailable." }, { status: 500 });
    }

    const cookieStore = await cookies();
    const session = createServerClient(url, anon, {
      cookies: { getAll: () => cookieStore.getAll(), setAll() {} },
    });
    const { data: { user }, error: authError } = await session.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ ok: false, error: "Login required." }, { status: 401 });
    }

    const body = await request.json();
    const mode = body?.geo_selection_mode === "urban" ? "urban" : "rural";
    const lgd = {
      state: code(body?.lgd_state_code),
      district: code(body?.lgd_district_code),
      subdistrict: code(body?.lgd_subdistrict_code),
      block: mode === "rural" ? code(body?.lgd_block_code) : null,
      village: mode === "rural" ? code(body?.lgd_village_code) : null,
      localBody: mode === "urban" ? code(body?.lgd_local_body_code) : null,
      ward: mode === "urban" ? code(body?.lgd_ward_code) : null,
    };
    if (!lgd.state) {
      return NextResponse.json({ ok: false, error: "Select a valid state." }, { status: 400 });
    }

    const admin = createClient(url, serviceRole, { auth: { persistSession: false } });
    const stateResult = await admin.from("geo_lgd_states").select("lgd_state_code,slug").eq("lgd_state_code", lgd.state).eq("is_active", true).maybeSingle();
    if (stateResult.error || !stateResult.data) {
      return NextResponse.json({ ok: false, error: "The selected LGD state is invalid." }, { status: 400 });
    }

    const stateCanonical = await admin.from("geo_states").select("id").eq("slug", stateResult.data.slug).maybeSingle();
    if (stateCanonical.error || !stateCanonical.data) {
      return NextResponse.json({ ok: false, error: "The selected state has no canonical geography record." }, { status: 409 });
    }

    if (!lgd.district) {
      return NextResponse.json({ ok: true, geography: {
        geo_state_id: stateCanonical.data.id,
        geo_district_id: null,
        geo_subdivision_id: null,
        geo_block_id: null,
        geo_place_id: null,
      }});
    }

    const districtResult = await admin.from("geo_lgd_districts").select("lgd_district_code,lgd_state_code").eq("lgd_district_code", lgd.district).eq("is_active", true).maybeSingle();
    if (districtResult.error || !districtResult.data || districtResult.data.lgd_state_code !== lgd.state) {
      return NextResponse.json({ ok: false, error: "The selected LGD state and district hierarchy is invalid." }, { status: 400 });
    }
    const districtCanonical = await admin.from("geo_districts").select("id").eq("lgd_code", String(lgd.district)).eq("state_id", stateCanonical.data.id).maybeSingle();
    if (districtCanonical.error || !districtCanonical.data) {
      return NextResponse.json({ ok: false, error: "The selected district could not be resolved uniquely." }, { status: 409 });
    }

    let geoSubdivisionId: string | null = null;
    let geoBlockId: string | null = null;
    let geoPlaceId: string | null = null;

    if (lgd.subdistrict) {
      const official = await admin.from("geo_lgd_subdistricts").select("lgd_district_code").eq("lgd_subdistrict_code", lgd.subdistrict).eq("is_active", true).maybeSingle();
      if (official.error || !official.data || official.data.lgd_district_code !== lgd.district) {
        return NextResponse.json({ ok: false, error: "The selected subdistrict hierarchy is invalid." }, { status: 400 });
      }
      const canonical = await admin.from("geo_subdivisions").select("id").eq("lgd_code", String(lgd.subdistrict)).eq("district_id", districtCanonical.data.id).maybeSingle();
      if (canonical.error || !canonical.data) return NextResponse.json({ ok: false, error: "The selected subdistrict could not be resolved uniquely." }, { status: 409 });
      geoSubdivisionId = canonical.data.id;
    }

    if (lgd.block) {
      const official = await admin.from("geo_lgd_blocks").select("lgd_district_code").eq("lgd_block_code", lgd.block).eq("is_active", true).maybeSingle();
      if (official.error || !official.data || official.data.lgd_district_code !== lgd.district) {
        return NextResponse.json({ ok: false, error: "The selected block hierarchy is invalid." }, { status: 400 });
      }
      let query = admin.from("geo_blocks").select("id").eq("lgd_code", String(lgd.block)).eq("district_id", districtCanonical.data.id);
      if (geoSubdivisionId) query = query.or(`subdivision_id.eq.${geoSubdivisionId},subdivision_id.is.null`);
      const canonical = await query.limit(2);
      if (canonical.error || canonical.data?.length !== 1) return NextResponse.json({ ok: false, error: "The selected block could not be resolved uniquely within its district." }, { status: 409 });
      geoBlockId = canonical.data[0].id;
    }

    if (lgd.village) {
      const official = await admin.from("geo_lgd_villages").select("lgd_district_code,lgd_subdistrict_code").eq("lgd_village_code", lgd.village).eq("is_active", true).maybeSingle();
      if (official.error || !official.data || official.data.lgd_district_code !== lgd.district || (lgd.subdistrict && official.data.lgd_subdistrict_code !== lgd.subdistrict)) {
        return NextResponse.json({ ok: false, error: "The selected village hierarchy is invalid." }, { status: 400 });
      }
      let query = admin.from("geo_places").select("id").eq("lgd_code", String(lgd.village)).eq("place_type", "VILLAGE").eq("district_id", districtCanonical.data.id);
      if (geoSubdivisionId) query = query.or(`subdivision_id.eq.${geoSubdivisionId},subdivision_id.is.null`);
      if (geoBlockId) query = query.or(`block_id.eq.${geoBlockId},block_id.is.null`);
      const canonical = await query.limit(2);
      if (canonical.error || canonical.data?.length !== 1) return NextResponse.json({ ok: false, error: "The selected village could not be resolved uniquely." }, { status: 409 });
      geoPlaceId = canonical.data[0].id;
    }

    if (mode === "urban" && lgd.localBody) {
      const mapping = await admin.from("geo_lgd_local_body_districts").select("lgd_local_body_code").eq("lgd_local_body_code", lgd.localBody).eq("lgd_district_code", lgd.district).maybeSingle();
      if (mapping.error || !mapping.data) return NextResponse.json({ ok: false, error: "The selected urban local-body hierarchy is invalid." }, { status: 400 });
    }
    if (mode === "urban" && lgd.ward) {
      const ward = await admin.from("geo_lgd_wards").select("lgd_local_body_code").eq("lgd_ward_code", lgd.ward).eq("is_active", true).maybeSingle();
      if (ward.error || !ward.data || ward.data.lgd_local_body_code !== lgd.localBody) return NextResponse.json({ ok: false, error: "The selected ward hierarchy is invalid." }, { status: 400 });
    }

    return NextResponse.json({ ok: true, geography: {
      geo_state_id: stateCanonical.data.id,
      geo_district_id: districtCanonical.data.id,
      geo_subdivision_id: geoSubdivisionId,
      geo_block_id: mode === "rural" ? geoBlockId : null,
      geo_place_id: mode === "rural" ? geoPlaceId : null,
    }});
  } catch {
    return NextResponse.json({ ok: false, error: "Geography resolution failed safely." }, { status: 500 });
  }
}
