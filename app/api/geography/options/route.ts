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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = clean(searchParams.get("type"));
  const stateId = clean(searchParams.get("stateId"));
  const districtId = clean(searchParams.get("districtId"));
  const subdivisionId = clean(searchParams.get("subdivisionId"));
  const blockId = clean(searchParams.get("blockId"));

  try {
    if (type === "states") {
      const { data, error } = await supabase
        .from("geo_states")
        .select("id,name,slug")
        .eq("is_active", true)
        .order("name", { ascending: true })
        .limit(100);

      if (error) throw error;
      return NextResponse.json({ options: data ?? [] });
    }

    if (type === "districts") {
      let query = supabase
        .from("geo_districts")
        .select("id,name,slug,state_id")
        .eq("is_active", true)
        .order("name", { ascending: true })
        .limit(5000);

      if (stateId) query = query.eq("state_id", stateId);

      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ options: data ?? [] });
    }

    if (type === "subdivisions") {
      let query = supabase
        .from("geo_subdivisions")
        .select("id,name,slug,district_id")
        .eq("is_active", true)
        .order("name", { ascending: true })
        .limit(5000);

      if (districtId) query = query.eq("district_id", districtId);

      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ options: data ?? [] });
    }

    if (type === "blocks") {
      let query = supabase
        .from("geo_blocks")
        .select("id,name,slug,district_id,subdivision_id")
        .eq("is_active", true)
        .order("name", { ascending: true })
        .limit(5000);

      if (districtId) query = query.eq("district_id", districtId);
      if (subdivisionId) query = query.eq("subdivision_id", subdivisionId);

      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ options: data ?? [] });
    }

    if (type === "places") {
      let query = supabase
        .from("geo_places")
        .select("id,name,slug,state_id,district_id,subdivision_id,block_id,pincode")
        .eq("is_active", true)
        .order("name", { ascending: true })
        .limit(5000);

      if (stateId) query = query.eq("state_id", stateId);
      if (districtId) query = query.eq("district_id", districtId);
      if (subdivisionId) query = query.eq("subdivision_id", subdivisionId);
      if (blockId) query = query.eq("block_id", blockId);

      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ options: data ?? [] });
    }

    return NextResponse.json({ options: [] });
  } catch (error: any) {
    return NextResponse.json(
      { options: [], error: error?.message || "Failed to load geography options" },
      { status: 500 }
    );
  }
}
