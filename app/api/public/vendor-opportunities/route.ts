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

  const [promotionRes, fallbackRes, states, districts, places] = await Promise.all([
    supabase
      .from("marketplace_promotion_intelligence")
      .select("id,module,category,promotion_score,promotion_type,shortage_score,geo_state_id,geo_district_id,geo_place_id")
      .eq("module", module)
      .not("geo_state_id", "is", null)
      .order("promotion_rank", { ascending: true })
      .limit(3),
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

  const sourceRows =
    promotionRes.data && promotionRes.data.length
      ? promotionRes.data.map((row: any) => ({
          ...row,
          vendorsNeeded: Math.max(1, Math.round(Number(row.shortage_score || 0) / 10)),
          priority:
            row.promotion_type === "featured"
              ? "critical"
              : row.promotion_type === "promoted"
              ? "high"
              : "medium",
          promotionType: row.promotion_type,
          promotionScore: row.promotion_score,
        }))
      : (fallbackRes.data || []).map((row: any) => ({
          ...row,
          vendorsNeeded: Number(row.recommended_vendor_count || 0),
          promotionType: null,
          promotionScore: null,
        }));

  const rows = sourceRows.map((row: any) => {
    const location =
      geoName(places, row.geo_place_id) ||
      geoName(districts, row.geo_district_id) ||
      geoName(states, row.geo_state_id) ||
      "Active location";

    return {
      id: row.id,
      module: row.module,
      category: row.category,
      vendorsNeeded: Number(row.vendorsNeeded || 0),
      priority: row.priority,
      promotionType: row.promotionType,
      promotionScore: row.promotionScore,
      location,
      district: geoName(districts, row.geo_district_id),
      state: geoName(states, row.geo_state_id),
    };
  });

  return NextResponse.json({ ok: true, rows });
}
