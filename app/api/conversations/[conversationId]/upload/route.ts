import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

const BUCKET = "conversation-attachments";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(v?: string | null) {
  return UUID_RE.test(String(v ?? "").trim());
}

type RouteContext = {
  params: {
    conversationId: string;
  };
};

const ALLOWED_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "pdf",
  "txt",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "zip",
  "mp3",
  "wav",
  "m4a",
  "webm",
]);

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/x-zip-compressed",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/m4a",
  "audio/webm",
  "video/webm",
]);

function sanitizeFileName(name: string) {
  return String(name || "file")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9.\-_]/g, "");
}

function detectMessageType(file: File): "image" | "file" | "audio" {
  const mime = String(file.type || "").toLowerCase();

  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";

  return "file";
}

function getFileExtension(name: string) {
  const clean = String(name || "").trim().toLowerCase();
  if (!clean.includes(".")) return "";
  return clean.split(".").pop() || "";
}

function isAllowedUpload(file: File) {
  const mime = String(file.type || "").trim().toLowerCase();
  const ext = getFileExtension(file.name || "");

  const mimeAllowed = mime ? ALLOWED_MIME_TYPES.has(mime) : false;
  const extAllowed = ext ? ALLOWED_EXTENSIONS.has(ext) : false;

  return mimeAllowed || extAllowed;
}

function buildPublicUrl(baseUrl: string, bucket: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${bucket}/${path}`;
}

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const cookieStore = await cookies();
    const supabase = getSupabaseServerClient(cookieStore);

    const conversationId = decodeURIComponent(params.conversationId || "").trim();

    if (!conversationId) {
      return NextResponse.json({ error: "Missing conversationId." }, { status: 400 });
    }

    if (!isUuid(conversationId)) {
      return NextResponse.json({ error: "Invalid conversationId." }, { status: 400 });
    }

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const convRes = await supabase
      .from("conversations")
      .select("id,buyer_user_id,vendor_user_id")
      .eq("id", conversationId)
      .maybeSingle();

    if (convRes.error) {
      return NextResponse.json(
        { error: convRes.error.message || "Failed to validate conversation." },
        { status: 500 }
      );
    }

    const conv = convRes.data;

    if (!conv) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }

    const isParticipant =
      String(conv.buyer_user_id ?? "") === String(user.id) ||
      String(conv.vendor_user_id ?? "") === String(user.id);

    if (!isParticipant) {
      return NextResponse.json(
        { error: "You are not a participant of this conversation." },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const fileValue = formData.get("file");

    if (!(fileValue instanceof File)) {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }

    const file = fileValue;

    if (!file.size || file.size <= 0) {
      return NextResponse.json({ error: "Uploaded file is empty." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum allowed size is 10 MB." },
        { status: 400 }
      );
    }

    if (!isAllowedUpload(file)) {
      return NextResponse.json(
        {
          error:
            "File type not allowed. Allowed types: images, PDF, TXT, DOC, DOCX, XLS, XLSX, PPT, PPTX, ZIP, MP3, WAV, M4A, WEBM.",
        },
        { status: 400 }
      );
    }

    const cleanName = sanitizeFileName(file.name || "file");
    const messageType = detectMessageType(file);
    const ext = getFileExtension(cleanName) || "bin";

    const path = [
      "conversation",
      conversationId,
      user.id,
      `${Date.now()}-${Math.random().toString(36).slice(2)}-${cleanName.replace(/\.[^.]+$/, "")}.${ext}`,
    ].join("/");

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const uploadRes = await supabase.storage.from(BUCKET).upload(path, fileBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

    if (uploadRes.error) {
      return NextResponse.json(
        { error: uploadRes.error.message || "Failed to upload file." },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

    if (!baseUrl) {
      return NextResponse.json(
        { error: "Missing storage base URL configuration." },
        { status: 500 }
      );
    }

    const url = buildPublicUrl(baseUrl, BUCKET, path);

    return NextResponse.json({
      ok: true,
      bucket: BUCKET,
      path,
      url,
      file_name: cleanName,
      original_file_name: file.name || cleanName,
      mime_type: file.type || "application/octet-stream",
      file_size: file.size,
      message_type: messageType,
      kind: messageType === "image" ? "image" : messageType === "audio" ? "audio" : "file",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to upload attachment." },
      { status: 500 }
    );
  }
}