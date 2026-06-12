import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type ExpansionRow = {
  module: string;
  category: string | null;
  growth_score: number | null;
  shortage_score: number | null;
  expansion_score: number | null;
  recommendation: string | null;
  reason: string | null;
  geo_state_id: string | null;
  geo_district_id: string | null;
  geo_subdivision_id?: string | null;
  geo_block_id: string | null;
  geo_place_id?: string | null;
};

type AutonomousRecruitmentRow = {
  module: string;
  category: string | null;
  geo_state_id: string | null;
  geo_district_id: string | null;
  geo_subdivision_id: string | null;
  geo_block_id: string | null;
  geo_place_id: string | null;
  optimization_score: number | null;
  shortage_score: number | null;
  decision: string | null;
  action_priority: string | null;
};

function keyOf(row: {
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

function decideAction(input: {
  expansionScore: number;
  optimizationScore: number;
  shortageScore: number;
  expansionRecommendation?: string | null;
  recruitmentDecision?: string | null;
}) {
  const { expansionScore, optimizationScore, shortageScore } = input;

  if (
    expansionScore >= 70 &&
    optimizationScore >= 55 &&
    shortageScore >= 50
  ) {
    return {
      action_type: "expand_now",
      action_priority: "critical",
      recommendation:
        "Expand now. This area has strong expansion score, shortage pressure and recruitment intelligence support.",
    };
  }

  if (
    expansionScore >= 60 ||
    input.recruitmentDecision === "recruit_immediately"
  ) {
    return {
      action_type: "increase_recruitment",
      action_priority: "high",
      recommendation:
        "Increase recruitment. Expansion potential exists and vendor supply should be strengthened before heavier promotion.",
    };
  }

  if (optimizationScore < 20 && expansionScore < 30) {
    return {
      action_type: "pause_or_watch",
      action_priority: "normal",
      recommendation:
        "Pause aggressive expansion. Current signals do not justify additional growth pressure.",
    };
  }

  return {
    action_type: "watch",
    action_priority: "normal",
    recommendation:
      "Watch this expansion area. Continue monitoring demand, supply and vendor conversion evidence.",
  };
}

export async function refreshMarketplaceExpansionAutomation() {
  const supabase = getSupabaseAdmin();

  const [{ data: expansionRows }, { data: recruitmentRows }] = await Promise.all([
    supabase
      .from("marketplace_expansion_recommendations")
      .select(
        "module,category,growth_score,shortage_score,expansion_score,recommendation,reason,geo_state_id,geo_district_id,geo_subdivision_id,geo_block_id,geo_place_id"
      )
      .limit(1000),
    supabase
      .from("marketplace_autonomous_recruitment_intelligence")
      .select(
        "module,category,geo_state_id,geo_district_id,geo_subdivision_id,geo_block_id,geo_place_id,optimization_score,shortage_score,decision,action_priority"
      )
      .limit(1000),
  ]);

  const recruitmentMap = new Map<string, AutonomousRecruitmentRow>();

  for (const row of ((recruitmentRows || []) as AutonomousRecruitmentRow[])) {
    recruitmentMap.set(keyOf(row), row);
  }

  const now = new Date().toISOString();

  const payload = ((expansionRows || []) as ExpansionRow[]).map((row) => {
    const matched = recruitmentMap.get(keyOf(row));

    const expansionScore = Number(row.expansion_score || 0);
    const optimizationScore = Number(matched?.optimization_score || 0);
    const shortageScore = Math.max(
      Number(row.shortage_score || 0),
      Number(matched?.shortage_score || 0)
    );

    const action = decideAction({
      expansionScore,
      optimizationScore,
      shortageScore,
      expansionRecommendation: row.recommendation,
      recruitmentDecision: matched?.decision,
    });

    return {
      module: row.module,
      category: row.category,
      geo_state_id: row.geo_state_id,
      geo_district_id: row.geo_district_id,
      geo_subdivision_id: row.geo_subdivision_id || null,
      geo_block_id: row.geo_block_id,
      geo_place_id: row.geo_place_id || null,
      expansion_score: expansionScore,
      optimization_score: optimizationScore,
      shortage_score: shortageScore,
      action_type: action.action_type,
      action_priority: action.action_priority,
      recommendation: action.recommendation,
      reason: row.reason,
      source: "phase_6a_expansion_automation",
      status: "pending",
      updated_at: now,
    };
  });

  await supabase
    .from("marketplace_expansion_automation_actions")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (!payload.length) return { ok: true, inserted: 0 };

  const { error } = await supabase
    .from("marketplace_expansion_automation_actions")
    .insert(payload);

  if (error) return { ok: false, inserted: 0, error: error.message };

  return { ok: true, inserted: payload.length };
}
