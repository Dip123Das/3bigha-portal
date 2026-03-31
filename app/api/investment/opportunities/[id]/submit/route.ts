import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resolveOwnerUserId(row: Record<string, any> | null): string | null {
  if (!row) return null;

  const candidates = [
    "owner_user_id",
    "created_by",
    "user_id",
    "investor_user_id",
    "builder_user_id",
    "seller_user_id",
    "created_by_user_id",
  ];

  for (const key of candidates) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return null;
}

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = decodeURIComponent(params?.id || "").trim();

    if (!UUID_RE.test(id)) {
      return NextResponse.json(
        { error: "Invalid investment opportunity id." },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = getSupabaseServerClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const { data: opportunity, error: fetchError } = await supabase
      .from("investment_opportunities")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      console.error("investment opportunity fetch error:", fetchError);
      return NextResponse.json(
        { error: "Failed to load investment opportunity." },
        { status: 500 }
      );
    }

    if (!opportunity) {
      return NextResponse.json(
        { error: "Investment opportunity not found." },
        { status: 404 }
      );
    }

    const ownerUserId = resolveOwnerUserId(opportunity);

    if (!ownerUserId) {
      return NextResponse.json(
        { error: "Unable to verify ownership for this opportunity." },
        { status: 500 }
      );
    }

    if (ownerUserId !== user.id) {
      return NextResponse.json(
        { error: "You do not have permission to submit this opportunity." },
        { status: 403 }
      );
    }

    if (opportunity.status !== "draft") {
      return NextResponse.json(
        { error: "Only draft opportunities can be submitted for review." },
        { status: 400 }
      );
    }

    const { data: currentTerm, error: termError } = await supabase
      .from("investment_terms")
      .select("id")
      .eq("opportunity_id", id)
      .eq("is_current", true)
      .limit(1)
      .maybeSingle();

    if (termError) {
      console.error("investment terms validation error:", termError);
      return NextResponse.json(
        { error: "Failed to validate investment terms." },
        { status: 500 }
      );
    }

    if (!currentTerm) {
      return NextResponse.json(
        {
          error:
            "At least one current investment term is required before submission.",
        },
        { status: 400 }
      );
    }

    const updatePayload: Record<string, any> = {
      status: "pending_review",
    };

    if ("updated_at" in opportunity) {
      updatePayload.updated_at = new Date().toISOString();
    }

    const { data: updated, error: updateError } = await supabase
      .from("investment_opportunities")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      console.error("investment opportunity submit update error:", updateError);
      return NextResponse.json(
        { error: "Failed to submit investment opportunity for review." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        message: "Investment opportunity submitted for review.",
        data: updated,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("investment opportunity submit route error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}