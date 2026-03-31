import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function POST(req: Request) {
  try {
    const supabaseUrl =
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Supabase env not configured properly" },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 👇 KEEP YOUR EXISTING LOGIC BELOW (do NOT change)

    const body = await req.json();

    const {
      owner_id,
      listing_intent,
      type_id,
      subtype_id,
      title,
      slug,
      city,
      status,
      is_public,
      is_builder_listing,
      builder_project_id,
    } = body || {};

    if (!owner_id) {
      return NextResponse.json(
        { error: "owner_id is required" },
        { status: 400 }
      );
    }

    if (!listing_intent) {
      return NextResponse.json(
        { error: "listing_intent is required" },
        { status: 400 }
      );
    }

    if (!type_id) {
      return NextResponse.json(
        { error: "type_id is required" },
        { status: 400 }
      );
    }

    if (!subtype_id) {
      return NextResponse.json(
        { error: "subtype_id is required" },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 }
      );
    }

    if (!city) {
      return NextResponse.json(
        { error: "city is required" },
        { status: 400 }
      );
    }

    const insertPayload = {
      owner_id,
      listing_intent,
      type_id,
      subtype_id,
      title,
      city,
      status: status || "draft",
      is_public: !!is_public,
      is_builder_listing: !!is_builder_listing,
      slug: slug || null,
      builder_project_id: builder_project_id || null,
    };

    const { data, error } = await supabaseAdmin
      .from("property_listings")
      .insert(insertPayload)
      .select("id,status")
      .single();

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

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: e?.message || "Unknown server error",
      },
      { status: 500 }
    );
  }
}