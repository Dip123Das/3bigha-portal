import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

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
    } catch {
      // ignore
    }

    try {
      const { data, error } = await supabase
        .from(table)
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (!error && data?.role) return String(data.role);
    } catch {
      // ignore
    }
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

function normalizeStageToStatus(stage: string | null | undefined) {
  const value = String(stage || "").toLowerCase();

  if (!value) return "active";
  if (["closed", "completed"].includes(value)) return "closed";
  if (value === "pending") return "pending";

  return "active";
}

async function buildUserMap(supabase: any, userIds: string[]) {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  const userMap: Record<string, any> = {};

  if (!uniqueUserIds.length) return userMap;

  for (const table of ["profiles", "user_profiles", "users"]) {
    try {
      let users: any[] = [];

      try {
        const { data } = await supabase
          .from(table)
          .select("id, name, full_name, email")
          .in("id", uniqueUserIds);

        if (Array.isArray(data) && data.length) {
          users = data.map((u) => ({ ...u, __resolved_user_id: u.id }));
        }
      } catch {
        // ignore
      }

      if (!users.length) {
        try {
          const { data } = await supabase
            .from(table)
            .select("user_id, name, full_name, email")
            .in("user_id", uniqueUserIds);

          if (Array.isArray(data) && data.length) {
            users = data.map((u) => ({
              ...u,
              __resolved_user_id: u.user_id,
            }));
          }
        } catch {
          // ignore
        }
      }

      if (users.length) {
        for (const u of users) {
          const uid = String(u.__resolved_user_id || "").trim();
          if (!uid) continue;
          userMap[uid] = u;
        }
        break;
      }
    } catch {
      // ignore
    }
  }

  return userMap;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = decodeURIComponent(params?.id || "").trim();

    if (!isValidDealRoomId(id)) {
      return NextResponse.json(
        { error: "Invalid deal room id." },
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

    const viewerRole = await resolveViewerRole(supabase, user.id);

    const { data: room, error } = await supabase
      .from("investment_deal_rooms")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("deal-room fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!room) {
      return NextResponse.json(
        { error: "Deal room not found." },
        { status: 404 }
      );
    }

    if (!canAccessDealRoom(room, user.id, viewerRole)) {
      return NextResponse.json(
        { error: "You do not have permission to access this deal room." },
        { status: 403 }
      );
    }

    const userMap = await buildUserMap(supabase, [
      room?.investor_user_id,
      room?.builder_user_id,
    ]);

    const investor = userMap[String(room?.investor_user_id || "")] || null;
    const builder = userMap[String(room?.builder_user_id || "")] || null;

    const resolvedViewerRole =
      String(room?.builder_user_id || "") === String(user.id || "")
        ? "builder"
        : String(room?.investor_user_id || "") === String(user.id || "")
        ? "investor"
        : isAdminLikeRole(viewerRole)
        ? String(viewerRole || "admin")
        : null;

    const redirect_path =
      resolvedViewerRole === "builder"
        ? `/dashboard/builder/deal-rooms/${encodeURIComponent(String(room?.id || ""))}`
        : `/dashboard/investor/deal-rooms/${encodeURIComponent(String(room?.id || ""))}`;

    const normalizedRoom = {
      ...room,
      status:
        String(room?.status || "").trim() || normalizeStageToStatus(room?.stage),

      opportunity_title:
        room?.opportunity_title ??
        room?.opportunity_snapshot?.opportunity_title ??
        room?.opportunity_snapshot?.title ??
        null,

      opportunity_slug: room?.opportunity_slug ?? null,

      nda_required: Boolean(
        room?.nda_required ??
          room?.requires_nda ??
          room?.is_nda_required
      ),

      current_user_nda_accepted_at:
        resolvedViewerRole === "builder"
          ? room?.builder_nda_accepted_at ??
            room?.current_user_nda_accepted_at ??
            room?.nda_accepted_at ??
            null
          : room?.investor_nda_accepted_at ??
            room?.current_user_nda_accepted_at ??
            room?.nda_accepted_at ??
            null,

      viewer_role: resolvedViewerRole,
      redirect_path,
      redirectPath: redirect_path,

      investor_name: investor?.name ?? investor?.full_name ?? null,
      investor_email: investor?.email ?? null,

      builder_name: builder?.name ?? builder?.full_name ?? null,
      builder_email: builder?.email ?? null,
    };

    return NextResponse.json({
      ok: true,
      data: normalizedRoom,
    });
  } catch (error: any) {
    console.error("deal-room detail error:", error);
    return NextResponse.json(
      { error: error?.message || "Server error" },
      { status: 500 }
    );
  }
}