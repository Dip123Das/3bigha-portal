import { createMarketplaceOpportunityEvent, getDemandAroundMe } from "@/lib/marketplace/mos";

export async function generateAutonomousMarketplaceOpportunities(params: {
  supabase: any;
  limit?: number;
}) {
  const limit = Math.min(25, Math.max(1, Number(params.limit || 10)));

  const { data: zones, error } = await params.supabase
    .from("marketplace_opportunity_zones")
    .select("id,module,category,opportunity_score,priority,recommendation,geo_state_id,geo_district_id,geo_subdivision_id,geo_block_id,geo_place_id")
    .order("opportunity_score", { ascending: false })
    .limit(limit);

  if (error || !Array.isArray(zones)) {
    return {
      ok: false,
      generated: 0,
      error: error?.message || "No opportunity zones found",
    };
  }

  let generated = 0;
  const results: any[] = [];
  const processedUsers = new Set<string>();

  for (const zone of zones) {
    let vendorQuery = params.supabase
      .from("business_profiles")
      .select("user_id")
      .not("user_id", "is", null)
      .limit(10);

    if (zone.geo_place_id) vendorQuery = vendorQuery.eq("geo_place_id", zone.geo_place_id);
    else if (zone.geo_block_id) vendorQuery = vendorQuery.eq("geo_block_id", zone.geo_block_id);
    else if (zone.geo_district_id) vendorQuery = vendorQuery.eq("geo_district_id", zone.geo_district_id);
    else if (zone.geo_state_id) vendorQuery = vendorQuery.eq("geo_state_id", zone.geo_state_id);

    const { data: vendors } = await vendorQuery;

    for (const vendor of vendors || []) {
      if (!vendor?.user_id) continue;

      const vendorUserId = String(vendor.user_id);
      if (processedUsers.has(vendorUserId)) continue;
      processedUsers.add(vendorUserId);

      const demandAroundMe = await getDemandAroundMe({
        supabase: params.supabase,
        userId: vendorUserId,
      });

      demandAroundMe.recommendation = {
        title: `${zone.category || zone.module} opportunity detected`,
        description:
          zone.recommendation ||
          `High marketplace opportunity detected for ${zone.category || zone.module}.`,
      };

      demandAroundMe.opportunity.score = Number(zone.opportunity_score || 0);

      const result = await createMarketplaceOpportunityEvent({
        supabase: params.supabase,
        userId: vendorUserId,
        demandAroundMe,
      });

      if (result.created) generated += 1;
      results.push(result);
    }
  }

  return {
    ok: true,
    zones: zones.length,
    generated,
    processedUsers: processedUsers.size,
    results,
  };
}
