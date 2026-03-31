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
    const supabaseAdmin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);

    const page = Math.max(0, Number(searchParams.get("page") || "0"));
    const pageSize = Math.max(
      1,
      Math.min(50, Number(searchParams.get("pageSize") || "20"))
    );

    const from = page * pageSize;
    const to = from + pageSize - 1;

    const cols = [
      "id",
      "title",
      "slug",
      "listing_intent",
      "type_id",
      "subtype_id",
      "expected_price",
      "price",
      "city",
      "state",
      "owner_id",
      "owner_user_id",
      "status",
      "updated_at",
      "published_at",
      "is_public",
    ];

    let workingCols = [...cols];

    for (let i = 0; i < 8; i++) {
      const selectCols = workingCols.join(",");

      let query = supabaseAdmin
        .from("property_listings")
        .select(selectCols)
        .eq("status", "published")
        .order("updated_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to);

      if (workingCols.includes("is_public")) {
        query = query.eq("is_public", true);
      }
      if (workingCols.includes("published_at")) {
        query = query.not("published_at", "is", null);
      }

      const res = await query;

      if (!res.error) {
        return NextResponse.json({
          data: res.data ?? [],
          usedCols: workingCols,
        });
      }

      const msg = String(res.error.message || "").toLowerCase();
      const missingLike =
        msg.includes("schema cache") ||
        msg.includes("could not find the") ||
        msg.includes("does not exist") ||
        msg.includes("unknown field");

      if (!missingLike) {
        return NextResponse.json(
          {
            error: res.error.message || "Could not load public listings",
          },
          { status: 500 }
        );
      }

      const m1 = String(res.error.message || "").match(
        /could not find the '([^']+)' column/i
      );
      const m2 = String(res.error.message || "").match(
        /column "([^"]+)" .* does not exist/i
      );
      const missing = m1?.[1] || m2?.[1] || null;

      if (missing && workingCols.includes(missing)) {
        workingCols = workingCols.filter((c) => c !== missing);
        continue;
      }

      return NextResponse.json(
        {
          error:
            res.error.message || "Could not resolve property_listings columns",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: "Could not resolve property_listings columns.",
      },
      { status: 500 }
    );
  } catch (e: any) {
    return NextResponse.json(
      {
        error: e?.message || "Unknown server error",
      },
      { status: 500 }
    );
  }
}