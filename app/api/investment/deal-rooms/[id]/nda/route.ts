import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function canManageNda(
  room: Record<string, any> | null,
  userId: string,
  viewerRole: string | null
) {
  if (!room) return false;
  if (isAdminLikeRole(viewerRole)) return true;

  return String(room.builder_user_id || "") === String(userId || "");
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
      console.error("deal-room nda room fetch error:", roomError);
      return NextResponse.json({ error: "Failed to load deal room." }, { status: 500 });
    }

    if (!room) {
      return NextResponse.json({ error: "Deal room not found." }, { status: 404 });
    }

    if (!canManageNda(room, user.id, viewerRole)) {
      return NextResponse.json(
        { error: "You do not have permission to update NDA settings." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    const nextValue = Boolean(body?.nda_required);
    const nowIso = new Date().toISOString();

    const updatePayload: Record<string, any> = {
      nda_required: nextValue,
    };

    if ("updated_at" in room) {
      updatePayload.updated_at = nowIso;
    }

    const { data: updatedRoom, error: updateError } = await supabase
      .from("investment_deal_rooms")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (updateError || !updatedRoom) {
      console.error("deal-room nda update error:", updateError);
      return NextResponse.json({ error: "Failed to update NDA setting." }, { status: 500 });
    }

    await writeSystemMessage(
      supabase,
      id,
      nextValue
        ? "Builder enabled NDA protection for this deal room."
        : "Builder disabled NDA protection for this deal room."
    );

    const normalizedRoom = {
      ...updatedRoom,
      nda_required: Boolean(
        updatedRoom?.nda_required ??
          updatedRoom?.requires_nda ??
          updatedRoom?.is_nda_required
      ),
      current_user_nda_accepted_at:
        updatedRoom?.current_user_nda_accepted_at ??
        updatedRoom?.investor_nda_accepted_at ??
        updatedRoom?.nda_accepted_at ??
        null,
    };

    return NextResponse.json(
      {
        ok: true,
        message: nextValue
          ? "NDA requirement enabled."
          : "NDA requirement disabled.",
        data: normalizedRoom,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("deal-room nda PATCH route error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}