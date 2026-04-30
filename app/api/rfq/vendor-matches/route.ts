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

    const matches = rows
      .map((row: any) => {
        const ranked = scoreVendor(row, { module, item, city, locality, pincode });

        const displayName =
          clean(row.business_name) ||
          clean(row.company_name) ||
          clean(row.name) ||
          clean(row.owner_name) ||
          "Local vendor";

        return {
          user_id: clean(row.user_id),
          name: displayName,
          reason: ranked.reason,
          score: ranked.score,
          city: clean(row.city),
          locality: clean(row.locality),
          district: clean(row.district),
          pincode: clean(row.pincode),
          source: "business_profiles",
        };
      })
      .filter((row) => row.score >= 45)
      .sort((a, b) => b.score - a.score)
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