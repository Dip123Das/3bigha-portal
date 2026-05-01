import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

async function aiVendorScore(row: any, input: { module: string; item: string; city: string; locality: string; pincode: string }) {
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

function scoreVendor(row: any, input: { module: string; item: string; city: string; locality: string; pincode: string }) {
  let score = 45;
  const reasons: string[] = [];

  const rowCity = clean(row.city);
  const rowLocality = clean(row.locality);
  const rowDistrict = clean(row.district);
  const rowPincode = clean(row.pincode);

  if (input.pincode && rowPincode && input.pincode === rowPincode) {
    score += 25;
    reasons.push("same pincode");
  }

  if (input.locality && rowLocality && includesLoose(rowLocality, input.locality)) {
    score += 20;
    reasons.push("locality match");
  }

  if (input.city && rowCity && includesLoose(rowCity, input.city)) {
    score += 18;
    reasons.push("city match");
  }

  if (input.city && rowDistrict && includesLoose(rowDistrict, input.city)) {
    score += 10;
    reasons.push("district relevance");
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
    score += 12;
    reasons.push(`relevant to ${input.item}`);
  }

  if (row.verified === true || row.is_verified === true || clean(row.approval_status).toLowerCase() === "approved") {
    score += 8;
    reasons.push("verified profile");
  }

  if (row.boost_priority || row.is_boosted) {
    score += 7;
    reasons.push("boosted vendor");
  }

  return {
    score: Math.min(score, 98),
    reason: reasons.length ? reasons.join(" • ") : "Relevant vendor profile",
  };
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

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE, {
      auth: { persistSession: false },
    });

    const { data, error } = await admin
      .from("business_profiles")
      .select("*")
      .limit(80);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = Array.isArray(data) ? data : [];

    const scoredRows = await Promise.all(
      rows.map(async (row: any) => {
        const ranked = scoreVendor(row, { module, item, city, locality, pincode });
        const aiRanked = await aiVendorScore(row, { module, item, city, locality, pincode });

        const displayName =
          clean(row.business_name) ||
          clean(row.company_name) ||
          clean(row.name) ||
          clean(row.owner_name) ||
          "Local vendor";

        const planBoost = getPlanBoost(row);
        const manualBoost = Number(row.boost_priority || 0);

        const weightedBoost = (planBoost * 5) + manualBoost;

        const finalScore = Math.min(
          ranked.score + (aiRanked?.score || 0) + weightedBoost,
          99
        );

        const boostReasonParts = [];
        if (planBoost > 0) boostReasonParts.push(`plan boost +${planBoost}`);
        if (manualBoost > 0) boostReasonParts.push(`manual boost +${manualBoost}`);

        const boostReason = boostReasonParts.length
          ? ` • ${boostReasonParts.join(" • ")}`
          : "";

        const finalReason = aiRanked?.reason
          ? `${ranked.reason} • AI match: ${aiRanked.reason}${boostReason}`
          : `${ranked.reason}${boostReason}`;

        return {
          user_id: clean(row.user_id),
          name: displayName,
          reason: finalReason,
          score: finalScore,
          base_score: ranked.score,
          ai_score: aiRanked?.score || 0,
          plan_boost: planBoost,
          manual_boost: manualBoost,
          weighted_boost: weightedBoost,
          city: clean(row.city),
          locality: clean(row.locality),
          district: clean(row.district),
          pincode: clean(row.pincode),
          source: "business_profiles",
        };
      })
    );

    const matches = scoredRows
      .filter((row) => row.score >= 45)
      .sort((a, b) => {
        if ((b.weighted_boost || 0) !== (a.weighted_boost || 0)) {
          return (b.weighted_boost || 0) - (a.weighted_boost || 0);
        }

        return b.score - a.score;
      })
      .slice(0, 5);

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