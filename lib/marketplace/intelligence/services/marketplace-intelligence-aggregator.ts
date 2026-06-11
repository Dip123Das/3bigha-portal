import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

import { buildDemandMetrics } from "@/lib/marketplace/intelligence/demand-engine";
import { buildSupplyMetrics } from "@/lib/marketplace/intelligence/supply-engine";
import { analyzeGap } from "@/lib/marketplace/intelligence/gap-analysis-engine";
import { buildOpportunitySignal } from "@/lib/marketplace/intelligence/opportunity-engine";
import { buildVendorRecruitmentTarget } from "@/lib/marketplace/intelligence/vendor-recruitment-engine";
import { buildGrowthScore } from "@/lib/marketplace/intelligence/growth-score-engine";
import { buildExpansionRecommendation } from "@/lib/marketplace/intelligence/expansion-recommendation-engine";

export interface MarketplaceIntelligenceSummary {
  demandSignals: number;
  supplySignals: number;
  gapAnalyses: number;
  opportunityZones: number;
  warnings: string[];
  generatedAt: string;
}

type GeoKey = {
  geo_state_id: string | null;
  geo_district_id: string | null;
  geo_subdivision_id: string | null;
  geo_block_id: string | null;
  geo_place_id: string | null;
};

const MODULES = [
  { module: "property", rfqModule: "properties", listingTable: "property_listings" },
  { module: "materials", rfqModule: "materials", listingTable: "material_listings" },
  { module: "services", rfqModule: "services", listingTable: "service_listings" },
  { module: "rentals", rfqModule: "rentals", listingTable: "rental_listings" },
] as const;

const EMPTY_UUID = "00000000-0000-0000-0000-000000000000";

function geoSignature(row: GeoKey) {
  return [
    row.geo_state_id || "",
    row.geo_district_id || "",
    row.geo_subdivision_id || "",
    row.geo_block_id || "",
    row.geo_place_id || "",
  ].join("|");
}

function emptyGeo(): GeoKey {
  return {
    geo_state_id: null,
    geo_district_id: null,
    geo_subdivision_id: null,
    geo_block_id: null,
    geo_place_id: null,
  };
}

function cleanGeo(row: GeoKey): GeoKey {
  return {
    geo_state_id: row.geo_state_id || null,
    geo_district_id: row.geo_district_id || null,
    geo_subdivision_id: row.geo_subdivision_id || null,
    geo_block_id: row.geo_block_id || null,
    geo_place_id: row.geo_place_id || null,
  };
}

async function countRows(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  table: string
) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });

  if (error) return 0;
  return count || 0;
}

async function countRfqs(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  module: string
) {
  const { count, error } = await supabase
    .from("rfqs")
    .select("id", { count: "exact", head: true })
    .eq("module", module);

  if (error) return 0;
  return count || 0;
}

async function loadListingGeoCounts(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  table: string
) {
  const { data, error } = await supabase
    .from(table)
    .select("geo_state_id,geo_district_id,geo_subdivision_id,geo_block_id,geo_place_id")
    .not("geo_state_id", "is", null)
    .limit(1000);

  if (error || !data) return new Map<string, GeoKey & { listings: number }>();

  const map = new Map<string, GeoKey & { listings: number }>();

  for (const row of data as GeoKey[]) {
    const key = geoSignature(row);
    const existing = map.get(key);

    if (existing) {
      existing.listings += 1;
    } else {
      map.set(key, {
        geo_state_id: row.geo_state_id || null,
        geo_district_id: row.geo_district_id || null,
        geo_subdivision_id: row.geo_subdivision_id || null,
        geo_block_id: row.geo_block_id || null,
        geo_place_id: row.geo_place_id || null,
        listings: 1,
      });
    }
  }

  return map;
}

async function loadVendorGeoCounts(
  supabase: ReturnType<typeof getSupabaseAdmin>
) {
  const { data, error } = await supabase
    .from("business_profiles")
    .select("geo_state_id,geo_district_id,geo_subdivision_id,geo_block_id,geo_place_id")
    .not("geo_state_id", "is", null)
    .limit(1000);

  if (error || !data) return new Map<string, GeoKey & { vendors: number }>();

  const map = new Map<string, GeoKey & { vendors: number }>();

  for (const row of data as GeoKey[]) {
    const key = geoSignature(row);
    const existing = map.get(key);

    if (existing) {
      existing.vendors += 1;
    } else {
      map.set(key, {
        geo_state_id: row.geo_state_id || null,
        geo_district_id: row.geo_district_id || null,
        geo_subdivision_id: row.geo_subdivision_id || null,
        geo_block_id: row.geo_block_id || null,
        geo_place_id: row.geo_place_id || null,
        vendors: 1,
      });
    }
  }

  return map;
}

