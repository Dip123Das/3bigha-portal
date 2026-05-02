import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    conversationId: string;
  };
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(v?: string | null) {
  return UUID_RE.test(String(v ?? "").trim());
}

function cleanId(v: unknown) {
  return String(v ?? "").trim();
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeMessageType(value: unknown): "text" | "image" | "file" | "audio" | "system" {
  const v = String(value ?? "text").trim().toLowerCase();
  if (v === "image") return "image";
  if (v === "file") return "file";
  if (v === "audio") return "audio";
  if (v === "system") return "system";
  return "text";
}

function normalizeReplyMeta(value: unknown): Record<string, any> | undefined {
  if (!isPlainObject(value)) return undefined;

  const id = cleanId(value.id);
  const body = String(value.body ?? "");
  const sender_role = String(value.sender_role ?? "").trim();
  const sender_user_id = cleanId(value.sender_user_id);

  if (!id) return undefined;

  return {
    id,
    body,
    sender_role,
    sender_user_id,
  };
}

function normalizeReactionMap(value: unknown): Record<string, string[]> | undefined {
  if (!isPlainObject(value)) return undefined;

  const out: Record<string, string[]> = {};

  for (const [emoji, users] of Object.entries(value)) {
    if (!Array.isArray(users)) continue;

    const cleaned = Array.from(
      new Set(
        users
          .map((u) => cleanId(u))
          .filter(Boolean)
      )
    );

    if (cleaned.length > 0) {
      out[String(emoji)] = cleaned;
    }
  }

  return Object.keys(out).length > 0 ? out : undefined;
}

function normalizeAttachments(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item) => isPlainObject(item))
    .map((item) => {
      const kind = String(item.kind ?? "").trim().toLowerCase();
      const name = String(item.name ?? item.file_name ?? "attachment").trim() || "attachment";
      const original_file_name =
        String(item.original_file_name ?? item.name ?? item.file_name ?? "").trim() || name;
      const path = String(item.path ?? "").trim();
      const url = String(item.url ?? item.file_url ?? "").trim();
      const file_url = String(item.file_url ?? item.url ?? "").trim();
      const mime = String(item.mime ?? item.mime_type ?? "application/octet-stream").trim();
      const mime_type = String(item.mime_type ?? item.mime ?? "application/octet-stream").trim();

      const rawSize = item.size ?? item.file_size ?? null;
      const sizeNum = Number(rawSize);
      const safeSize = Number.isFinite(sizeNum) && sizeNum >= 0 ? sizeNum : 0;

      const bucket = String(item.bucket ?? "").trim();

      return {
        kind: kind || "file",
        name,
        original_file_name,
        path,
        url,
        file_url,
        mime,
        mime_type,
        size: safeSize,
        file_size: safeSize,
        bucket,
      };
    })
    .filter((item) => item.file_url || item.url);
}

