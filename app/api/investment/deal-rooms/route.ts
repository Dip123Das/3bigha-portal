import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

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

function normalizeStatusFilter(input: string | null) {
  const value = String(input || "").trim().toLowerCase();

  if (!value || value === "all") return null;

  if (value === "open") {
    return ["interest_shown", "discussion"];
  }

  if (value === "closed") {
    return ["closed", "completed"];
  }

  return [value];
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

export async function GET(req: Request) {
  try {
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
    const { searchParams } = new URL(req.url);

    const roleParam = String(searchParams.get("role") || "")
      .trim()
      .toLowerCase();
    const statusParam = searchParams.get("status");
    const normalizedStatuses = normalizeStatusFilter(statusParam);

    let query = supabase.from("investment_deal_rooms").select("*");

    if (isAdminLikeRole(viewerRole)) {
      if (roleParam === "builder") {
        query = query.eq("builder_user_id", user.id);
      } else if (roleParam === "investor") {
        query = query.eq("investor_user_id", user.id);
      }
    } else if (roleParam === "builder") {
      query = query.eq("builder_user_id", user.id);
    } else if (roleParam === "investor") {
      query = query.eq("investor_user_id", user.id);
    } else if (
      ["builder", "promoter", "vendor"].includes(
        String(viewerRole || "").toLowerCase()
      )
    ) {
      query = query.eq("builder_user_id", user.id);
    } else {
      query = query.eq("investor_user_id", user.id);
    }

    if (normalizedStatuses?.length === 1) {
      query = query.eq("stage", normalizedStatuses[0]);
    } else if (normalizedStatuses?.length) {
      query = query.in("stage", normalizedStatuses);
    }

    const { data, error } = await query;

    if (error) {
      console.error("deal-rooms error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = Array.isArray(data) ? data : [];

    const userIds = rows.flatMap((r: any) => [
      r?.investor_user_id,
      r?.builder_user_id,
    ]);

    const userMap = await buildUserMap(supabase, userIds);

    const normalizedRows = rows.map((room: any) => {
      const investor = userMap[String(room?.investor_user_id || "")] || null;
      const builder = userMap[String(room?.builder_user_id || "")] || null;

      return {
        ...room,
        status: room?.status ?? normalizeStageToStatus(room?.stage),

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
          room?.current_user_nda_accepted_at ??
          room?.investor_nda_accepted_at ??
          room?.nda_accepted_at ??
          null,

        investor_name: investor?.name ?? investor?.full_name ?? null,
        investor_email: investor?.email ?? null,

        builder_name: builder?.name ?? builder?.full_name ?? null,
        builder_email: builder?.email ?? null,
      };
    });

    return NextResponse.json({
      ok: true,
      data: normalizedRows,
    });
  } catch (err: any) {
    console.error("deal-room route crash:", err);
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}