async function loadRfqGeoCounts(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  module: string
) {
  const { data, error } = await supabase
    .from("rfqs")
    .select("geo_state_id,geo_district_id,geo_subdivision_id,geo_block_id,geo_place_id")
    .eq("module", module)
    .not("geo_state_id", "is", null)
    .limit(1000);

  if (error || !data) {
    return new Map<string, GeoKey & { rfqs: number }>();
  }

  const map = new Map<string, GeoKey & { rfqs: number }>();

  for (const row of data as GeoKey[]) {
    const key = geoSignature(row);
    const existing = map.get(key);

    if (existing) {
      existing.rfqs += 1;
    } else {
      map.set(key, {
        geo_state_id: row.geo_state_id || null,
        geo_district_id: row.geo_district_id || null,
        geo_subdivision_id: row.geo_subdivision_id || null,
        geo_block_id: row.geo_block_id || null,
        geo_place_id: row.geo_place_id || null,
        rfqs: 1,
      });
    }
  }

  return map;
}

async function insertSignalSet(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  input: {
    module: string;
    category: string;
    geo: GeoKey;
    rfqs: number;
    searches: number;
    enquiries: number;
    vendors: number;
    listings: number;
  }
) {
  const demand = buildDemandMetrics({
    searches: input.searches,
    rfqs: input.rfqs,
    enquiries: input.enquiries,
  });

  const supply = buildSupplyMetrics({
    vendors: input.vendors,
    listings: input.listings,
  });

  const gap = analyzeGap(demand.score, supply.score);
  const opportunity = buildOpportunitySignal(demand.score, supply.score);
  const recruitment = buildVendorRecruitmentTarget(
    input.module,
    demand.score,
    supply.score
  );

  const growth = buildGrowthScore(
    demand.score,
    supply.score
  );

  const expansion = buildExpansionRecommendation(
    input.module,
    growth.score,
    recruitment.shortageScore
  );

  const now = new Date().toISOString();
  const geo = cleanGeo(input.geo);

  const demandRes = await supabase.from("marketplace_demand_signals").insert({
    ...geo,
    module: input.module,
    category: input.category,
    searches: demand.searches,
    rfqs: demand.rfqs,
    enquiries: demand.enquiries,
    demand_score: demand.score,
    demand_level: demand.level,
    updated_at: now,
  });

  const supplyRes = await supabase.from("marketplace_supply_signals").insert({
    ...geo,
    module: input.module,
    category: input.category,
    vendors: supply.vendors,
    listings: supply.listings,
    supply_score: supply.score,
    supply_level: supply.level,
    updated_at: now,
  });

  const gapRes = await supabase.from("marketplace_gap_analysis").insert({
    ...geo,
    module: input.module,
    category: input.category,
    demand_score: gap.demand,
    supply_score: gap.supply,
    gap_score: gap.gap,
    opportunity_score: gap.opportunityScore,
    classification: gap.classification,
    updated_at: now,
  });

  const recommendationText = opportunity.recommendation + " Suggested recruitment: " + recruitment.recommendedVendorCount + " vendors. Priority: " + recruitment.priority + ".";

  const opportunityRes = await supabase.from("marketplace_opportunity_zones").insert({
    ...geo,
    module: input.module,
    category: input.category,
    opportunity_score: opportunity.opportunityScore,
    priority: opportunity.priority,
    kind: opportunity.kind,
    recommendation: recommendationText,
    updated_at: now,
  });

  const recruitmentRes = recruitment.shortageScore >= 20
    ? await supabase.from("marketplace_vendor_recruitment_queue").insert({
        ...geo,
        module: input.module,
        category: input.category,
        opportunity_score: opportunity.opportunityScore,
        shortage_score: recruitment.shortageScore,
        recommended_vendor_count: recruitment.recommendedVendorCount,
        priority: recruitment.priority,
        reason: recommendationText,
        status: "pending",
        updated_at: now,
      })
    : { error: null };

  const growthRes = await supabase.from("marketplace_growth_scores").insert({
    ...geo,
    module: input.module,
    category: input.category,
    growth_score: growth.score,
    growth_level: growth.level,
    updated_at: now,
  });

  const expansionRes = await supabase.from("marketplace_expansion_recommendations").insert({
    ...geo,
    module: input.module,
    category: input.category,
    growth_score: growth.score,
    shortage_score: recruitment.shortageScore,
    expansion_score: expansion.score,
    recommendation: expansion.recommendation,
    reason: expansion.reason,
    updated_at: now,
  });

  const vendorExpansionRes = expansion.recommendation === "expand"
    ? await supabase.from("marketplace_vendor_expansion_targets").insert({
        ...geo,
        module: input.module,
        category: input.category,
        expansion_score: expansion.score,
        growth_score: growth.score,
        shortage_score: recruitment.shortageScore,
        recommended_vendor_count: recruitment.recommendedVendorCount,
        source_vendor_scope: geo.geo_district_id ? "district" : "state",
        action_status: "pending",
        reason: expansion.reason,
        updated_at: now,
      })
    : { error: null };

  return {
    demand: demandRes.error ? 0 : 1,
    supply: supplyRes.error ? 0 : 1,
    gap: gapRes.error ? 0 : 1,
    opportunity: opportunityRes.error ? 0 : 1,
    warnings: [
      demandRes.error ? `demand:${input.module}:${demandRes.error.message}` : "",
      supplyRes.error ? `supply:${input.module}:${supplyRes.error.message}` : "",
      gapRes.error ? `gap:${input.module}:${gapRes.error.message}` : "",
      opportunityRes.error ? `opportunity:${input.module}:${opportunityRes.error.message}` : "",
      recruitmentRes.error ? `recruitment:${input.module}:${recruitmentRes.error.message}` : "",
      growthRes.error ? `growth:${input.module}:${growthRes.error.message}` : "",
      expansionRes.error ? `expansion:${input.module}:${expansionRes.error.message}` : "",
      vendorExpansionRes.error ? `vendorExpansion:${input.module}:${vendorExpansionRes.error.message}` : "",
    ].filter(Boolean),
  };
}

