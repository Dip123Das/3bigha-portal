type EnsureInvestmentDealRoomArgs = {
  supabase: any;
  opportunity_id: string;
  investor_user_id: string;
  builder_user_id: string;
  initial_stage?: string;
};

type EnsureInvestmentDealRoomResult =
  | {
      ok: true;
      dealRoomId: string;
      alreadyExisted: boolean;
    }
  | {
      ok: false;
      error: string;
    };

  export async function ensureInvestmentDealRoom({
    supabase,
    opportunity_id,
    investor_user_id,
    builder_user_id,
    initial_stage = "interest_shown",
  }: EnsureInvestmentDealRoomArgs): Promise<EnsureInvestmentDealRoomResult> {
  const safeOpportunityId = String(opportunity_id || "").trim();
  const safeInvestorUserId = String(investor_user_id || "").trim();
  const safeBuilderUserId = String(builder_user_id || "").trim();
  const safeInitialStage = String(initial_stage || "interest_shown").trim();

    if (!safeOpportunityId || !safeInvestorUserId || !safeBuilderUserId) {
      return {
        ok: false,
        error: "Missing required deal room fields.",
      };
    }
  const { data: existingRoom, error: existingRoomError } = await supabase
    .from("investment_deal_rooms")
    .select("id,status")
    .eq("opportunity_id", safeOpportunityId)
    .eq("investor_user_id", safeInvestorUserId)
    .eq("builder_user_id", safeBuilderUserId)
    .not("status", "in", '("closed","completed","cancelled","rejected","dropped")')
    .maybeSingle();

  if (existingRoomError) {
    return {
      ok: false,
      error: existingRoomError.message,
    };
  }

  if (existingRoom) {
    return {
      ok: true,
      dealRoomId: existingRoom.id,
      alreadyExisted: true,
    };
  }

  const { data: insertedRoom, error: insertRoomError } = await supabase
    .from("investment_deal_rooms")
    .insert({
      opportunity_id: safeOpportunityId,
      investor_user_id: safeInvestorUserId,
      builder_user_id: safeBuilderUserId,
      stage: safeInitialStage,
      status: "active",
    })
    .select("id")
    .single();

  if (insertRoomError || !insertedRoom) {
  const { data: retryRoom, error: retryRoomError } = await supabase
    .from("investment_deal_rooms")
    .select("id,status")
    .eq("opportunity_id", safeOpportunityId)
    .eq("investor_user_id", safeInvestorUserId)
    .eq("builder_user_id", safeBuilderUserId)
    .not("status", "in", '("closed","completed","cancelled","rejected","dropped")')
    .maybeSingle();

  if (retryRoom && !retryRoomError) {
    return {
      ok: true,
      dealRoomId: retryRoom.id,
      alreadyExisted: true,
    };
  }

  return {
    ok: false,
    error: insertRoomError?.message || retryRoomError?.message || "Failed to create deal room.",
  };
}

  return {
    ok: true,
    dealRoomId: insertedRoom.id,
    alreadyExisted: false,
  };
}