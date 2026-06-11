import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function geoName(map: Map<string, string>, id?: string | null) {
  if (!id) return "";
  return map.get(String(id)) || "";
}

async function loadGeoNameMap(table: string) {
  const { data } = await supabase.from(table).select("id,name").limit(1000);
  const map = new Map<string, string>();
  for (const row of data || []) {
    if (row?.id && row?.name) map.set(String(row.id), String(row.name));
  }
  return map;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const module = searchParams.get("module");

  if (!["property", "materials", "services", "rentals"].includes(String(module))) {
    return NextResponse.json({ ok: false, rows: [] });
  }

  const [targetsRes, states, districts, places] = await Promise.all([
    supabase
      .from("marketplace_vendor_recruitment_queue")
      .select("id,module,category,recommended_vendor_count,priority,geo_state_id,geo_district_id,geo_place_id")
      .eq("module", module)
      .not("geo_state_id", "is", null)
      .order("recommended_vendor_count", { ascending: false })
      .limit(3),
    loadGeoNameMap("geo_states"),
    loadGeoNameMap("geo_districts"),
    loadGeoNameMap("geo_places"),
  ]);

  const rows = (targetsRes.data || []).map((row) => {
    const location =
      geoName(places, row.geo_place_id) ||
      geoName(districts, row.geo_district_id) ||
      geoName(states, row.geo_state_id) ||
      "Active location";

    return {
      id: row.id,
      module: row.module,
      category: row.category,
      vendorsNeeded: Number(row.recommended_vendor_count || 0),
      priority: row.priority,
      location,
      district: geoName(districts, row.geo_district_id),
      state: geoName(states, row.geo_state_id),
    };
  });

  return NextResponse.json({ ok: true, rows });
}