export async function aggregateMarketplaceIntelligence(): Promise<MarketplaceIntelligenceSummary> {
  const supabase = getSupabaseAdmin();

  await Promise.all([
    supabase.from("marketplace_vendor_expansion_targets").delete().neq("id", EMPTY_UUID),
    supabase.from("marketplace_expansion_recommendations").delete().neq("id", EMPTY_UUID),
    supabase.from("marketplace_growth_scores").delete().neq("id", EMPTY_UUID),
    supabase.from("marketplace_vendor_recruitment_queue").delete().neq("id", EMPTY_UUID),
    supabase.from("marketplace_opportunity_zones").delete().neq("id", EMPTY_UUID),
    supabase.from("marketplace_gap_analysis").delete().neq("id", EMPTY_UUID),
    supabase.from("marketplace_supply_signals").delete().neq("id", EMPTY_UUID),
    supabase.from("marketplace_demand_signals").delete().neq("id", EMPTY_UUID),
  ]);

  const vendorCount = await countRows(supabase, "business_profiles");
  const vendorGeoCounts = await loadVendorGeoCounts(supabase);

  let demandSignals = 0;
  let supplySignals = 0;
  let gapAnalyses = 0;
  let opportunityZones = 0;
  const warnings: string[] = [];

  for (const item of MODULES) {
    const rfqs = await countRfqs(supabase, item.rfqModule);
    const listings = await countRows(supabase, item.listingTable);

    const moduleLevel = await insertSignalSet(supabase, {
      module: item.module,
      category: "all",
      geo: emptyGeo(),
      searches: 0,
      rfqs,
      enquiries: 0,
      vendors: item.module === "property" ? 0 : vendorCount,
      listings,
    });

    demandSignals += moduleLevel.demand;
    supplySignals += moduleLevel.supply;
    gapAnalyses += moduleLevel.gap;
    opportunityZones += moduleLevel.opportunity;
    warnings.push(...moduleLevel.warnings);

    const listingGeoCounts = await loadListingGeoCounts(supabase, item.listingTable);
    const rfqGeoCounts = await loadRfqGeoCounts(supabase, item.rfqModule);

    for (const [key, geoListing] of listingGeoCounts.entries()) {
      const vendorGeo = vendorGeoCounts.get(key);

      const geoLevel = await insertSignalSet(supabase, {
        module: item.module,
        category: "all",
        geo: geoListing,
        searches: 0,
        rfqs: rfqGeoCounts.get(key)?.rfqs || 0,
        enquiries: 0,
        vendors: item.module === "property" ? 0 : vendorGeo?.vendors || 0,
        listings: geoListing.listings,
      });

      demandSignals += geoLevel.demand;
      supplySignals += geoLevel.supply;
      gapAnalyses += geoLevel.gap;
      opportunityZones += geoLevel.opportunity;
      warnings.push(...geoLevel.warnings);
    }
  }

  return {
    demandSignals,
    supplySignals,
    gapAnalyses,
    opportunityZones,
    warnings: warnings.slice(0, 25),
    generatedAt: new Date().toISOString(),
  };
}
