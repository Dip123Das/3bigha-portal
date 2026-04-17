// app/api/rfq-conversations/[rfqId]/messages/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CHAT_BUCKET = "rfq_chat_attachments";
const MAX_FILES = 5;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB each

type AttachmentMeta = {
  kind: "image" | "file";
  name: string;
  path: string;
  mime: string;
  size: number;
};

type ReplyMeta = {
  id: string;
  body: string;
  sender_role: string;
  sender_user_id: string;
};

function sanitizeFileName(name: string) {
  const trimmed = String(name || "").trim();
  const clean = trimmed
    .replace(/[^\w.\-() ]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);

  return clean || `file-${Date.now()}`;
}

function getExt(name: string) {
  const parts = String(name || "").split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

function isImageMime(mime?: string | null) {
  return String(mime || "").toLowerCase().startsWith("image/");
}

function isBlockedMime(mime?: string | null) {
  const m = String(mime || "").toLowerCase();

  return [
    "application/x-msdownload",
    "application/x-sh",
    "application/x-bat",
    "application/x-csh",
    "application/x-msdos-program",
    "application/javascript",
    "text/javascript",
    "application/x-httpd-php",
  ].includes(m);
}

function isBlockedExtension(name?: string | null) {
  const ext = getExt(String(name || ""));
  return [
    "exe",
    "bat",
    "cmd",
    "com",
    "msi",
    "sh",
    "php",
    "js",
    "jar",
    "scr",
    "vbs",
    "ps1",
  ].includes(ext);
}

async function parseIncomingRequest(req: Request): Promise<{
  conversationId: string;
  messageBody: string;
  files: File[];
  replyToId: string;
}> {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();

    const conversationId = String(form.get("conversation_id") ?? "");
    const messageBody = String(form.get("body") ?? "").trim();
    const replyToId = String(form.get("reply_to_id") ?? "").trim();

    const allFiles = form
      .getAll("files")
      .filter((v): v is File => typeof File !== "undefined" && v instanceof File)
      .filter((f) => f.size > 0);

    return {
      conversationId,
      messageBody,
      files: allFiles,
      replyToId,
    };
  }

  const body = (await req.json().catch(() => null)) as any;

  return {
    conversationId: String(body?.conversation_id ?? ""),
    messageBody: String(body?.body ?? "").trim(),
    files: [],
    replyToId: String(body?.reply_to_id ?? "").trim(),
  };
}

