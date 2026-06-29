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
      let query = supabase
        .from("geo_lgd_blocks")
        .select("lgd_block_code,lgd_district_code,name_en,slug")
        .eq("is_active", true)
        .order("name_en", { ascending: true })
        .range(offset, offset + limit);

      if (districtId) query = query.eq("lgd_district_code", Number(districtId));
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