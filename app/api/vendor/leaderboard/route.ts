import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { computeMarketplaceRanking } from "@/lib/marketplace/marketplace-ranking";

export const runtime = "nodejs";
export const revalidate = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function clean(v: unknown) {
  return String(v ?? "").trim();
}

function scoreBadge(score: number) {
  if (score >= 85) return "🏆 Marketplace Leader";
  if (score >= 70) return "🔥 High Visibility Vendor";
  if (score >= 55) return "⚡ Rising Vendor";
  return "Active Vendor";
}

export async function GET() {
  try {
    const { data: vendors, error } = await supabase
      .from("business_profiles")
      .select(
        "user_id,business_name,city,locality,subscription_plan,subscription_status,boost_priority,reputation_score,authority_score,conversion_rate,response_rate,activity_score,demand_score,liquidity_score,marketplace_intelligence_updated_at",
      )
      .not("user_id", "is", null)
      .limit(100);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    const rows = (vendors || [])
      .map((vendor: any) => {
        const vendorId = clean(vendor.user_id);
        const ranking = computeMarketplaceRanking({
          boostScore: Number(vendor.boost_priority || 0) * 100,
          verificationScore:
            clean(vendor.approval_status).toLowerCase() === "approved"
              ? 20
              : clean(vendor.subscription_status).toLowerCase() === "active"
                ? 10
                : 0,
          reputationScore: vendor.reputation_score,
          authorityScore: vendor.authority_score,
          conversionRate: vendor.conversion_rate,
          responseRate: vendor.response_rate,
          activityScore: vendor.activity_score,
          demandScore: vendor.demand_score,
          liquidityScore: vendor.liquidity_score,
        });

        return {
          vendorUserId: vendorId,
          name: clean(vendor.business_name) || "Local Vendor",
          city: clean(vendor.city),
          locality: clean(vendor.locality),
          plan: clean(vendor.subscription_plan) || "free",
          score: Math.round(ranking.score),
          badge: scoreBadge(ranking.score),
          reasons: ranking.reasons || [],
          intelligence: {
            reputationScore: Number(vendor.reputation_score || 0),
            authorityScore: Number(vendor.authority_score || 0),
            conversionRate: Number(vendor.conversion_rate || 0),
            responseRate: Number(vendor.response_rate || 0),
            activityScore: Number(vendor.activity_score || 0),
            demandScore: Number(vendor.demand_score || 0),
            liquidityScore: Number(vendor.liquidity_score || 0),
            updatedAt: vendor.marketplace_intelligence_updated_at,
          },
        };
      })
      .filter((row: any) => row.vendorUserId)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 25)
      .map((row: any, index: number) => ({
        ...row,
        rank: index + 1,
      }));

    return NextResponse.json({
      ok: true,
      source: "unified_marketplace_ranking",
      rows,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 },
    );
  }
}
