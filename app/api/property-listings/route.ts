import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";

  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase env not configured properly");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function GET(req: Request) {
  try {
    const supabase = getSupabaseAdmin();

    const { searchParams } = new URL(req.url);

    const city = searchParams.get("city");
    const state = searchParams.get("state");
    const typeId = searchParams.get("type_id");
    const subtypeId = searchParams.get("subtype_id");
    const limitParam = searchParams.get("limit");

    const limit = Math.min(
      Math.max(Number(limitParam || "24") || 24, 1),
      100
    );

    let query = supabase
      .from("property_listings")
      .select("*")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (city) {
      query = query.ilike("city", city);
    }

    if (state) {
      query = query.ilike("state", state);
    }

    if (typeId) {
      query = query.eq("type_id", typeId);
    }

    if (subtypeId) {
      query = query.eq("subtype_id", subtypeId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
          details: error.details || null,
          hint: error.hint || null,
          code: error.code || null,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data || [] });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: e?.message || "Unknown server error",
      },
      { status: 500 }
    );
  }
}