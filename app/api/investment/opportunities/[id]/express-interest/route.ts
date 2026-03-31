import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function resolveViewerRole(supabase: any, userId: string) {
  const tablesToTry = ["profiles", "user_profiles", "users"];

  for (const table of tablesToTry) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (!error && data?.role) {
        return String(data.role);
      }
    } catch {
      // ignore
    }

    try {
      const { data, error } = await supabase
        .from(table)
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (!error && data?.role) {
        return String(data.role);
      }
    } catch {
      // ignore
    }
  }

  return null;
}

function isBuilderLikeRole(role: string | null | undefined) {
  const r = String(role || "").toLowerCase();
  return r === "builder" || r === "vendor" || r === "promoter";
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const opportunityId = decodeURIComponent(params?.id || "").trim();

    if (!UUID_RE.test(opportunityId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid opportunity id." },
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
        {
          ok: false,
          error: "Authentication required.",
          requiresAuth: true,
        },
        { status: 401 }
      );
    }

    const viewerRole = await resolveViewerRole(supabase, user.id);

    const body = await req.json().catch(() => ({}));
    const proposedAmountRaw = body?.proposedAmount;
    const noteRaw = body?.note;

    const proposedAmount =
      proposedAmountRaw === null ||
      proposedAmountRaw === undefined ||
      proposedAmountRaw === ""
        ? null
        : Number(proposedAmountRaw);

    const note =
      typeof noteRaw === "string" ? noteRaw.trim().slice(0, 5000) : "";

    const { data: opportunity, error: oppError } = await supabase
      .from("investment_opportunities")
      .select(
        `
        id,
        title,
        slug,
        status,
        visibility,
        builder_user_id
      `
      )
      .eq("id", opportunityId)
      .maybeSingle();

    if (oppError) {
      console.error("express-interest opportunity fetch error:", oppError);
      return NextResponse.json(
        { ok: false, error: "Failed to load opportunity." },
        { status: 500 }
      );
    }

    if (!opportunity) {
      return NextResponse.json(
        { ok: false, error: "Opportunity not found." },
        { status: 404 }
      );
    }

    if (
      String(opportunity.status || "").toLowerCase() !== "active" ||
      String(opportunity.visibility || "").toLowerCase() !== "public"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "This opportunity is not available for public interest.",
        },
        { status: 400 }
      );
    }

    if (!opportunity.builder_user_id) {
      return NextResponse.json(
        { ok: false, error: "Opportunity builder is missing." },
        { status: 400 }
      );
    }

    if (String(opportunity.builder_user_id) === String(user.id)) {
      return NextResponse.json(
        {
          ok: false,
          error: "You cannot express interest in your own opportunity.",
        },
        { status: 400 }
      );
    }

    if (isBuilderLikeRole(viewerRole)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Builder accounts cannot express interest as investors.",
        },
        { status: 403 }
      );
    }

    const { data: existingRoom, error: existingRoomError } = await supabase
      .from("investment_deal_rooms")
      .select("id, application_id")
      .eq("opportunity_id", opportunityId)
      .eq("builder_user_id", opportunity.builder_user_id)
      .eq("investor_user_id", user.id)
      .in("status", ["active", "open", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingRoomError) {
      console.error("express-interest existing room error:", existingRoomError);
      return NextResponse.json(
        { ok: false, error: "Failed to check existing deal room." },
        { status: 500 }
      );
    }

    if (existingRoom?.id) {
      return NextResponse.json(
        {
          ok: true,
          reused: true,
          dealRoomId: existingRoom.id,
          redirectTo: `/dashboard/investor/deal-rooms/${existingRoom.id}`,
          message: "Existing deal room found.",
        },
        { status: 200 }
      );
    }

    let applicationId: string | null = null;

    const { data: existingApplication, error: existingApplicationError } =
      await supabase
        .from("investment_applications")
        .select("id, status")
        .eq("opportunity_id", opportunityId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (existingApplicationError) {
      console.error(
        "express-interest existing application error:",
        existingApplicationError
      );
      return NextResponse.json(
        { ok: false, error: "Failed to check existing application." },
        { status: 500 }
      );
    }

    if (existingApplication?.id) {
      applicationId = existingApplication.id;
    } else {
      const applicationInsertPayload: Record<string, any> = {
        opportunity_id: opportunityId,
        user_id: user.id,
        status: "deal_room",
      };

      if (proposedAmount !== null && Number.isFinite(proposedAmount)) {
        applicationInsertPayload.proposed_amount = proposedAmount;
      }

      if (note) {
        applicationInsertPayload.note = note;
      }

      const { data: createdApplication, error: applicationInsertError } =
        await supabase
          .from("investment_applications")
          .insert(applicationInsertPayload)
          .select("id")
          .single();

      if (applicationInsertError || !createdApplication?.id) {
        console.error(
          "express-interest application insert error:",
          applicationInsertError
        );
        return NextResponse.json(
          { ok: false, error: "Failed to create application." },
          { status: 500 }
        );
      }

      applicationId = createdApplication.id;
    }

    const { data: createdRoom, error: roomInsertError } = await supabase
      .from("investment_deal_rooms")
      .insert({
        opportunity_id: opportunityId,
        application_id: applicationId,
        builder_user_id: opportunity.builder_user_id,
        investor_user_id: user.id,
        status: "active",
        stage: "discussion",
      })
      .select("id")
      .single();

    if (roomInsertError || !createdRoom?.id) {
      console.error("express-interest room insert error:", roomInsertError);
      return NextResponse.json(
        { ok: false, error: "Failed to create deal room." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        reused: false,
        dealRoomId: createdRoom.id,
        applicationId,
        redirectTo: `/dashboard/investor/deal-rooms/${createdRoom.id}`,
        message: "Interest expressed successfully.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("express-interest route error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}