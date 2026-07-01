import type { DemandAroundMe, MosCompetitionLevel, MosGeographyMode } from "./types";
import { getVendorBusinessProfile } from "./repositories/business";
import { getDemandRfqsForProfile } from "./repositories/rfqs";
import { countVendorsForProfile } from "./repositories/supply";
import { buildDemandMetrics, analyzeGap, buildGrowthScore } from "@/lib/marketplace/intelligence";
import { buildMarketHealth } from "./market-health";
import { buildMosOpportunities } from "./opportunity-engine";

function pickMode(profile: any): MosGeographyMode {
  if (profile?.geo_place_id) return "place";
  if (profile?.geo_block_id) return "block";
  if (profile?.geo_subdivision_id) return "subdivision";
  if (profile?.geo_district_id || profile?.district) return "district";
  return "state";
}

function competitionFromVendors(count: number): MosCompetitionLevel {
  if (count >= 25) return "high";
  if (count >= 8) return "medium";
  return "low";
}

function topByCount(rows: any[], key: string) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = String(row?.[key] || "").trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

export async function getDemandAroundMe(params: {
  supabase: any;
  userId: string;
}): Promise<DemandAroundMe> {
  const profile = await getVendorBusinessProfile(params.supabase, params.userId);
  const rfqs = profile ? await getDemandRfqsForProfile(params.supabase, profile) : [];
  const nearbyVendors = profile ? await countVendorsForProfile(params.supabase, profile) : 0;

  const today = new Date().toISOString().slice(0, 10);
  const todayRfqs = rfqs.filter((row: any) =>
    String(row.created_at || "").startsWith(today)
  ).length;

  const buyers = new Set(
    rfqs.map((row: any) => row.requester_user_id).filter(Boolean)
  );

  const estimatedMarketValue = rfqs.reduce(
    (sum: number, row: any) => sum + Number(row.estimated_value || 0),
    0
  );

  const fastestGrowingCategory = topByCount(rfqs, "module");
  const highestDemandArea =
    topByCount(rfqs, "locality") ||
    topByCount(rfqs, "city") ||
    profile?.locality ||
    profile?.city ||
    profile?.district;

  const activeRfqs = rfqs.length;
  const demandMetrics = buildDemandMetrics({
    searches: 0,
    rfqs: activeRfqs,
    enquiries: buyers.size,
  });
  const supplyScore = Math.min(100, nearbyVendors * 4);
  const gap = analyzeGap(demandMetrics.score, supplyScore);
  const growth = buildGrowthScore(demandMetrics.score, supplyScore);
  const opportunityScore = gap.opportunityScore;
  const marketHealth = buildMarketHealth({
    demandScore: demandMetrics.score,
    supplyScore,
    opportunityScore,
    vendorCount: nearbyVendors,
    rfqCount: activeRfqs,
  });

  const opportunities = buildMosOpportunities({
    activeRfqs,
    todayRfqs,
    activeBuyers: buyers.size,
    estimatedMarketValue,
    fastestGrowingCategory,
    opportunityScore,
    nearbyVendors,
  });

  return {
    generatedAt: new Date().toISOString(),
    geography: {
      state: profile?.state || undefined,
      district: profile?.district || undefined,
      block: undefined,
      place: profile?.locality || profile?.city || undefined,
      radiusKm: Number(profile?.service_radius_km || 25),
      mode: pickMode(profile),
    },
    demand: {
      todayRfqs,
      activeBuyers: buyers.size,
      estimatedMarketValue,
      fastestGrowingCategory,
      highestDemandArea,
    },
    supply: {
      nearbyVendors,
      competition: competitionFromVendors(nearbyVendors),
    },
    opportunity: {
      score: opportunityScore,
      summary:
        activeRfqs > 0
          ? `${activeRfqs} active demand signals found. Market health is ${marketHealth.level}; growth is ${growth.level}.`
          : marketHealth.summary,
    },
    recommendation: {
      title: opportunities[0]?.title || "Keep your profile and inventory ready",
      description:
        opportunities[0]?.description ||
        "As new RFQs appear around your area, this panel will recommend actions.",
    },
  };
}
