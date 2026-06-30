import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function clean(value: string | null) {
  return String(value || "").trim();
}

function pagedResponse(data: any[] | null, limit: number, offset: number) {
  const rows = data ?? [];
  const options = rows.slice(0, limit);

  return NextResponse.json({
    options,
    hasMore: rows.length > limit,
    nextOffset: offset + options.length,
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = clean(searchParams.get("type"));
  const stateId = clean(searchParams.get("stateId"));
  const districtId = clean(searchParams.get("districtId"));
  const subdivisionId = clean(searchParams.get("subdivisionId"));
  const blockId = clean(searchParams.get("blockId"));
  const localBodyId = clean(searchParams.get("localBodyId"));
  const q = clean(searchParams.get("q"));
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || 50), 1), 100);
  const offset = Math.max(Number(searchParams.get("offset") || 0), 0);

  try {
    if (type === "states") {
      let query = supabase
        .from("geo_lgd_states")
        .select("lgd_state_code,name_en,slug")
        .eq("is_active", true)
        .order("name_en", { ascending: true })
        .range(offset, offset + limit);

      if (q) query = query.ilike("name_en", `%${q}%`);

      const { data, error } = await query;
      if (error) throw error;

      return pagedResponse(
        data?.map((r) => ({
          id: String(r.lgd_state_code),
          name: r.name_en,
          slug: r.slug,
        })) ?? [],
        limit,
        offset
      );
    }

    if (type === "districts") {
      let query = supabase
        .from("geo_lgd_districts")
        .select("lgd_district_code,lgd_state_code,name_en,slug")
        .eq("is_active", true)
        .order("name_en", { ascending: true })
        .range(offset, offset + limit);

      if (stateId) query = query.eq("lgd_state_code", Number(stateId));
      if (q) query = query.ilike("name_en", `%${q}%`);

      const { data, error } = await query;
      if (error) throw error;

      return pagedResponse(
        data?.map((r) => ({
          id: String(r.lgd_district_code),
          name: r.name_en,
          slug: r.slug,
          state_id: String(r.lgd_state_code),
        })) ?? [],
        limit,
        offset
      );
    }

    if (type === "subdivisions") {
      let query = supabase
        .from("geo_lgd_subdistricts")
        .select("lgd_subdistrict_code,lgd_district_code,name_en,slug")
        .eq("is_active", true)
        .order("name_en", { ascending: true })
        .range(offset, offset + limit);

      if (districtId) query = query.eq("lgd_district_code", Number(districtId));
      if (q) query = query.ilike("name_en", `%${q}%`);

      const { data, error } = await query;
      if (error) throw error;

      return pagedResponse(
        data?.map((r) => ({
          id: String(r.lgd_subdistrict_code),
          name: r.name_en,
          slug: r.slug,
          district_id: String(r.lgd_district_code),
        })) ?? [],
        limit,
        offset
      );
    }

    if (type === "blocks") {
      let blockCodes: number[] | null = null;

      if (subdivisionId) {
        const { data: villageRows, error: villageError } = await supabase
          .from("geo_lgd_villages")
          .select("lgd_village_code")
          .eq("is_active", true)
          .eq("lgd_subdistrict_code", Number(subdivisionId))
          .limit(20000);

        if (villageError) throw villageError;

        const villageCodes = (villageRows || [])
          .map((r) => r.lgd_village_code)
          .filter(Boolean);

        if (!villageCodes.length) {
          return pagedResponse([], limit, offset);
        }

        const { data: linkRows, error: linkError } = await supabase
          .from("geo_lgd_block_villages")
          .select("lgd_block_code")
          .in("lgd_village_code", villageCodes)
          .limit(20000);

        if (linkError) throw linkError;

        blockCodes = Array.from(
          new Set((linkRows || []).map((r) => r.lgd_block_code).filter(Boolean))
        );

        if (!blockCodes.length) {
          return pagedResponse([], limit, offset);
        }
      }

      let query = supabase
        .from("geo_lgd_blocks")
        .select("lgd_block_code,lgd_district_code,name_en,slug")
        .eq("is_active", true)
        .order("name_en", { ascending: true })
        .range(offset, offset + limit);

      if (districtId) query = query.eq("lgd_district_code", Number(districtId));
      if (blockCodes) query = query.in("lgd_block_code", blockCodes);
      if (q) query = query.ilike("name_en", `%${q}%`);

      const { data, error } = await query;
      if (error) throw error;

      return pagedResponse(
        data?.map((r) => ({
          id: String(r.lgd_block_code),
          name: r.name_en,
          slug: r.slug,
          district_id: String(r.lgd_district_code),
        })) ?? [],
        limit,
        offset
      );
    }


    if (type === "localBodies") {
      let localBodyCodes: number[] | null = null;

      if (districtId) {
        const { data: mappingRows, error: mappingError } = await supabase
          .from("geo_lgd_local_body_districts")
          .select("lgd_local_body_code")
          .eq("lgd_district_code", Number(districtId))
          .limit(20000);

        if (mappingError) throw mappingError;

        localBodyCodes = Array.from(
          new Set((mappingRows || []).map((r) => r.lgd_local_body_code).filter(Boolean))
        );

        if (!localBodyCodes.length) return pagedResponse([], limit, offset);
      }

      let query = supabase
        .from("geo_lgd_local_bodies")
        .select("lgd_local_body_code,name_en,slug,local_body_type_name,local_body_category")
        .eq("is_active", true)
        .eq("local_body_category", "URBAN")
        .order("name_en", { ascending: true })
        .range(offset, offset + limit);

      if (localBodyCodes) query = query.in("lgd_local_body_code", localBodyCodes);
      if (q) query = query.ilike("name_en", `%${q}%`);

      const { data, error } = await query;
      if (error) throw error;

      return pagedResponse(
        data?.map((r) => ({
          id: String(r.lgd_local_body_code),
          name: r.name_en,
          slug: r.slug,
          place_type: r.local_body_type_name,
        })) ?? [],
        limit,
        offset
      );
    }

    if (type === "wards") {
      let query = supabase
        .from("geo_lgd_wards")
        .select("lgd_ward_code,lgd_local_body_code,ward_name_en,ward_number,slug")
        .eq("is_active", true)
        .order("ward_number", { ascending: true })
        .range(offset, offset + limit);

      if (localBodyId) query = query.eq("lgd_local_body_code", Number(localBodyId));
      if (q) query = query.ilike("ward_name_en", `%${q}%`);

      const { data, error } = await query;
      if (error) throw error;

      return pagedResponse(
        data?.map((r) => ({
          id: String(r.lgd_ward_code),
          name: r.ward_name_en,
          slug: r.slug,
          block_id: String(r.lgd_local_body_code),
          place_type: "WARD",
        })) ?? [],
        limit,
        offset
      );
    }

    if (type === "villages") {
      let villageCodes: number[] | null = null;

      if (blockId) {
        const { data: linkRows, error: linkError } = await supabase
          .from("geo_lgd_block_villages")
          .select("lgd_village_code")
          .eq("lgd_block_code", Number(blockId))
          .limit(20000);

        if (linkError) throw linkError;

        villageCodes = (linkRows || [])
          .map((r) => r.lgd_village_code)
          .filter(Boolean);

        if (!villageCodes.length) {
          return pagedResponse([], limit, offset);
        }
      }

      let query = supabase
        .from("geo_lgd_villages")
        .select("lgd_village_code,lgd_district_code,lgd_subdistrict_code,name_en,slug,village_status")
        .eq("is_active", true)
        .order("name_en", { ascending: true })
        .range(offset, offset + limit);

      if (districtId) query = query.eq("lgd_district_code", Number(districtId));
      if (subdivisionId) query = query.eq("lgd_subdistrict_code", Number(subdivisionId));
      if (villageCodes) query = query.in("lgd_village_code", villageCodes);
      if (q) query = query.ilike("name_en", `%${q}%`);

      const { data, error } = await query;
      if (error) throw error;

      return pagedResponse(
        data?.map((r) => ({
          id: String(r.lgd_village_code),
          name: r.name_en,
          slug: r.slug,
          district_id: String(r.lgd_district_code),
          subdivision_id: String(r.lgd_subdistrict_code),
          block_id: blockId || null,
          place_type: r.village_status || "VILLAGE",
        })) ?? [],
        limit,
        offset
      );
    }

    if (type === "places") {
      let query = supabase
        .from("geo_lgd_settlements")
        .select("settlement_key,name_en,slug,settlement_type,lgd_district_code,lgd_subdistrict_code,lgd_block_code")
        .eq("is_active", true)
        .order("name_en", { ascending: true })
        .range(offset, offset + limit);

      if (districtId) query = query.eq("lgd_district_code", Number(districtId));
      if (subdivisionId) query = query.eq("lgd_subdistrict_code", Number(subdivisionId));
      if (blockId) query = query.eq("lgd_block_code", Number(blockId));
      if (q) query = query.ilike("name_en", `%${q}%`);

      const { data, error } = await query;
      if (error) throw error;

      return pagedResponse(
        data?.map((r) => ({
          id: r.settlement_key,
          name: r.name_en,
          slug: r.slug,
          district_id: r.lgd_district_code ? String(r.lgd_district_code) : null,
          subdivision_id: r.lgd_subdistrict_code ? String(r.lgd_subdistrict_code) : null,
          block_id: r.lgd_block_code ? String(r.lgd_block_code) : null,
          place_type: r.settlement_type,
        })) ?? [],
        limit,
        offset
      );
    }

    return NextResponse.json({ options: [], hasMore: false, nextOffset: offset });
  } catch (error: any) {
    return NextResponse.json(
      { options: [], hasMore: false, nextOffset: offset, error: error?.message || "Failed" },
      { status: 500 }
    );
  }
}