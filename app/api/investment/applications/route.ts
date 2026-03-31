import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { ensureInvestmentDealRoom } from "@/lib/investment/ensureInvestmentDealRoom";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = getSupabaseServerClient(cookieStore);

    const {
      opportunity_id,
      message,
      proposed_amount,
    }: {
      opportunity_id?: string;
      message?: string | null;
      proposed_amount?: string | number | null;
    } = await req.json();

    const safeOpportunityId = String(opportunity_id || "").trim();
    const safeMessage = typeof message === "string" ? message.trim() : null;
    const safeProposedAmount =
      proposed_amount === null || proposed_amount === undefined
        ? null
        : String(proposed_amount).trim() || null;

    if (!safeOpportunityId) {
      return NextResponse.json(
        { error: "opportunity_id is required." },
        { status: 400 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "You must be logged in." },
        { status: 401 }
      );
    }

    const investor_user_id = user.id;

    const { data: opportunity, error: oppError } = await supabase
      .from("investment_opportunities")
      .select("id, created_by_user_id, title, slug, status")
      .eq("id", safeOpportunityId)
      .single();

    if (oppError || !opportunity) {
      return NextResponse.json(
        { error: "Opportunity not found." },
        { status: 404 }
      );
    }

    if (
      opportunity.status &&
      !["open", "active", "published"].includes(String(opportunity.status))
    ) {
      return NextResponse.json(
        { error: "This opportunity is not currently open for applications." },
        { status: 400 }
      );
    }

    const builder_user_id = String(opportunity.created_by_user_id || "").trim();

    if (!builder_user_id) {
      return NextResponse.json(
        { error: "Opportunity owner is missing." },
        { status: 400 }
      );
    }

    if (builder_user_id === investor_user_id) {
      return NextResponse.json(
        { error: "You cannot apply to your own opportunity." },
        { status: 400 }
      );
    }

    let applicationId: string | null = null;
    let applicationAlreadyExisted = false;

    const { data: existingApplication, error: existingAppError } = await supabase
      .from("investment_applications")
      .select("id")
      .eq("opportunity_id", safeOpportunityId)
      .eq("investor_user_id", investor_user_id)
      .maybeSingle();

    if (existingAppError) {
      return NextResponse.json(
        { error: existingAppError.message },
        { status: 500 }
      );
    }

    if (existingApplication) {
      applicationId = existingApplication.id;
      applicationAlreadyExisted = true;
    } else {
      const insertPayload: Record<string, any> = {
        opportunity_id: safeOpportunityId,
        investor_user_id,
        builder_user_id,
        message: safeMessage,
        status: "pending",
      };

      if (safeProposedAmount !== null) {
        insertPayload.proposed_amount = safeProposedAmount;
      }

      const { data: insertedApplication, error: insertAppError } = await supabase
        .from("investment_applications")
        .insert(insertPayload)
        .select("id")
        .single();

      if (insertAppError || !insertedApplication) {
        return NextResponse.json(
          { error: insertAppError?.message || "Failed to create application." },
          { status: 500 }
        );
      }

      applicationId = insertedApplication.id;
    }

    const dealRoomResult = await ensureInvestmentDealRoom({
      supabase,
      opportunity_id: safeOpportunityId,
      investor_user_id,
      builder_user_id,
    });

    if (!dealRoomResult.ok) {
      return NextResponse.json(
        { error: dealRoomResult.error || "Failed to create deal room." },
        { status: 500 }
      );
    }

    const safeDealRoomId = String(dealRoomResult.dealRoomId || "").trim();
    const redirect_path = `/dashboard/investor/deal-rooms/${encodeURIComponent(
      safeDealRoomId
    )}`;

    return NextResponse.json({
      ok: true,
      application_id: applicationId,
      application_already_existed: applicationAlreadyExisted,
      deal_room_id: safeDealRoomId,
      dealRoomId: safeDealRoomId,
      deal_room_already_existed: dealRoomResult.alreadyExisted,
      redirect_path,
      redirectPath: redirect_path,
      message: applicationAlreadyExisted
        ? "Application already existed. Existing deal room opened."
        : "Application created and deal room ready.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unexpected server error." },
      { status: 500 }
    );
  }
}