export async function POST(req: Request, { params }: { params: { rfqId: string } }) {
  const rfqId = decodeURIComponent(params.rfqId || "");
  if (!UUID_RE.test(rfqId)) {
    return NextResponse.json({ error: "Invalid RFQ ID" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient(cookies());

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { conversationId, messageBody, files, replyToId } = await parseIncomingRequest(req);
  if (!UUID_RE.test(conversationId)) {
    return NextResponse.json({ error: "Invalid conversation_id" }, { status: 400 });
  }

  if (!messageBody && files.length === 0) {
    return NextResponse.json(
      { error: "Message text or at least one attachment is required." },
      { status: 400 }
    );
  }

  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: `You can attach maximum ${MAX_FILES} files at a time.` },
      { status: 400 }
    );
  }

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: `File "${file.name}" is too large. Maximum allowed size is ${
            MAX_FILE_SIZE_BYTES / (1024 * 1024)
          } MB.`,
        },
        { status: 400 }
      );
    }

    if (isBlockedMime(file.type) || isBlockedExtension(file.name)) {
      return NextResponse.json(
        {
          error: `File type not allowed for "${file.name}".`,
        },
        { status: 400 }
      );
    }
  }

  const { data: conv, error: convErr } = await supabase
    .from("conversations")
    .select("id,rfq_id,context_id,buyer_user_id,vendor_user_id,status,is_closed")
    .eq("context_type", "rfq")
    .eq("rfq_id", rfqId)
    .maybeSingle();

  if (convErr || !conv) {
    return NextResponse.json(
      { error: convErr?.message ?? "Conversation not found." },
      { status: 404 }
    );
  }

  const isBuyer = String(conv.buyer_user_id) === String(user.id);
  const isVendor = String(conv.vendor_user_id) === String(user.id);

  if (!isBuyer && !isVendor) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

    const senderRole = isBuyer ? "buyer" : "vendor";
  
  // 🔥 UNIFIED CONVERSATION (NEW SYSTEM)
  let unifiedConversationId: string | null = null;

  const { data: existingConvo, error: existingConvoErr } = await supabase
    .from("conversations")
    .select("id")
    .eq("context_type", "rfq")
    .eq("rfq_id", rfqId)
    .maybeSingle();

  if (existingConvoErr) {
    return NextResponse.json(
      { error: existingConvoErr.message || "Failed to check unified conversation." },
      { status: 500 }
    );
  }

  if (existingConvo?.id) {
    unifiedConversationId = String(existingConvo.id);
  } else {
    const { error: newConvoErr } = await supabase
      .from("conversations")
      .insert({
        context_type: "rfq",
        context_id: rfqId,
        rfq_id: rfqId,
        buyer_user_id: conv.buyer_user_id,
        vendor_user_id: conv.vendor_user_id,
        created_by_user_id: user.id,
        title: "RFQ Conversation",
        context_snapshot: {
          rfq_id: rfqId,
          legacy_rfq_conversation_id: conversationId,
          rfq_no: rfqId,
        },
      });

    if (newConvoErr) {
      return NextResponse.json(
        {
          error:
            newConvoErr.message || "Failed to create unified conversation",
        },
        { status: 500 }
      );
    }

    const { data: createdConvo, error: createdConvoErr } = await supabase
      .from("conversations")
      .select("id")
      .eq("context_type", "rfq")
      .eq("rfq_id", rfqId)
      .maybeSingle();

    if (createdConvoErr || !createdConvo?.id) {
      return NextResponse.json(
        {
          error:
            createdConvoErr?.message ||
            "Unified conversation was created but could not be loaded.",
        },
        { status: 500 }
      );
    }

    unifiedConversationId = String(createdConvo.id);
  }

  if (!unifiedConversationId) {
    return NextResponse.json(
      { error: "Unified conversation id is missing." },
      { status: 500 }
    );
  }

  // 🔥 ENSURE CONVERSATION PARTICIPANTS FOR UNIFIED CHAT
  const participantRows = [
    {
      conversation_id: unifiedConversationId,
      user_id: String(conv.buyer_user_id),
      role: "buyer",
    },
    {
      conversation_id: unifiedConversationId,
      user_id: String(conv.vendor_user_id),
      role: "vendor",
    },
  ];

  for (const participantRow of participantRows) {
    const insertRes = await supabase
      .from("conversation_participants")
      .insert(participantRow);

    if (insertRes.error) {
      const message = String(insertRes.error.message || "").toLowerCase();

      // Ignore duplicate insert attempts safely
      const isDuplicate =
        message.includes("duplicate key") ||
        message.includes("already exists") ||
        message.includes("unique constraint");

      if (!isDuplicate) {
        return NextResponse.json(
          {
            error:
              insertRes.error.message ||
              "Failed to ensure conversation participants.",
          },
          { status: 500 }
        );
      }
    }
  }

  let replyMeta: ReplyMeta | null = null;

  if (replyToId) {
    if (!UUID_RE.test(replyToId)) {
      return NextResponse.json({ error: "Invalid reply_to_id" }, { status: 400 });
    }

    const { data: replyRow, error: replyErr } = await supabase
      .from("conversation_messages")
      .select("id,body,sender_role,sender_user_id")
      .eq("id", replyToId)
      .eq("conversation_id", unifiedConversationId)
      .maybeSingle();

    if (replyErr || !replyRow) {
      return NextResponse.json(
        { error: replyErr?.message ?? "Reply message not found." },
        { status: 400 }
      );
    }

    replyMeta = {
      id: String(replyRow.id),
      body: String(replyRow.body ?? ""),
      sender_role: String(replyRow.sender_role ?? ""),
      sender_user_id: String(replyRow.sender_user_id ?? ""),
    };
  }

  const uploadedAttachments: AttachmentMeta[] = [];

  if (files.length > 0) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const originalName = String(file.name || `file-${i + 1}`);
      const safeName = sanitizeFileName(originalName);
      const finalName = `${Date.now()}-${i + 1}-${safeName}`;
      const path = `${rfqId}/${unifiedConversationId}/${user.id}/${finalName}`;

      const uploadRes = await supabase.storage.from(CHAT_BUCKET).upload(path, file, {
        upsert: false,
        contentType: file.type || undefined,
        cacheControl: "3600",
      });

      if (uploadRes.error) {
        return NextResponse.json(
          { error: uploadRes.error.message ?? `Failed to upload "${originalName}".` },
          { status: 400 }
        );
      }

      uploadedAttachments.push({
        kind: isImageMime(file.type) ? "image" : "file",
        name: originalName,
        path,
        mime: file.type || "application/octet-stream",
        size: file.size || 0,
      });
    }
  }

  let messageType: "text" | "image" | "file" = "text";

  if (uploadedAttachments.length > 0) {
    const allImages = uploadedAttachments.every((x) => x.kind === "image");
    messageType = allImages ? "image" : "file";
  }

    const meta: Record<string, any> = {};

  if (uploadedAttachments.length > 0) {
    meta.attachments = uploadedAttachments;
  }

  if (replyMeta) {
    meta.reply_to = replyMeta;
  }

  // 🔥 INSERT INTO UNIFIED CHAT SYSTEM ONLY
  const { data: inserted, error: insErr } = await supabase
    .from("conversation_messages")
    .insert({
      conversation_id: unifiedConversationId,
      sender_user_id: user.id,
      sender_role: senderRole,
      message_type: messageType,
      body: messageBody,
      meta,
    })
    .select("id,created_at,message_type,body,meta")
    .single();

  if (insErr || !inserted) {
    return NextResponse.json(
      {
        error:
          insErr?.message || "Failed to insert unified conversation message.",
      },
      { status: 500 }
    );
  }

  const unifiedUpdateRes = await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", unifiedConversationId);

  if (unifiedUpdateRes.error) {
    return NextResponse.json(
      {
        error:
          unifiedUpdateRes.error.message ||
          "Failed to update unified conversation timestamp.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    id: inserted.id,
    created_at: inserted.created_at,
    message_type: inserted.message_type,
    body: inserted.body,
    meta: inserted.meta ?? {},
    conversation_id: unifiedConversationId,
  });
}