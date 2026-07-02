import type { AmeSignal } from "@/lib/marketplace/executive/types";

export async function getMosOpportunitySignals(params: {
  supabase: any;
  limit?: number;
}): Promise<AmeSignal[]> {
  const limit = Math.min(25, Math.max(1, Number(params.limit || 10)));

  const { data: zones, error } = await params.supabase
    .from("marketplace_opportunity_zones")
    .select("id,module,category,opportunity_score,priority,recommendation,geo_state_id,geo_district_id,geo_place_id")
    .order("opportunity_score", { ascending: false })
    .limit(limit);

  if (error || !Array.isArray(zones)) {
    return [];
  }

  return zones.map((zone: any) => ({
    source: "mos",
    title: `${zone.category || zone.module || "Marketplace"} opportunity zone`,
    score: Number(zone.opportunity_score || 0),
    confidence: Number(zone.opportunity_score || 0),
    category: zone.category || zone.module || null,
    location: zone.geo_place_id || zone.geo_district_id || zone.geo_state_id || null,
    metadata: {
      zone_id: zone.id,
      module: zone.module,
      priority: zone.priority,
      recommendation: zone.recommendation,
      geo_state_id: zone.geo_state_id,
      geo_district_id: zone.geo_district_id,
      geo_place_id: zone.geo_place_id,
    },
  }));
}
