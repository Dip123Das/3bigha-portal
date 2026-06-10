import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const [
    states,
    districts,
    subdivisions,
    blocks,
    places,
  ] = await Promise.all([
    supabase
      .from("geo_states")
      .select("id,name,slug,is_active,sort_order")
      .order("name", { ascending: true }),

    supabase
      .from("geo_districts")
      .select("id,state_id,name,slug,is_active,sort_order")
      .order("name", { ascending: true }),

    supabase
      .from("geo_subdivisions")
      .select("id,district_id,name,slug,subdivision_type,is_active,sort_order")
      .order("name", { ascending: true }),

    supabase
      .from("geo_blocks")
      .select("id,district_id,subdivision_id,name,slug,block_type,is_active,sort_order")
      .order("name", { ascending: true }),

    supabase
      .from("geo_places")
      .select("id,district_id,subdivision_id,block_id,name,slug,place_type,pincode,is_active,is_verified,sort_order")
      .order("name", { ascending: true })
      .limit(500),
  ]);

  return NextResponse.json({
    ok: true,
    errors: {
      states: states.error?.message ?? null,
      districts: districts.error?.message ?? null,
      subdivisions: subdivisions.error?.message ?? null,
      blocks: blocks.error?.message ?? null,
      places: places.error?.message ?? null,
    },
    data: {
      states: states.data ?? [],
      districts: districts.data ?? [],
      subdivisions: subdivisions.data ?? [],
      blocks: blocks.data ?? [],
      places: places.data ?? [],
    },
  });
}
