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
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || 200), 1), 500);
  const offset = Math.max(Number(searchParams.get("offset") || 0), 0);

  try {
    if (type === "states") {
      const { data, error } = await supabase
        .from("geo_states")
        .select("id,name,slug")
        .eq("is_active", true)
        .order("name", { ascending: true })
        .range(offset, offset + limit);

      if (error) throw error;
      return pagedResponse(data, limit, offset);
    }

    if (type === "districts") {
      let query = supabase
        .from("geo_districts")
        .select("id,name,slug,state_id")
        .eq("is_active", true)
        .order("name", { ascending: true })
        .range(offset, offset + limit);

      if (stateId) query = query.eq("state_id", stateId);
      if (q) query = query.ilike("name", `%${q}%`);

      const { data, error } = await query;
      if (error) throw error;
      return pagedResponse(data, limit, offset);
    }

    if (type === "subdivisions") {
      let query = supabase
        .from("geo_subdivisions")
        .select("id,name,slug,district_id")
        .eq("is_active", true)
        .order("name", { ascending: true })
        .range(offset, offset + limit);

      if (districtId) query = query.eq("district_id", districtId);
      if (q) query = query.ilike("name", `%${q}%`);

      const { data, error } = await query;
      if (error) throw error;
      return pagedResponse(data, limit, offset);
    }

    if (type === "blocks") {
      let query = supabase
        .from("geo_blocks")
        .select("id,name,slug,district_id,subdivision_id")
        .eq("is_active", true)
        .order("name", { ascending: true })
        .range(offset, offset + limit);

      if (districtId) query = query.eq("district_id", districtId);
      if (subdivisionId) query = query.eq("subdivision_id", subdivisionId);
      if (q) query = query.ilike("name", `%${q}%`);

      const { data, error } = await query;
      if (error) throw error;
      return pagedResponse(data, limit, offset);
    }

    if (type === "places") {
      let query = supabase
        .from("geo_places")
        .select("id,name,slug,district_id,subdivision_id,block_id,pincode,place_type")
        .eq("is_active", true)
        .order("name", { ascending: true })
        .range(offset, offset + limit);

      if (districtId) query = query.eq("district_id", districtId);
      if (subdivisionId) query = query.eq("subdivision_id", subdivisionId);
      if (blockId) query = query.eq("block_id", blockId);
      if (q) query = query.ilike("name", `%${q}%`);

      const { data, error } = await query;
      if (error) throw error;
      return pagedResponse(data, limit, offset);
    }

    return NextResponse.json({ options: [], hasMore: false, nextOffset: offset });
  } catch (error: any) {
    return NextResponse.json(
      { options: [], hasMore: false, nextOffset: offset, error: error?.message || "Failed to load geography options" },
      { status: 500 }
    );
  }
}