function sanitizeMeta(
  messageType: "text" | "image" | "file" | "audio" | "system",
  value: unknown
): Record<string, any> {
  const meta = isPlainObject(value) ? value : {};
  const nextMeta: Record<string, any> = {};

  const replyTo = normalizeReplyMeta(meta.reply_to);
  if (replyTo) {
    nextMeta.reply_to = replyTo;
  }

  const reactions = normalizeReactionMap(meta.reactions);
  if (reactions) {
    nextMeta.reactions = reactions;
  }

  if (typeof meta.edited === "boolean") {
    nextMeta.edited = meta.edited;
  }
  if (meta.edited_at) {
    nextMeta.edited_at = String(meta.edited_at);
  }
  if (typeof meta.deleted === "boolean") {
    nextMeta.deleted = meta.deleted;
  }
  if (meta.deleted_at) {
    nextMeta.deleted_at = String(meta.deleted_at);
  }

  const attachments = normalizeAttachments(meta.attachments);

  if (messageType === "image" || messageType === "file" || messageType === "audio") {
    const file_url = String(meta.file_url ?? meta.url ?? attachments[0]?.file_url ?? "").trim();
    const file_name = String(meta.file_name ?? meta.name ?? attachments[0]?.name ?? "").trim();
    const mime_type = String(
      meta.mime_type ?? meta.mime ?? attachments[0]?.mime_type ?? "application/octet-stream"
    ).trim();

    const rawSize = meta.file_size ?? meta.size ?? attachments[0]?.file_size ?? 0;
    const sizeNum = Number(rawSize);
    const file_size = Number.isFinite(sizeNum) && sizeNum >= 0 ? sizeNum : 0;

    const bucket = String(meta.bucket ?? attachments[0]?.bucket ?? "").trim();
    const path = String(meta.path ?? attachments[0]?.path ?? "").trim();

    nextMeta.file_url = file_url;
    nextMeta.file_name = file_name || "attachment";
    nextMeta.mime_type = mime_type || "application/octet-stream";
    nextMeta.file_size = file_size;

    if (bucket) nextMeta.bucket = bucket;
    if (path) nextMeta.path = path;

    nextMeta.attachments =
      attachments.length > 0
        ? attachments
        : [
            {
              kind:
                messageType === "image"
                  ? "image"
                  : messageType === "audio"
                  ? "audio"
                  : "file",
              name: file_name || "attachment",
              original_file_name: file_name || "attachment",
              path,
              url: file_url,
              file_url,
              mime: mime_type || "application/octet-stream",
              mime_type: mime_type || "application/octet-stream",
              size: file_size,
              file_size,
              bucket,
            },
          ];
  }

  return nextMeta;
}

function validateAttachmentMeta(
  messageType: "text" | "image" | "file" | "audio" | "system",
  meta: Record<string, any>
): string | null {
  if (messageType !== "image" && messageType !== "file" && messageType !== "audio") return null;

  const firstAttachment =
    Array.isArray(meta.attachments) && meta.attachments.length > 0 ? meta.attachments[0] : null;

  const fileUrl = String(
    meta.file_url ?? meta.url ?? firstAttachment?.file_url ?? firstAttachment?.url ?? ""
  ).trim();
  const fileName = String(meta.file_name ?? meta.name ?? firstAttachment?.name ?? "").trim();
  const mimeType = String(
    meta.mime_type ?? meta.mime ?? firstAttachment?.mime_type ?? firstAttachment?.mime ?? ""
  ).trim();
  const sizeRaw = meta.file_size ?? meta.size ?? firstAttachment?.file_size ?? firstAttachment?.size ?? null;

  if (!fileUrl) {
    return "File URL is required for image/file messages.";
  }

  if (!fileName) {
    return "File name is required for image/file messages.";
  }

  if (!mimeType) {
    return "MIME type is required for image/file messages.";
  }

  if (sizeRaw != null) {
    const sizeNum = Number(sizeRaw);
    if (!Number.isFinite(sizeNum) || sizeNum < 0) {
      return "Invalid file size.";
    }
  }

  return null;
}

