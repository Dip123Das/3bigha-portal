import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildVendorTrustReputation } from "@/lib/vendors/vendor-trust-reputation";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function clean(v: unknown) {
  return String(v ?? "").trim();
}

function includesLoose(a: string, b: string) {
  const x = clean(a).toLowerCase();
  const y = clean(b).toLowerCase();
  if (!x || !y) return false;
  return x.includes(y) || y.includes(x);
}

async function aiVendorScore(row: any, input: VendorMatchInput) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const prompt = `
Score this vendor for a buyer RFQ on 3bigha.com.

Return only JSON:
{"score": 0-20, "reason": "short reason"}

Buyer RFQ:
module=${input.module}
item=${input.item}
city=${input.city}
locality=${input.locality}
pincode=${input.pincode}

Vendor:
business=${clean(row.business_name) || clean(row.company_name) || clean(row.name)}
type=${clean(row.vendor_type) || clean(row.business_type)}
category=${clean(row.category)}
city=${clean(row.city)}
locality=${clean(row.locality)}
district=${clean(row.district)}
pincode=${clean(row.pincode)}
verified=${row.verified === true || row.is_verified === true || clean(row.approval_status).toLowerCase() === "approved"}
boosted=${!!row.boost_priority || !!row.is_boosted}
description=${clean(row.description).slice(0, 300)}
`;

    const aiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: [{ role: "user", content: prompt }],
        temperature: 0.15,
        max_output_tokens: 120,
      }),
    });

    const aiJson = await aiRes.json().catch(() => null);
    const raw =
      typeof aiJson?.output_text === "string"
        ? aiJson.output_text
        : aiJson?.output
            ?.flatMap((item: any) => item?.content || [])
            ?.map((content: any) => content?.text)
            ?.filter(Boolean)
            ?.join("\n");

    const parsed = JSON.parse(String(raw || "{}"));
    const score = Number(parsed?.score);

    if (!aiRes.ok || !Number.isFinite(score)) return null;

    return {
      score: Math.max(0, Math.min(20, score)),
      reason: clean(parsed?.reason).slice(0, 120),
    };
  } catch {
    return null;
  }
}

function getPlanBoost(row: any) {
  const plan = clean(row.subscription_plan).toLowerCase();
  const status = clean(row.subscription_status).toLowerCase();
  const expiresAt = clean(row.subscription_expires_at);

  const isActive =
    status === "active" &&
    (!expiresAt || new Date(expiresAt).getTime() >= Date.now());

  if (!isActive) return 0;

  if (plan === "hub_vendor" || plan === "platinum") return 20;
  if (plan === "premium_vendor" || plan === "gold") return 10;
  if (plan === "basic_vendor" || plan === "silver") return 5;

  return 0;
}

type VendorMatchInput = {
  module: string;
  item: string;
  city: string;
  locality: string;
  pincode: string;
};

function detectBuyerIntentAI(input: VendorMatchInput) {
  let score = 0;
  const reasons: string[] = [];

  if (input.item) {
    score += 20;
    reasons.push("specific item selected");
  }

  if (input.pincode) {
    score += 25;
    reasons.push("pincode-level intent");
  } else if (input.locality) {
    score += 18;
    reasons.push("locality-level intent");
  } else if (input.city) {
    score += 12;
    reasons.push("city-level intent");
  }

  const module = clean(input.module).toLowerCase();

  if (module.includes("materials")) {
    score += 8;
    reasons.push("purchase requirement");
  }

  if (module.includes("rentals")) {
    score += 10;
    reasons.push("rental availability intent");
  }

  if (module.includes("services")) {
    score += 10;
    reasons.push("service hiring intent");
  }

  if (module.includes("propert")) {
    score += 12;
    reasons.push("property decision intent");
  }

  const intent =
    score >= 45 ? "hot_buyer" : score >= 25 ? "warm_buyer" : "browsing_buyer";

  return {
    intent,
    score: Math.min(25, Math.round(score / 2)),
    raw_score: score,
    reason: reasons.length ? reasons.join(" • ") : "basic buyer browsing signal",
  };
}

