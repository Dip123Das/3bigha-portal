import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

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

function sanitizeFileName(name: string) {
  return name
    .replace(/[^\w.\- ]+/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 180);
}

function inferUploaderRole(
  room: Record<string, any>,
  userId: string,
  viewerRole: string | null
) {
  if (String(room.investor_user_id || "") === userId) return "investor";
  if (String(room.builder_user_id || "") === userId) return "builder";
  if (isAdminLikeRole(viewerRole)) return "admin";
  return "user";
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

function pickBucketName() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_INVESTMENT_DOCS_BUCKET ||
    process.env.SUPABASE_INVESTMENT_DOCS_BUCKET ||
    "investment-deal-room-documents"
  );
}

export async function GET(
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
      console.error("deal-room documents room fetch error:", roomError);
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

    const { data: docs, error: docsError } = await supabase
      .from("investment_documents")
      .select("*")
      .eq("deal_room_id", id)
      .order("created_at", { ascending: false });

    if (docsError) {
      console.error("deal-room documents fetch error:", docsError);
      return NextResponse.json(
        { error: "Failed to load documents." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        data: Array.isArray(docs) ? docs : [],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("deal-room documents GET route error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
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
      console.error("deal-room documents room fetch error:", roomError);
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
        { error: "Please accept the NDA before uploading documents." },
        { status: 403 }
      );
    }

    const formData = await req.formData().catch(() => null);

    if (!formData) {
      return NextResponse.json(
        { error: "Invalid form data." },
        { status: 400 }
      );
    }

    const file = formData.get("file");
    const titleRaw = String(formData.get("title") || "").trim();
    const kindRaw = String(formData.get("kind") || "").trim();
    const noteRaw = String(formData.get("note") || "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "A file is required." },
        { status: 400 }
      );
    }

    if (!file.name || file.size <= 0) {
      return NextResponse.json(
        { error: "Uploaded file is empty or invalid." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: `File too large. Maximum allowed size is ${Math.floor(
            MAX_FILE_SIZE_BYTES / (1024 * 1024)
          )} MB.`,
        },
        { status: 400 }
      );
    }

    const bucket = pickBucketName();
    const originalName = sanitizeFileName(file.name || "document");
    const ext =
      originalName.includes(".") && originalName.split(".").pop()
        ? `.${String(originalName.split(".").pop())}`
        : "";
    const storagePath = [
      "deal-rooms",
      id,
      user.id,
      `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`,
    ].join("/");

    const arrayBuffer = await file.arrayBuffer();
    const contentType =
      file.type || "application/octet-stream";

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, arrayBuffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error("deal-room documents upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file." },
        { status: 500 }
      );
    }

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

    if (signedUrlError) {
      console.error("deal-room documents signed url error:", signedUrlError);
    }

    const insertPayload: Record<string, any> = {
      deal_room_id: id,
      uploaded_by_user_id: user.id,
      title: titleRaw || originalName,
      kind: kindRaw || "general",
      file_name: originalName,
      file_path: storagePath,
      file_size_bytes: file.size,
      mime_type: contentType,
      bucket_name: bucket,
      uploader_role: inferUploaderRole(room, user.id, viewerRole),
    };

    if (noteRaw) {
      insertPayload.note = noteRaw;
    }

    const { data: createdDoc, error: insertError } = await supabase
      .from("investment_documents")
      .insert(insertPayload)
      .select("*")
      .single();

    if (insertError || !createdDoc) {
      console.error("deal-room documents insert error:", insertError);

      await supabase.storage.from(bucket).remove([storagePath]);

      return NextResponse.json(
        { error: "File uploaded, but failed to save document record." },
        { status: 500 }
      );
    }

    const updatePayload: Record<string, any> = {};
    if ("updated_at" in room) {
      updatePayload.updated_at = new Date().toISOString();
    }

    if (Object.keys(updatePayload).length > 0) {
      await supabase
        .from("investment_deal_rooms")
        .update(updatePayload)
        .eq("id", id);
    }

    return NextResponse.json(
      {
        ok: true,
        message: "Document uploaded successfully.",
        data: {
          ...createdDoc,
          signed_url: signedUrlData?.signedUrl || null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("deal-room documents POST route error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}