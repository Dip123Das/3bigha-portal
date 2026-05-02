import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Server missing env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

function confidenceFromCount(count: number) {
  if (count >= 8) return "High";
  if (count >= 3) return "Medium";
  return "Low";
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json();

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: "Invalid user" }, { status: 401 });
    }

    const category = String(body?.category || "Materials");
    const item = String(body?.item || "").trim();
    const unit = String(body?.unit || "").trim();
    const location = String(body?.location || "").trim();

    if (!item || !unit || !location) {
      return NextResponse.json(
        { error: "Item, unit and location are required" },
        { status: 400 }
      );
    }

    const { data: rows } = await supabase
      .from("material_price_updates")
      .select("price_min,price_max,created_at")
      .eq("category", category)
      .eq("item", item)
      .eq("unit", unit)
      .ilike("location", `%${location}%`)
      .order("created_at", { ascending: false })
      .limit(20);

    const validPrices =
      rows
        ?.map((row) => {
          const min = Number(row.price_min);
          const max = Number(row.price_max);
          if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
          return (min + max) / 2;
        })
        .filter((value): value is number => value !== null) || [];

    const marketAverage =
      validPrices.length > 0
        ? Math.round(
            validPrices.reduce((sum, value) => sum + value, 0) /
              validPrices.length
          )
        : null;

    const suggestedPrice =
      marketAverage !== null
        ? Math.round(marketAverage * 0.98)
        : Math.round(
            (Number(body?.price_min || 0) + Number(body?.price_max || 0)) / 2
          );

    const confidence = confidenceFromCount(validPrices.length);

    return NextResponse.json({
      ok: true,
      suggestedPrice,
      marketAverage: marketAverage || suggestedPrice,
      confidence,
      sampleSize: validPrices.length,
      note:
        validPrices.length > 0
          ? "Based on recent matching 3bigha price updates."
          : "Fallback suggestion based on your entered price range. More market data will improve accuracy.",
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Something went wrong" },
      { status: 500 }
    );
  }
}