async function getValidatedConversation(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  conversationId: string,
  userId: string
) {
  const convRes = await supabase
    .from("conversations")
    .select("id,buyer_user_id,vendor_user_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (convRes.error) {
    return {
      error: NextResponse.json(
        { error: convRes.error.message || "Failed to validate conversation." },
        { status: 500 }
      ),
      conversation: null,
      role: null as "buyer" | "vendor" | null,
    };
  }

  const conv = convRes.data;

  if (!conv) {
    return {
      error: NextResponse.json({ error: "Conversation not found." }, { status: 404 }),
      conversation: null,
      role: null as "buyer" | "vendor" | null,
    };
  }

  const role =
    String(conv.buyer_user_id ?? "") === String(userId)
      ? "buyer"
      : String(conv.vendor_user_id ?? "") === String(userId)
      ? "vendor"
      : null;

  if (!role) {
    return {
      error: NextResponse.json(
        { error: "You are not a participant of this conversation." },
        { status: 403 }
      ),
      conversation: null,
      role: null as "buyer" | "vendor" | null,
    };
  }

  return {
    error: null,
    conversation: conv,
    role,
  };
}

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const cookieStore = await cookies();
    const supabase = getSupabaseServerClient(cookieStore);

    const conversationId = cleanId(decodeURIComponent(params.conversationId || ""));

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

    const validated = await getValidatedConversation(supabase, conversationId, user.id);
    if (validated.error) return validated.error;

    const messagesRes = await supabase
      .from("conversation_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (messagesRes.error) {
      return NextResponse.json(
        { error: messagesRes.error.message || "Failed to load messages." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      items: messagesRes.data ?? [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch messages." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const cookieStore = await cookies();
    const supabase = getSupabaseServerClient(cookieStore);

    const conversationId = cleanId(decodeURIComponent(params.conversationId || ""));

    if (!conversationId) {
      return NextResponse.json({ error: "Missing conversationId." }, { status: 400 });
    }

    if (!isUuid(conversationId)) {
      return NextResponse.json({ error: "Invalid conversationId." }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));

    const requestedMessageType = normalizeMessageType(body?.messageType);
    const messageType: "text" | "image" | "file" | "audio" =
      requestedMessageType === "system" ? "text" : requestedMessageType;
    
    const messageBody = String(body?.body ?? "");
    const trimmedMessageBody = messageBody.trim();
    const msgLower = messageBody.toLowerCase();
    const meta = sanitizeMeta(messageType, body?.meta);

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // 🧠 AI AUTOPILOT DEAL + PAYMENT DETECTION
    const isDealReady =
      msgLower.includes("final") ||
      msgLower.includes("confirm") ||
      msgLower.includes("ok") ||
      msgLower.includes("done");

    if (isDealReady) {
      await supabase.from("vendor_notifications").insert({
        user_id: user.id,
        type: "deal_ready",
        title: "Deal closing opportunity 🎯",
        message: "Buyer is ready. Respond immediately to close this deal.",
        is_read: false,
      });
    }

    const isPaymentSignal =
      msgLower.includes("payment") ||
      msgLower.includes("advance") ||
      msgLower.includes("upi") ||
      msgLower.includes("transfer");

    if (isPaymentSignal) {
      await supabase.from("vendor_notifications").insert({
        user_id: user.id,
        type: "payment_intent",
        title: "Payment intent detected 💰",
        message: "Buyer is discussing payment. Push for deal closure now.",
        is_read: false,
      });
    }

    // 🚨 FRAUD DETECTION (CHAT)
    const msgText = messageBody.toLowerCase();
    const fraudPatterns = ["send otp", "bank transfer", "pay advance", "upi id", "account number"];
    const isFraudMessage = fraudPatterns.some((p) => msgText.includes(p));

    if (isFraudMessage) {
      await supabase.from("vendor_notifications").insert({
        user_id: user.id,
        type: "fraud_chat",
        title: "Suspicious message detected",
        message: "⚠️ This message may be unsafe. Avoid sharing sensitive details.",
        is_read: false,
      });
    }

    const validated = await getValidatedConversation(supabase, conversationId, user.id);
    if (validated.error) return validated.error;

    const actualRole = validated.role;

    if (messageType === "text" && !trimmedMessageBody) {
      return NextResponse.json(
        { error: "Message body is required for text messages." },
        { status: 400 }
      );
    }

    const attachmentError = validateAttachmentMeta(messageType, meta);
    if (attachmentError) {
      return NextResponse.json({ error: attachmentError }, { status: 400 });
    }

    const insertRes = await supabase
      .from("conversation_messages")
      .insert({
        conversation_id: conversationId,
        sender_user_id: user.id,
        sender_role: actualRole,
        message_type: messageType,
        body: trimmedMessageBody,
        meta,
      })
      .select("*")
      .single();

    if (insertRes.error) {
      return NextResponse.json(
        { error: insertRes.error.message || "Failed to send message." },
        { status: 500 }
      );
    }

    const insertedMessage = insertRes.data;
    const nowIso = new Date().toISOString();

    await supabase
      .from("conversation_participants")
      .upsert(
        {
          conversation_id: conversationId,
          user_id: user.id,
          role: actualRole,
          last_read_at: nowIso,
          last_seen_message_id: insertedMessage?.id ?? null,
        },
        { onConflict: "conversation_id,user_id" }
      );

    await supabase
      .from("conversations")
      .update({
        updated_at: nowIso,
      })
      .eq("id", conversationId);

    return NextResponse.json(insertedMessage);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to create message." },
      { status: 500 }
    );
  }
}