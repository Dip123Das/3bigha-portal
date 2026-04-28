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

async function requireMasterAdmin(req: Request) {
  const supabase = getSupabaseAdmin();
  const authHeader = req.headers.get("authorization");

  if (!authHeader) {
    return { user: null, error: "Unauthorized. Please login again." };
  }

  const token = authHeader.replace("Bearer ", "");

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return { user: null, error: "Invalid or expired login session." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { user: null, error: profileError.message };
  }

  if (profile?.role !== "master_admin") {
    return { user: null, error: "Master admin required." };
  }

  return { user, error: null };
}

function extractText(payload: any) {
  if (typeof payload?.output_text === "string") return payload.output_text;

  const parts = payload?.output
    ?.flatMap((item: any) => item?.content || [])
    ?.map((content: any) => content?.text)
    ?.filter(Boolean);

  return parts?.join("\n") || "";
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const auth = await requireMasterAdmin(req);

    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error }, { status: 403 });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is missing in Vercel environment variables." },
        { status: 500 }
      );
    }

    const prompt = `
Generate 12 realistic draft "Price Today" rows for 3bigha.com.

Market focus:
- Cooch Behar, West Bengal
- construction materials, property land rates, service rates, rental rates
- all rows are only draft estimates for master admin verification
- do not claim government/official rate
- keep prices realistic and conservative

Return ONLY valid JSON:
{
  "rows": [
    {
      "category": "MATERIALS | PROPERTIES | SERVICES | RENTALS",
      "item": "string",
      "brand": "string",
      "grade": "string",
      "price_min": number,
      "price_max": number,
      "unit": "string",
      "location": "string",
      "trend": "Up | Down | Stable",
      "offer": "string or null"
    }
  ]
}
`;

    const aiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        input: prompt,
      }),
    });

    const aiJson = await aiRes.json();

    if (!aiRes.ok) {
      return NextResponse.json(
        { error: aiJson?.error?.message || "OpenAI request failed." },
        { status: 500 }
      );
    }

    const text = extractText(aiJson);
    const parsed = JSON.parse(text);
    const rows = Array.isArray(parsed?.rows) ? parsed.rows : [];

    if (!rows.length) {
      return NextResponse.json(
        { error: "AI returned no valid price rows." },
        { status: 500 }
      );
    }

    const safeRows = rows.slice(0, 20).map((row: any) => ({
      category: String(row.category || "MATERIALS").slice(0, 80),
      item: String(row.item || "Item").slice(0, 160),
      brand: row.brand ? String(row.brand).slice(0, 160) : "AI draft source",
      grade: row.grade ? String(row.grade).slice(0, 160) : "Standard",
      price_min: Number(row.price_min || 0),
      price_max: Number(row.price_max || row.price_min || 0),
      unit: String(row.unit || "unit").slice(0, 50),
      location: String(row.location || "Cooch Behar").slice(0, 120),
      trend: String(row.trend || "Stable").slice(0, 40),
      offer: row.offer ? String(row.offer).slice(0, 200) : null,
      source_type: "ai_draft",
      created_by: auth.user.id,
      verified: false,
    }));

    const { data, error } = await supabase
      .from("material_price_updates")
      .insert(safeRows)
      .select("id");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, count: data?.length || 0 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "AI draft generation failed." },
      { status: 500 }
    );
  }
}