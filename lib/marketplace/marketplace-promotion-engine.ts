import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type ExpansionAutomationRow = {
  module: string;
  category: string | null;
  geo_state_id: string | null;
  geo_district_id: string | null;
  geo_subdivision_id: string | null;
  geo_block_id: string | null;
  geo_place_id: string | null;
  expansion_score: number | null;
  optimization_score: number | null;
  shortage_score: number | null;
  action_type: string | null;
};

function promotionType(score: number) {
  if (score >= 80) return "featured";
  if (score >= 60) return "promoted";
  if (score >= 40) return "recommended";
  return "watch";
}

function recommendationFor(type: string) {
  if (type === "featured") {
    return "Feature this opportunity prominently. It has strong expansion, shortage and optimization signals.";
  }

  if (type === "promoted") {
    return "Promote this opportunity in public marketplace areas to increase vendor acquisition.";
  }

  if (type === "recommended") {
    return "Recommend this opportunity as a useful growth area for vendors.";
  }

  return "Watch this opportunity until stronger promotion evidence appears.";
}

export async function refreshMarketplacePromotionIntelligence() {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("marketplace_expansion_automation_actions")
    .select(
      "module,category,geo_state_id,geo_district_id,geo_subdivision_id,geo_block_id,geo_place_id,expansion_score,optimization_score,shortage_score,action_type"
    )
    .order("optimization_score", { ascending: false })
    .limit(100);

  if (error) return { ok: false, inserted: 0, error: error.message };

  const now = new Date().toISOString();

  const payload = ((data || []) as ExpansionAutomationRow[])
    .map((row) => {
      const optimizationScore = Number(row.optimization_score || 0);
      const shortageScore = Number(row.shortage_score || 0);
      const expansionScore = Number(row.expansion_score || 0);

      const promotionScore = Math.round(
        optimizationScore * 0.5 + shortageScore * 0.3 + expansionScore * 0.2
      );

      const type = promotionType(promotionScore);

      return {
        module: row.module,
        category: row.category,
        geo_state_id: row.geo_state_id,
        geo_district_id: row.geo_district_id,
        geo_subdivision_id: row.geo_subdivision_id,
        geo_block_id: row.geo_block_id,
        geo_place_id: row.geo_place_id,
        promotion_score: promotionScore,
        optimization_score: optimizationScore,
        shortage_score: shortageScore,
        promotion_rank: 0,
        promotion_type: type,
        recommendation: recommendationFor(type),
        source: "phase_6b_promotion_engine",
        updated_at: now,
      };
    })
    .sort((a, b) => b.promotion_score - a.promotion_score)
    .map((row, index) => ({
      ...row,
      promotion_rank: index + 1,
    }));

  await supabase
    .from("marketplace_promotion_intelligence")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (!payload.length) return { ok: true, inserted: 0 };

  const { error: insertError } = await supabase
    .from("marketplace_promotion_intelligence")
    .insert(payload);

  if (insertError) {
    return { ok: false, inserted: 0, error: insertError.message };
  }

  return { ok: true, inserted: payload.length };
}
