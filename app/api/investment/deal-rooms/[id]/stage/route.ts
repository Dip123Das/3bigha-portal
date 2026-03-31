import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ALLOWED_STAGES = new Set([
  "interested",
  "discussion",
  "due_diligence",
  "negotiation",
  "term_sheet",
  "closed",
  "dropped",
]);

function isAdminLikeRole(role: string | null | undefined) {
  const r = String(role || "").toLowerCase();
  return (
    r === "admin" ||
    r === "super_admin" ||
    r === "master_admin" ||
    r === "investment_admin"
  );
}

async function resolveViewerRole(supabase: any, userId: string) {
  const tablesToTry = ["profiles", "user_profiles", "users"];

  for (const table of tablesToTry) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (!error && data?.role) return String(data.role);
    } catch {}

    try {
      const { data, error } = await supabase
        .from(table)
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (!error && data?.role) return String(data.role);
    } catch {}
  }

  return null;
}

function canAccessDealRoom(
  room: Record<string, any> | null,
  userId: string,
  viewerRole: string | null
) {
  if (!room) return false;
  if (isAdminLikeRole(viewerRole)) return true;

  return (
    String(room.investor_user_id || "") === String(userId || "") ||
    String(room.builder_user_id || "") === String(userId || "")
  );
}

function canUpdateStage(
  room: Record<string, any> | null,
  userId: string,
  viewerRole: string | null
) {
  if (!room) return false;
  if (isAdminLikeRole(viewerRole)) return true;

  return String(room.builder_user_id || "") === String(userId || "");
}

function resolveStageField(room: Record<string, any> | null) {
  if (!room) return "stage";

  for (const key of ["stage", "deal_stage", "pipeline_stage", "current_stage"]) {
    if (key in room) return key;
  }

  return "stage";
}

function resolveStageUpdatedAtField(room: Record<string, any> | null) {
  if (!room) return null;

  for (const key of ["stage_updated_at", "deal_stage_updated_at"]) {
    if (key in room) return key;
  }

  return null;
}

function resolveStageUpdatedByField(room: Record<string, any> | null) {
  if (!room) return null;

  for (const key of ["stage_updated_by", "deal_stage_updated_by", "updated_by"]) {
    if (key in room) return key;
  }

  return null;
}

function normalizeStageToStatus(stage: string | null | undefined) {
  const value = String(stage || "").toLowerCase();
  if (!value) return "active";
  if (["closed", "completed"].includes(value)) return "closed";
  if (["dropped", "cancelled", "rejected"].includes(value)) return "dropped";
  return "active";
}

async function writeSystemMessage(
  supabase: any,
  dealRoomId: string,
  body: string
) {
  try {
    await supabase.from("investment_messages").insert({
      deal_room_id: dealRoomId,
      sender_user_id: null,
      sender_role: "system",
      message_type: "system",
      body,
    });
  } catch {
    // ignore
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = decodeURIComponent(params?.id || "").trim();

    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "Invalid deal room id." }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = getSupabaseServerClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const viewerRole = await resolveViewerRole(supabase, user.id);

    const { data: room, error: roomError } = await supabase
      .from("investment_deal_rooms")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (roomError) {
      console.error("deal-room stage room fetch error:", roomError);
      return NextResponse.json({ error: "Failed to load deal room." }, { status: 500 });
    }

    if (!room) {
      return NextResponse.json({ error: "Deal room not found." }, { status: 404 });
    }

    if (!canAccessDealRoom(room, user.id, viewerRole)) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    if (!canUpdateStage(room, user.id, viewerRole)) {
      return NextResponse.json(
        { error: "Only the builder can update deal stage." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    const nextStage = String(body?.stage || "").trim().toLowerCase();

    if (!nextStage) {
      return NextResponse.json({ error: "Stage is required." }, { status: 400 });
    }

    if (!ALLOWED_STAGES.has(nextStage)) {
      return NextResponse.json(
        {
          error:
            "Invalid stage. Allowed stages: interested, discussion, due_diligence, negotiation, term_sheet, closed, dropped.",
        },
        { status: 400 }
      );
    }

    const stageField = resolveStageField(room);
    const stageUpdatedAtField = resolveStageUpdatedAtField(room);
    const stageUpdatedByField = resolveStageUpdatedByField(room);

    const currentStage = String(room?.[stageField] || "").trim().toLowerCase();
    if (currentStage === nextStage) {
      return NextResponse.json({
        ok: true,
        message: "Deal stage already set.",
        data: {
          ...room,
          status: room?.status ?? normalizeStageToStatus(room?.[stageField]),
        },
      });
    }

    const nowIso = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      [stageField]: nextStage,
    };

    if ("updated_at" in room) updatePayload.updated_at = nowIso;
    if (stageUpdatedAtField) updatePayload[stageUpdatedAtField] = nowIso;
    if (stageUpdatedByField) updatePayload[stageUpdatedByField] = user.id;

    const { data: updatedRoom, error: updateError } = await supabase
      .from("investment_deal_rooms")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single();

    if (updateError || !updatedRoom) {
      console.error("deal-room stage update error:", updateError);
      return NextResponse.json({ error: "Failed to update deal stage." }, { status: 500 });
    }

    await writeSystemMessage(
      supabase,
      id,
      `Deal stage updated from ${
        currentStage || "interested"
      } to ${nextStage}.`
    );

    return NextResponse.json({
      ok: true,
      message: "Deal stage updated successfully.",
      data: {
        ...updatedRoom,
        status: updatedRoom?.status ?? normalizeStageToStatus(updatedRoom?.[stageField]),
      },
    });
  } catch (error) {
    console.error("deal-room stage PATCH route error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}