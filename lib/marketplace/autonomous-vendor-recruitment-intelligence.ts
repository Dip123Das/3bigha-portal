import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { calculateMarketplaceSelfOptimization } from "@/lib/marketplace/self-optimization-engine";

type RecruitmentRow = {
  id: string;
  module: string;
  category: string | null;
  opportunity_score: number | null;
  shortage_score: number | null;
  geo_state_id: string | null;
  geo_district_id: string | null;
  geo_subdivision_id: string | null;
  geo_block_id: string | null;
  geo_place_id: string | null;
};

type ConversionEvent = {
  event_type: string;
  module: string | null;
  category: string | null;
  geo_state_id: string | null;
  geo_district_id: string | null;
  geo_subdivision_id: string | null;
  geo_block_id: string | null;
  geo_place_id: string | null;
};

function geoKey(row: {
  module?: string | null;
  category?: string | null;
  geo_state_id?: string | null;
  geo_district_id?: string | null;
  geo_subdivision_id?: string | null;
  geo_block_id?: string | null;
  geo_place_id?: string | null;
}) {
  return [
    row.module || "unknown",
    row.category || "all",
    row.geo_state_id || "",
    row.geo_district_id || "",
    row.geo_subdivision_id || "",
    row.geo_block_id || "",
    row.geo_place_id || "",
  ].join("|");
}

function decisionFromScore(score: number, firstListings: number, views: number, clicks: number) {
  if (score >= 75 && firstListings > 0) {
    return {
      decision: "recruit_immediately",
      action_priority: "critical",
      recommendation:
        "Recruit immediately. This opportunity has high shortage pressure and proven vendor activation.",
    };
  }

  if (score >= 55 && clicks > 0) {
    return {
      decision: "increase_visibility",
      action_priority: "high",
      recommendation:
        "Increase visibility. The opportunity has strong shortage pressure and early acquisition signals.",
    };
  }

  if (views > 20 && clicks === 0) {
    return {
      decision: "improve_message",
      action_priority: "medium",
      recommendation:
        "Improve opportunity wording or CTA. Views are present but users are not clicking.",
    };
  }

  return {
    decision: "watch",
    action_priority: "normal",
    recommendation: "Monitor this opportunity until more conversion evidence is available.",
  };
}

export async function refreshAutonomousVendorRecruitmentIntelligence() {
  const supabase = getSupabaseAdmin();

  const [{ data: recruitmentRows }, { data: conversionEvents }] = await Promise.all([
    supabase
      .from("marketplace_vendor_recruitment_queue")
      .select(
        "id,module,category,opportunity_score,shortage_score,geo_state_id,geo_district_id,geo_subdivision_id,geo_block_id,geo_place_id"
      )
      .limit(1000),
    supabase
      .from("vendor_conversion_events")
      .select(
        "event_type,module,category,geo_state_id,geo_district_id,geo_subdivision_id,geo_block_id,geo_place_id"
      )
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .limit(10000),
  ]);

  const conversionMap = new Map<
    string,
    {
      views: number;
      clicks: number;
      completed: number;
      approved: number;
      firstListings: number;
    }
  >();

  for (const event of ((conversionEvents || []) as ConversionEvent[])) {
    const key = geoKey(event);
    const current =
      conversionMap.get(key) || {
        views: 0,
        clicks: 0,
        completed: 0,
        approved: 0,
        firstListings: 0,
      };

    if (event.event_type === "opportunity_viewed") current.views += 1;
    if (event.event_type === "opportunity_clicked") current.clicks += 1;
    if (event.event_type === "registration_completed") current.completed += 1;
    if (event.event_type === "vendor_approved") current.approved += 1;
    if (event.event_type === "first_listing_created") current.firstListings += 1;

    conversionMap.set(key, current);
  }

  const now = new Date().toISOString();

  const payload = ((recruitmentRows || []) as RecruitmentRow[]).map((row) => {
    const conversion = conversionMap.get(geoKey(row)) || {
      views: 0,
      clicks: 0,
      completed: 0,
      approved: 0,
      firstListings: 0,
    };

    const optimization = calculateMarketplaceSelfOptimization({
      module: row.module,
      category: row.category,
      opportunityScore: row.opportunity_score,
      shortageScore: row.shortage_score,
      views: conversion.views,
      clicks: conversion.clicks,
      registrationsCompleted: conversion.completed,
      approvedVendors: conversion.approved,
      firstListings: conversion.firstListings,
    });

    const decision = decisionFromScore(
      optimization.optimizationScore,
      conversion.firstListings,
      conversion.views,
      conversion.clicks
    );

    return {
      module: row.module,
      category: row.category,
      geo_state_id: row.geo_state_id,
      geo_district_id: row.geo_district_id,
      geo_subdivision_id: row.geo_subdivision_id,
      geo_block_id: row.geo_block_id,
      geo_place_id: row.geo_place_id,
      shortage_score: Number(row.shortage_score || 0),
      opportunity_score: Number(row.opportunity_score || 0),
      conversion_score: optimization.conversionScore,
      performance_score: optimization.performanceScore,
      optimization_score: optimization.optimizationScore,
      decision: decision.decision,
      recommendation: decision.recommendation,
      action_priority: decision.action_priority,
      source: "phase_5e_autonomous_recruitment",
      updated_at: now,
    };
  });

  await supabase
    .from("marketplace_autonomous_recruitment_intelligence")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (!payload.length) {
    return { ok: true, inserted: 0 };
  }

  const { error } = await supabase
    .from("marketplace_autonomous_recruitment_intelligence")
    .insert(payload);

  if (error) {
    return { ok: false, inserted: 0, error: error.message };
  }

  return { ok: true, inserted: payload.length };
}