async function getLatestPriceSignal(admin: any, row: any, input: VendorMatchInput) {
  const userId = clean(row.user_id);

  if (!userId || clean(input.module).toLowerCase() !== "materials") {
    return null;
  }

  let query = admin
    .from("material_price_updates")
    .select(
      "ai_price_deviation_percent,ai_suggested_price,price_min,price_max,boost_priority,item,location,verified,created_at"
    )
    .eq("created_by", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (input.item) {
    query = query.ilike("item", `%${input.item}%`);
  }

  if (input.city) {
    query = query.ilike("location", `%${input.city}%`);
  }

  const { data, error } = await query;

  if (error || !Array.isArray(data) || data.length === 0) {
    return null;
  }

  const latest = data[0];
  const deviation = Math.abs(Number(latest.ai_price_deviation_percent || 0));
  const latestBoost = Number(latest.boost_priority || 0);

  let score = 0;
  const reasons: string[] = [];

  if (Number.isFinite(deviation)) {
    if (deviation <= 3) {
      score += 15;
      reasons.push("AI optimized price");
    } else if (deviation <= 7) {
      score += 10;
      reasons.push("competitive price");
    } else if (deviation <= 12) {
      score += 6;
      reasons.push("near market price");
    } else if (deviation <= 20) {
      score += 3;
      reasons.push("acceptable price range");
    }
  }

  if (latest.verified === true) {
    score += 5;
    reasons.push("verified price");
  }

  if (latestBoost > 0) {
    score += latestBoost;
    reasons.push(`price boost +${latestBoost}`);
  }

  return {
    score: Math.min(score, 25),
    boost: latestBoost,
    deviation: Number.isFinite(deviation) ? deviation : null,
    reason: reasons.join(" • "),
  };
}

function scoreVendor(row: any, input: VendorMatchInput) {
  let score = 0;
  const reasons: string[] = [];

  // 🔥 AI WEIGHT SYSTEM
  let replySpeedScore = 0;
  let trustScore = 0;
  let relevanceScore = 0;
  let locationScore = 0;
  let boostScore = 0;

  const rowCity = clean(row.city);
  const rowLocality = clean(row.locality);
  const rowDistrict = clean(row.district);
  const rowPincode = clean(row.pincode);

  if (input.pincode && rowPincode && input.pincode === rowPincode) {
    locationScore += 25;
    reasons.push("same pincode");
  }

  if (input.locality && rowLocality && includesLoose(rowLocality, input.locality)) {
    relevanceScore += 20;
    reasons.push("locality match");
  }

  if (input.city && rowCity && includesLoose(rowCity, input.city)) {
    locationScore += 18;
    reasons.push("city match");
  }

  if (input.city && rowDistrict && includesLoose(rowDistrict, input.city)) {
    score += 10;
    reasons.push("district relevance");
  }

  // 🚫 AUTO BAN FILTER
  if (clean(row.ai_visibility_status) === "restricted") {
    return {
      score: 0,
      risk_score: 100,
      reason: "Restricted by system (high risk)",
    };
  }

  const searchable = [
    row.business_name,
    row.name,
    row.company_name,
    row.vendor_type,
    row.category,
    row.business_type,
    row.description,
  ]
    .map(clean)
    .join(" ")
    .toLowerCase();

  if (input.item && searchable.includes(input.item.toLowerCase())) {
    relevanceScore += 12;
    reasons.push(`relevant to ${input.item}`);
  }

  if (row.verified === true || row.is_verified === true || clean(row.approval_status).toLowerCase() === "approved") {
    trustScore += 8;
    reasons.push("verified profile");
  }

  if (row.boost_priority || row.is_boosted) {
    boostScore += Math.min(20, Number(row.boost_priority || 7));
    reasons.push("boosted vendor");
  }

  // 🔥 FINAL AI WEIGHTED SCORE
  // 🚨 FRAUD PENALTY SIGNAL
  let fraudPenalty = 0;

  const suspiciousVendor =
    clean(row.business_name).length < 3 ||
    clean(row.description).length < 10;

  if (suspiciousVendor) {
    fraudPenalty = 15;
    reasons.push("low trust profile");
  }

const riskScore = computeRiskScore(row);
const reputationScore = computeReputationScore(row);
const revenueScore = Math.min(20, Number(row.ai_revenue_score || 0));

  // 🚨 AUTO BAN LOGIC
  if (riskScore >= 70) {
    row.ai_visibility_status = "restricted";
  }

// 🧠 AI MARKET DOMINANCE WEIGHTING

const demandBoost =
  input.item && searchable.includes(input.item.toLowerCase()) ? 5 : 0;

const highValueVendor =
  revenueScore > 10 && reputationScore > 60 ? 1.1 : 1;

const finalScore = Math.max(
  0,
  Math.min(
    100,
    Math.round(
      (
        locationScore * 0.2 +
        relevanceScore * 0.18 +
        trustScore * 0.1 +
        boostScore * 0.15 +
        reputationScore * 0.17 +
        revenueScore * 0.15 +
        demandBoost
      ) * highValueVendor -
        fraudPenalty -
        riskScore * 0.3
    )
  )
);

// 🧠 LEARNING DISABLED HERE (must stay sync)
// moved to RFQ accept flow

// 🧠 DEMAND SUPPLY EDGE
const scarcityBoost =
  input.item && !searchable.includes(input.item.toLowerCase()) ? 2 : 0;

return {
  score: Math.min(100, finalScore + scarcityBoost),
  risk_score: riskScore,
  reputation_score: reputationScore,
  revenue_score: revenueScore,
    reason:
      reasons.length
        ? reasons.join(" • ")
        : "AI ranked vendor based on location, relevance, trust, and boost",
  };
}

function computeReputationScore(row: any) {
  let rep = 50; // base neutral score

  const m = Array.isArray(row.vendor_performance_metrics)
    ? row.vendor_performance_metrics[0]
    : row.vendor_performance_metrics;

  if (m) {
    const totalMatches = Number(m.total_matches || 0);
    const totalSelected = Number(m.total_selected || 0);
    const totalConverted = Number(m.total_converted || 0);

    if (totalMatches > 0) {
      const selectionRate = totalSelected / totalMatches;
      rep += selectionRate * 30;
    }

    if (totalSelected > 0) {
      const conversionRate = totalConverted / totalSelected;
      rep += conversionRate * 20;
    }

    if (totalMatches > 20) {
      rep += 10; // consistency bonus
    }
  }

  if (row.verified === true || clean(row.approval_status).toLowerCase() === "approved") {
    rep += 10;
  }

  if ((row.boost_priority || 0) > 0) {
    rep += 5;
  }

  return Math.max(0, Math.min(100, Math.round(rep)));
}

function computeRiskScore(row: any) {
  let risk = 0;

  const name = clean(row.business_name);
  const desc = clean(row.description);

  if (!name || name.length < 3) risk += 20;
  if (!desc || desc.length < 15) risk += 15;

  if (!row.verified && clean(row.approval_status).toLowerCase() !== "approved") {
    risk += 20;
  }

  if (!row.city && !row.locality) {
    risk += 10;
  }

  if ((row.boost_priority || 0) > 30) {
    risk += 15;
  }

  return Math.min(100, risk);
}

function predictWinProbability(row: any, baseScore: number) {
  const m = row.vendor_performance_metrics;

  if (!m) return Math.min(0.6, baseScore / 100);

  const selectionRate =
    m.total_matches > 0 ? m.total_selected / m.total_matches : 0;

  const conversionRate =
    m.total_selected > 0 ? m.total_converted / m.total_selected : 0;

  const consistency =
    m.total_matches > 20 ? 1 : m.total_matches / 20;

  const probability =
    baseScore * 0.5 +
    selectionRate * 30 +
    conversionRate * 20;

  const normalized = Math.min(100, probability);

  return Math.round((normalized / 100) * consistency * 100) / 100;
}

export async function GET(req: Request) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE) {
      return NextResponse.json({ error: "Supabase environment variables are missing." }, { status: 500 });
    }

    const url = new URL(req.url);
    const module = clean(url.searchParams.get("module") || "materials");
    const item = clean(url.searchParams.get("item"));
    const city = clean(url.searchParams.get("city"));
    const locality = clean(url.searchParams.get("locality"));
    const pincode = clean(url.searchParams.get("pincode"));

    const buyerIntent = detectBuyerIntentAI({
      module,
      item,
      city,
      locality,
      pincode,
    });

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE, {
      auth: { persistSession: false },
    });

    const { data, error } = await admin
      .from("business_profiles")
      .select(`
        *,
        vendor_performance_metrics (
          total_matches,
          total_selected,
          total_converted
        )
      `)
      .limit(80);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = Array.isArray(data) ? data : [];

    const vendorIds = rows
      .map((row: any) => clean(row.user_id))
      .filter(Boolean);

    const { data: dealEventRows } =
      vendorIds.length > 0
        ? await admin
            .from("ai_deal_events")
            .select("vendor_user_id,ready")
            .in("vendor_user_id", vendorIds)
        : { data: [] };

    const dealStatsByVendor = new Map<string, { total: number; ready: number }>();

    (dealEventRows || []).forEach((event: any) => {
      const vendorId = clean(event.vendor_user_id);
      if (!vendorId) return;

      const current = dealStatsByVendor.get(vendorId) || { total: 0, ready: 0 };

      dealStatsByVendor.set(vendorId, {
        total: current.total + 1,
        ready: current.ready + (event.ready === true ? 1 : 0),
      });
    });

    const scoredRows = await Promise.all(
      rows.map(async (row: any) => {
        const input = { module, item, city, locality, pincode };
        const ranked = scoreVendor(row, input);
        const aiRanked = await aiVendorScore(row, input);
        const priceRanked = await getLatestPriceSignal(admin, row, input);

        const dealStats = dealStatsByVendor.get(clean(row.user_id)) || {
          total: 0,
          ready: 0,
        };

        const dealSignalScore = Math.min(25, dealStats.ready * 5);
        const buyerIntentScore = buyerIntent.score;

        const displayName =
          clean(row.business_name) ||
          clean(row.company_name) ||
          clean(row.name) ||
          clean(row.owner_name) ||
          "Local vendor";

        const planBoost = getPlanBoost(row);
        const manualBoost = Number(row.boost_priority || 0);

        const priceBoost = priceRanked?.boost || 0;
        const smartPriceScore = priceRanked?.score || 0;
        const deviation = Math.abs(Number(priceRanked?.deviation || 0));

        // 🧠 AI CONTROL: reduce boost impact if pricing is poor
        let boostMultiplier = 1;

        if (Number.isFinite(deviation)) {
          if (deviation > 15) {
            boostMultiplier = 0.4; // very poor pricing → heavy penalty
          } else if (deviation > 10) {
            boostMultiplier = 0.6;
          } else if (deviation > 5) {
            boostMultiplier = 0.8;
          }
        }

        // 🎯 Controlled boost (cannot override AI quality)
        const weightedBoost =
          ((planBoost * 5) + manualBoost + priceBoost) * boostMultiplier;

        // 🔥 PERFORMANCE MULTIPLIER
        let performanceBoost = 0;

        const m = row.vendor_performance_metrics?.[0];

        if (m) {
          const selectionRate =
            m.total_matches > 0 ? m.total_selected / m.total_matches : 0;

          const conversionRate =
            m.total_selected > 0 ? m.total_converted / m.total_selected : 0;

          performanceBoost =
            selectionRate * 15 + // max +15
            conversionRate * 10; // max +10
        }

        const trustProfile = buildVendorTrustReputation({
          isVerified: row.verified === true || row.is_verified === true,
          approvalStatus: row.approval_status,
          city: row.city,
          locality: row.locality,
          district: row.district,
          description: row.description,
          boostPriority: row.boost_priority,
          reputationScore: ranked.reputation_score,
          totalMatches: m?.total_matches || 0,
          totalSelected: m?.total_selected || 0,
          totalConverted: m?.total_converted || 0,
          readyDealSignals: dealStats.ready,
          riskScore: ranked.risk_score,
        });

        const trustBoost =
          trustProfile.riskLevel === "low"
            ? Math.round(trustProfile.score * 0.08)
            : trustProfile.riskLevel === "medium"
            ? Math.round(trustProfile.score * 0.03)
            : -12;

        const finalScore = Math.min(
          ranked.score +
            (aiRanked?.score || 0) +
            smartPriceScore +
            weightedBoost +
            performanceBoost +
            dealSignalScore +
            buyerIntentScore +
            trustBoost,
          99
        );

        const boostReasonParts = [];
        if (planBoost > 0) boostReasonParts.push(`plan boost +${planBoost}`);
        if (manualBoost > 0) boostReasonParts.push(`manual boost +${manualBoost}`);
        if (priceRanked?.reason) boostReasonParts.push(priceRanked.reason);

        const boostReason = boostReasonParts.length
          ? ` • ${boostReasonParts.join(" • ")}`
          : "";

        const finalReason = aiRanked?.reason
          ? `${ranked.reason} • AI match: ${aiRanked.reason}${boostReason} • Buyer intent: ${buyerIntent.reason}`
          : `${ranked.reason}${boostReason} • Buyer intent: ${buyerIntent.reason}`;

        const winProbability = predictWinProbability(row, finalScore);

        return {
          user_id: clean(row.user_id),
          name: displayName,
          reason: finalReason,
          score: finalScore,
          win_probability: winProbability,
          is_top_recommended: winProbability > 0.7,
          base_score: ranked.score,
          ai_score: aiRanked?.score || 0,
          smart_price_score: smartPriceScore,
          ai_price_deviation_percent: priceRanked?.deviation,
          plan_boost: planBoost,
          manual_boost: manualBoost,
          weighted_boost: weightedBoost,
          price_boost: priceBoost,
          deal_signal_score: dealSignalScore,
          buyer_intent: buyerIntent.intent,
          buyer_intent_score: buyerIntentScore,
          buyer_intent_reason: buyerIntent.reason,
          ready_deal_signals: dealStats.ready,
          total_deal_signals: dealStats.total,
          trust_score: trustProfile.score,
          trust_label: trustProfile.label,
          trust_badges: trustProfile.badges,
          trust_risk_level: trustProfile.riskLevel,
          trust_reason: trustProfile.reason,
          routing_priority:
            dealStats.ready >= 3
              ? "top_closer"
              : buyerIntent.intent === "hot_buyer" && winProbability > 0.6
              ? "hot_buyer_best_match"
              : winProbability > 0.7
              ? "high_win_probability"
              : weightedBoost > 0
              ? "paid_priority"
              : "standard",
          city: clean(row.city),
          locality: clean(row.locality),
          district: clean(row.district),
          pincode: clean(row.pincode),
          source: "business_profiles",
        };
        })
      );

    const filtered = scoredRows
      .filter((row) => row.score >= 45)
      .sort((a, b) => {
      // 🔥 PRIORITY 1: Proven ready-to-close deal signals
      if ((b.ready_deal_signals || 0) !== (a.ready_deal_signals || 0)) {
        return (b.ready_deal_signals || 0) - (a.ready_deal_signals || 0);
      }

      // 🔥 PRIORITY 2: Win Probability (AI Prediction)
      const pDiff = (b.win_probability || 0) - (a.win_probability || 0);
      if (Math.abs(pDiff) > 0.05) return pDiff;

      // 🔥 PRIORITY 3: Trust & reputation
      if ((b.trust_score || 0) !== (a.trust_score || 0)) {
        return (b.trust_score || 0) - (a.trust_score || 0);
      }

      // 🔥 PRIORITY 4: Boost (Revenue logic)
      if ((b.weighted_boost || 0) !== (a.weighted_boost || 0)) {
        return (b.weighted_boost || 0) - (a.weighted_boost || 0);
      }

      // 🔥 PRIORITY 4: Score fallback
      return (b.score || 0) - (a.score || 0);
    });

    // 🔥 LIMIT TOP RECOMMENDED (ONLY ONE)
    let topRecommendedAssigned = false;

    const filteredWithTop = filtered.map((v) => {
      if (!topRecommendedAssigned && (v.win_probability || 0) > 0.7) {
        topRecommendedAssigned = true;
        return { ...v, is_top_recommended: true };
      }
      return { ...v, is_top_recommended: false };
    });

    // 🧠 SMART LEAD DISTRIBUTION ENGINE
    const topClosers = filteredWithTop.filter(
      (row) => (row.ready_deal_signals || 0) >= 3
    );

    const highWin = filteredWithTop.filter(
      (row) =>
        (row.ready_deal_signals || 0) < 3 &&
        (row.win_probability || 0) > 0.7
    );

    const paid = filteredWithTop.filter(
      (row) =>
        (row.ready_deal_signals || 0) < 3 &&
        (row.win_probability || 0) <= 0.7 &&
        (row.plan_boost || 0) > 0
    );

    const free = filteredWithTop.filter(
      (row) =>
        (row.ready_deal_signals || 0) < 3 &&
        (row.win_probability || 0) <= 0.7 &&
        (row.plan_boost || 0) === 0
    );

    // 👉 LIMITED FREE VISIBILITY
    const limitedFree = free.slice(0, 1);

    // 👉 ROUTING ORDER: closers → high probability → paid → limited free
    const matches = [...topClosers, ...highWin, ...paid, ...limitedFree].slice(0, 5);

    // 🔥 TRACK MATCH EXPOSURE
    if (matches.length > 0) {
      // 🧠 LEARNING SAFE CLIENT
const learningClient = createClient(SUPABASE_URL, SUPABASE_SERVICE);

await learningClient.from("vendor_performance_metrics").upsert(
        matches.map((v: any) => ({
          user_id: v.user_id,
          total_matches: 1,
          last_updated: new Date().toISOString(),
        })),
        { onConflict: "user_id", ignoreDuplicates: false }
      );
    }

    return NextResponse.json({
      matches,
      meta: {
        module,
        item,
        city,
        locality,
        pincode,
        source: "business_profiles",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}