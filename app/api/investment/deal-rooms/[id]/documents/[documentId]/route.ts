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

function canDeleteDocument(
  doc: Record<string, any> | null,
  room: Record<string, any> | null,
  userId: string,
  viewerRole: string | null
) {
  if (!doc || !room) return false;
  if (isAdminLikeRole(viewerRole)) return true;

  const uploaderId = String(doc.uploaded_by_user_id || "");
  if (uploaderId && uploaderId === userId) return true;

  return false;
}

function pickBucketName(doc: Record<string, any> | null) {
  return (
    String(doc?.bucket_name || "").trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_INVESTMENT_DOCS_BUCKET ||
    process.env.SUPABASE_INVESTMENT_DOCS_BUCKET ||
    "investment-deal-room-documents"
  );
}

function getInvestorNdaLockState(
  room: Record<string, any> | null,
  userId: string
) {
  const ndaRequired = Boolean(
    room?.nda_required ??
      room?.requires_nda ??
      room?.is_nda_required
  );

  const ndaAccepted = Boolean(
    room?.investor_nda_accepted_at ??
      room?.current_user_nda_accepted_at ??
      room?.nda_accepted_at ??
      room?.has_accepted_nda ??
      room?.nda_accepted
  );

  const isInvestorUser =
    String(room?.investor_user_id || "") === String(userId || "");

  return {
    ndaRequired,
    ndaAccepted,
    isInvestorUser,
    isNdaLockedForInvestor: ndaRequired && isInvestorUser && !ndaAccepted,
  };
}

async function loadRoomAndDocument(
  supabase: any,
  dealRoomId: string,
  documentId: string
) {
  const { data: room, error: roomError } = await supabase
    .from("investment_deal_rooms")
    .select("*")
    .eq("id", dealRoomId)
    .maybeSingle();

  if (roomError) {
    return { room: null, doc: null, roomError, docError: null };
  }

  const { data: doc, error: docError } = await supabase
    .from("investment_documents")
    .select("*")
    .eq("id", documentId)
    .eq("deal_room_id", dealRoomId)
    .maybeSingle();

  return { room, doc, roomError: null, docError };
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string; documentId: string } }
) {
  try {
    const dealRoomId = decodeURIComponent(params?.id || "").trim();
    const documentId = decodeURIComponent(params?.documentId || "").trim();

    if (!UUID_RE.test(dealRoomId) || !UUID_RE.test(documentId)) {
      return NextResponse.json(
        { error: "Invalid deal room id or document id." },
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

    const { room, doc, roomError, docError } = await loadRoomAndDocument(
      supabase,
      dealRoomId,
      documentId
    );

    if (roomError) {
      console.error("document detail room fetch error:", roomError);
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

    const { isNdaLockedForInvestor } = getInvestorNdaLockState(room, user.id);

    if (isNdaLockedForInvestor) {
      return NextResponse.json(
        { error: "Please accept the NDA before opening documents." },
        { status: 403 }
      );
    }

    if (docError) {
      console.error("document detail fetch error:", docError);
      return NextResponse.json(
        { error: "Failed to load document." },
        { status: 500 }
      );
    }

    if (!doc) {
      return NextResponse.json(
        { error: "Document not found." },
        { status: 404 }
      );
    }

    let signedUrl: string | null = null;
    const filePath = String(doc.file_path || "").trim();

    if (filePath) {
      const bucket = pickBucketName(doc);
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 60 * 60);

      if (signedUrlError) {
        console.error("document signed url error:", signedUrlError);
      } else {
        signedUrl = signedUrlData?.signedUrl || null;
      }
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          ...doc,
          signed_url: signedUrl,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("document detail GET route error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; documentId: string } }
) {
  try {
    const dealRoomId = decodeURIComponent(params?.id || "").trim();
    const documentId = decodeURIComponent(params?.documentId || "").trim();

    if (!UUID_RE.test(dealRoomId) || !UUID_RE.test(documentId)) {
      return NextResponse.json(
        { error: "Invalid deal room id or document id." },
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

    const { room, doc, roomError, docError } = await loadRoomAndDocument(
      supabase,
      dealRoomId,
      documentId
    );

    if (roomError) {
      console.error("document delete room fetch error:", roomError);
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

    if (docError) {
      console.error("document delete fetch error:", docError);
      return NextResponse.json(
        { error: "Failed to load document." },
        { status: 500 }
      );
    }

    if (!doc) {
      return NextResponse.json(
        { error: "Document not found." },
        { status: 404 }
      );
    }

    if (!canDeleteDocument(doc, room, user.id, viewerRole)) {
      return NextResponse.json(
        { error: "You do not have permission to delete this document." },
        { status: 403 }
      );
    }

    const bucket = pickBucketName(doc);
    const filePath = String(doc.file_path || "").trim();

    const { error: deleteDbError } = await supabase
      .from("investment_documents")
      .delete()
      .eq("id", documentId)
      .eq("deal_room_id", dealRoomId);

    if (deleteDbError) {
      console.error("document delete db error:", deleteDbError);
      return NextResponse.json(
        { error: "Failed to delete document record." },
        { status: 500 }
      );
    }

    if (filePath) {
      const { error: storageDeleteError } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (storageDeleteError) {
        console.error("document delete storage error:", storageDeleteError);
      }
    }

    const updatePayload: Record<string, any> = {};
    if ("updated_at" in room) {
      updatePayload.updated_at = new Date().toISOString();
    }

    if (Object.keys(updatePayload).length > 0) {
      await supabase
        .from("investment_deal_rooms")
        .update(updatePayload)
        .eq("id", dealRoomId);
    }

    return NextResponse.json(
      {
        ok: true,
        message: "Document deleted successfully.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("document detail DELETE route error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}