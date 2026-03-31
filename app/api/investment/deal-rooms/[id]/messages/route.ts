import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidDealRoomId(value: string) {
  return Boolean(String(value || "").trim());
}

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

function inferSenderRole(
  room: Record<string, any>,
  userId: string,
  viewerRole: string | null
) {
  if (String(room.investor_user_id || "") === String(userId || "")) return "investor";
  if (String(room.builder_user_id || "") === String(userId || "")) return "builder";
  if (isAdminLikeRole(viewerRole)) return "admin";
  return "user";
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

export async function GET(
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
      console.error("messages room fetch error:", roomError);
      return NextResponse.json({ error: "Failed to load deal room." }, { status: 500 });
    }

    if (!room) {
      return NextResponse.json({ error: "Deal room not found." }, { status: 404 });
    }

    if (!canAccessDealRoom(room, user.id, viewerRole)) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limitParam = Number(searchParams.get("limit") || "100");
    const limit = Number.isFinite(limitParam)
      ? Math.max(1, Math.min(limitParam, 200))
      : 100;

    const { data: messages, error: msgError } = await supabase
      .from("investment_messages")
      .select("*")
      .eq("deal_room_id", id)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (msgError) {
      console.error("messages fetch error:", msgError);
      return NextResponse.json({ error: "Failed to load messages." }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      data: Array.isArray(messages) ? messages : [],
    });
  } catch (error) {
    console.error("messages GET route error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(
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
      console.error("messages room fetch error:", roomError);
      return NextResponse.json({ error: "Failed to load deal room." }, { status: 500 });
    }

    if (!room) {
      return NextResponse.json({ error: "Deal room not found." }, { status: 404 });
    }

    if (!canAccessDealRoom(room, user.id, viewerRole)) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const message = String(body?.message || body?.body || "").trim();
    const meta =
      body?.meta && typeof body.meta === "object" && !Array.isArray(body.meta)
        ? body.meta
        : null;
    const messageType = String(body?.message_type || "text").trim() || "text";

    if (!message) {
      return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
    }

    const senderRole = inferSenderRole(room, user.id, viewerRole);

    const insertPayload: Record<string, any> = {
      deal_room_id: id,
      sender_user_id: user.id,
      sender_role: senderRole,
      body: message,
      message_type: messageType,
    };

    if (meta) {
      insertPayload.meta = meta;
    }

    const { data: createdMessage, error: insertError } = await supabase
      .from("investment_messages")
      .insert(insertPayload)
      .select("*")
      .single();

    if (insertError || !createdMessage) {
      console.error("message insert error:", insertError);
      return NextResponse.json(
        {
          error:
            insertError?.message ||
            insertError?.details ||
            insertError?.hint ||
            "Failed to send message.",
        },
        { status: 500 }
      );
    }

    const nowIso = new Date().toISOString();
    const updatePayload: Record<string, any> = {};

    if ("updated_at" in room) updatePayload.updated_at = nowIso;
    if ("last_message_at" in room) updatePayload.last_message_at = nowIso;
    if ("investor_last_read_at" in room && senderRole === "investor") {
      updatePayload.investor_last_read_at = nowIso;
    }
    if ("builder_last_read_at" in room && senderRole === "builder") {
      updatePayload.builder_last_read_at = nowIso;
    }

    const stageField = resolveStageField(room);
    const currentStage = String(room?.[stageField] || "").trim().toLowerCase();

    if (["interested", "interest_shown", ""].includes(currentStage)) {
      updatePayload[stageField] = "discussion";

      const stageUpdatedAtField = resolveStageUpdatedAtField(room);
      const stageUpdatedByField = resolveStageUpdatedByField(room);

      if (stageUpdatedAtField) updatePayload[stageUpdatedAtField] = nowIso;
      if (stageUpdatedByField) updatePayload[stageUpdatedByField] = user.id;
    }

    if (Object.keys(updatePayload).length > 0) {
      await supabase.from("investment_deal_rooms").update(updatePayload).eq("id", id);
    }

    if (["interested", "interest_shown", ""].includes(currentStage)) {
      await writeSystemMessage(
        supabase,
        id,
        "Deal stage moved to Discussion after the first conversation."
      );
    }

    return NextResponse.json(
      {
        ok: true,
        message: "Message sent.",
        data: createdMessage,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("messages POST route error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}