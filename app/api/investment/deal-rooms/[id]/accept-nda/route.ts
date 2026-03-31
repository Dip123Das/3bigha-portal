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

      if (!error && data?.role) {
        return String(data.role);
      }
    } catch {}

    try {
      const { data, error } = await supabase
        .from(table)
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (!error && data?.role) {
        return String(data.role);
      }
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
    String(room.investor_user_id || "") === userId ||
    String(room.builder_user_id || "") === userId
  );
}

function canAcceptNda(
  room: Record<string, any> | null,
  userId: string,
  viewerRole: string | null
) {
  if (!room) return false;
  if (isAdminLikeRole(viewerRole)) return true;

  return String(room.investor_user_id || "") === userId;
}

function resolveNdaRequiredField(room: Record<string, any> | null) {
  if (!room) return "nda_required";

  const candidates = [
    "nda_required",
    "is_nda_required",
    "requires_nda",
  ];

  for (const key of candidates) {
    if (key in room) return key;
  }

  return "nda_required";
}

function resolveNdaAcceptedField(room: Record<string, any> | null) {
  if (!room) return "nda_accepted_by_investor";

  const candidates = [
    "nda_accepted_by_investor",
    "investor_nda_accepted",
    "nda_accepted",
  ];

  for (const key of candidates) {
    if (key in room) return key;
  }

  return "nda_accepted_by_investor";
}

function resolveNdaAcceptedAtField(room: Record<string, any> | null) {
  if (!room) return "nda_accepted_at";

  const candidates = [
    "nda_accepted_at",
    "investor_nda_accepted_at",
  ];

  for (const key of candidates) {
    if (key in room) return key;
  }

  return "nda_accepted_at";
}

function resolveNdaAcceptedByField(room: Record<string, any> | null) {
  if (!room) return null;

  const candidates = [
    "nda_accepted_by_user_id",
    "nda_accepted_by",
  ];

  for (const key of candidates) {
    if (key in room) return key;
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

    const { data: room, error: roomError } = await supabase
      .from("investment_deal_rooms")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (roomError) {
      console.error("accept-nda room fetch error:", roomError);
      return NextResponse.json(
        { error: "Failed to load deal room." },
        { status: 500 }
      );
    }

    if (!room) {
      return NextResponse.json(
        { error: "Deal room not found." },
        { status: 404 }
      );
    }

    if (!canAccessDealRoom(room, user.id, viewerRole)) {
      return NextResponse.json(
        { error: "Access denied." },
        { status: 403 }
      );
    }

    if (!canAcceptNda(room, user.id, viewerRole)) {
      return NextResponse.json(
        { error: "Only the investor can accept the NDA." },
        { status: 403 }
      );
    }

    const ndaRequiredField = resolveNdaRequiredField(room);
    const ndaAcceptedField = resolveNdaAcceptedField(room);
    const ndaAcceptedAtField = resolveNdaAcceptedAtField(room);
    const ndaAcceptedByField = resolveNdaAcceptedByField(room);

    const ndaRequired = Boolean(room?.[ndaRequiredField]);

    if (!ndaRequired) {
      return NextResponse.json(
        {
          ok: true,
          message: "NDA is not required for this deal room.",
          data: room,
        },
        { status: 200 }
      );
    }

    const alreadyAccepted = Boolean(room?.[ndaAcceptedField]);

    if (alreadyAccepted) {
      return NextResponse.json(
        {
          ok: true,
          message: "NDA already accepted.",
          data: room,
        },
        { status: 200 }
      );
    }

    const updatePayload: Record<string, any> = {
      [ndaAcceptedField]: true,
      [ndaAcceptedAtField]: new Date().toISOString(),
    };

    if (ndaAcceptedByField) {
      updatePayload[ndaAcceptedByField] = user.id;
    }

    if ("updated_at" in room) {
      updatePayload.updated_at = new Date().toISOString();
    }

    const { data: updatedRoom, error: updateError } = await supabase
      .from("investment_deal_rooms")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single();

    if (updateError || !updatedRoom) {
      console.error("accept-nda update error:", updateError);
      return NextResponse.json(
        { error: "Failed to accept NDA." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        message: "NDA accepted successfully.",
        data: updatedRoom,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("accept-nda route error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}