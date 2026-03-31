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

export async function POST(
  _req: Request,
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
      return NextResponse.json({ error: "Failed to load deal room." }, { status: 500 });
    }

    if (!room) {
      return NextResponse.json({ error: "Deal room not found." }, { status: 404 });
    }

    if (!canAccessDealRoom(room, user.id, viewerRole)) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const nowIso = new Date().toISOString();
    const updatePayload: Record<string, any> = {};

    if (String(room.investor_user_id || "") === String(user.id || "")) {
      if ("investor_last_read_at" in room) {
        updatePayload.investor_last_read_at = nowIso;
      }
    }

    if (String(room.builder_user_id || "") === String(user.id || "")) {
      if ("builder_last_read_at" in room) {
        updatePayload.builder_last_read_at = nowIso;
      }
    }

    if (Object.keys(updatePayload).length > 0) {
      const { error: updateError } = await supabase
        .from("investment_deal_rooms")
        .update(updatePayload)
        .eq("id", id);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message || "Failed to update seen state." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Seen state updated.",
      seen_at: nowIso,
      data: updatePayload,
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}