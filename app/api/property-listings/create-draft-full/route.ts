import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

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
    if (!supabaseUrl) {
      return NextResponse.json(
        { error: "Missing Supabase URL environment variable." },
        { status: 500 }
      );
    }

    if (!supabaseKey) {
      return NextResponse.json(
        { error: "Missing Supabase key environment variable." },
        { status: 500 }
      );
    }

    const body = await req.json();

    const { minimalInsert, extraUpdate } = body || {};

    if (!minimalInsert) {
      return NextResponse.json(
        { error: "minimalInsert is required" },
        { status: 400 }
      );
    }

    const {
      owner_id,
      listing_intent,
      type_id,
      subtype_id,
      title,
      city,
      status,
      is_public,
      is_builder_listing,
      slug,
      builder_project_id,
    } = minimalInsert;

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

    const insertRes = await supabaseAdmin
      .from("property_listings")
      .insert(insertPayload)
      .select("id,status")
      .single();

    if (insertRes.error) {
      return NextResponse.json(
        {
          error: insertRes.error.message,
          details: insertRes.error.details || null,
          hint: insertRes.error.hint || null,
          code: insertRes.error.code || null,
        },
        { status: 500 }
      );
    }

    const newId = String(insertRes.data.id);

    if (extraUpdate && typeof extraUpdate === "object") {
      const cleanExtraUpdate: Record<string, any> = { ...extraUpdate };

      Object.keys(cleanExtraUpdate).forEach((k) => {
        if (cleanExtraUpdate[k] === undefined) {
          delete cleanExtraUpdate[k];
        }
      });

      if (Object.keys(cleanExtraUpdate).length > 0) {
        const updRes = await supabaseAdmin
          .from("property_listings")
          .update(cleanExtraUpdate)
          .eq("id", newId);

        if (updRes.error) {
          return NextResponse.json(
            {
              error: updRes.error.message,
              details: updRes.error.details || null,
              hint: updRes.error.hint || null,
              code: updRes.error.code || null,
              partial_data: insertRes.data,
            },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({
      data: {
        id: newId,
        status: insertRes.data.status || "draft",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: e?.message || "Unknown server error",
      },
      { status: 500 }
    );
  }
}