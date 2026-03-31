import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    conversationId: string;
    messageId: string;
  };
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(v?: string | null) {
  return UUID_RE.test(String(v ?? "").trim());
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeMeta(value: unknown): Record<string, any> {
  return isPlainObject(value) ? value : {};
}

function normalizeReactionMap(value: unknown): Record<string, string[]> {
  if (!isPlainObject(value)) return {};

  const out: Record<string, string[]> = {};

  for (const [emoji, users] of Object.entries(value)) {
    if (!Array.isArray(users)) continue;

    const cleaned = Array.from(
      new Set(
        users
          .map((u) => String(u ?? "").trim())
          .filter(Boolean)
      )
    );

    if (cleaned.length > 0) {
      out[String(emoji)] = cleaned;
    }
  }

  return out;
}

function sanitizeMetaPatch(value: unknown): Record<string, any> {
  if (!isPlainObject(value)) return {};

  const nextMeta: Record<string, any> = {};

  if (typeof value.deleted !== "undefined") {
    nextMeta.deleted = Boolean(value.deleted);
  }

  if (typeof value.deleted_at !== "undefined") {
    nextMeta.deleted_at = value.deleted_at ? String(value.deleted_at) : null;
  }

  if (typeof value.edited !== "undefined") {
    nextMeta.edited = Boolean(value.edited);
  }

  if (typeof value.edited_at !== "undefined") {
    nextMeta.edited_at = value.edited_at ? String(value.edited_at) : null;
  }

  if (typeof value.reply_to !== "undefined" && isPlainObject(value.reply_to)) {
    nextMeta.reply_to = {
      id: String(value.reply_to.id ?? "").trim(),
      body: String(value.reply_to.body ?? ""),
      sender_role: String(value.reply_to.sender_role ?? "").trim(),
      sender_user_id: String(value.reply_to.sender_user_id ?? "").trim(),
    };
  }

  if (typeof value.reactions !== "undefined") {
    nextMeta.reactions = normalizeReactionMap(value.reactions);
  }

  return nextMeta;
}

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const cookieStore = await cookies();
    const supabase = getSupabaseServerClient(cookieStore);

    const conversationId = decodeURIComponent(params.conversationId || "");
    const messageId = decodeURIComponent(params.messageId || "");

    if (!conversationId) {
      return NextResponse.json({ error: "Missing conversationId." }, { status: 400 });
    }

    if (!isUuid(conversationId)) {
      return NextResponse.json({ error: "Invalid conversationId." }, { status: 400 });
    }

    if (!messageId) {
      return NextResponse.json({ error: "Missing messageId." }, { status: 400 });
    }

    if (!isUuid(messageId)) {
      return NextResponse.json({ error: "Invalid messageId." }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const nextBody = String(body?.body ?? "").trim();
    const reactions = body?.reactions;
    const metaPatch = sanitizeMetaPatch(body?.meta);

    const wantsBodyUpdate = typeof body?.body !== "undefined";
    const wantsReactionUpdate = typeof reactions !== "undefined";
    const wantsMetaPatch = Object.keys(metaPatch).length > 0;

    if (!wantsBodyUpdate && !wantsReactionUpdate && !wantsMetaPatch) {
      return NextResponse.json({ error: "No valid update payload provided." }, { status: 400 });
    }

    if (wantsBodyUpdate && !nextBody) {
      return NextResponse.json({ error: "Message body cannot be empty." }, { status: 400 });
    }

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const messageRes = await supabase
      .from("conversation_messages")
      .select("*")
      .eq("id", messageId)
      .eq("conversation_id", conversationId)
      .maybeSingle();

    if (messageRes.error) {
      return NextResponse.json(
        { error: messageRes.error.message || "Failed to load message." },
        { status: 500 }
      );
    }

    const message = messageRes.data as Record<string, any> | null;

    if (!message) {
      return NextResponse.json({ error: "Message not found." }, { status: 404 });
    }

    const senderUserId = String(message.sender_user_id ?? "");
    const isOwner = senderUserId === String(user.id);

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

    const currentMeta = normalizeMeta(message.meta);
    const updatePayload: Record<string, any> = {};

    if (wantsBodyUpdate) {
      if (!isOwner) {
        return NextResponse.json(
          { error: "Only the sender can edit this message." },
          { status: 403 }
        );
      }

      if (currentMeta.deleted) {
        return NextResponse.json(
          { error: "Deleted messages cannot be edited." },
          { status: 400 }
        );
      }

      if (String(message.message_type ?? "text") !== "text") {
        return NextResponse.json(
          { error: "Only text messages can be edited." },
          { status: 400 }
        );
      }

      updatePayload.body = nextBody;
      updatePayload.meta = {
        ...currentMeta,
        edited: true,
        edited_at: new Date().toISOString(),
      };
    }

    if (wantsReactionUpdate) {
      if (currentMeta.deleted) {
        return NextResponse.json(
          { error: "Deleted messages cannot be reacted to." },
          { status: 400 }
        );
      }

      const safeReactions = normalizeReactionMap(reactions);
      const mergedMeta = normalizeMeta(updatePayload.meta ?? currentMeta);

      updatePayload.meta = {
        ...mergedMeta,
        reactions: safeReactions,
      };
    }

    if (wantsMetaPatch) {
      const mergedMeta = normalizeMeta(updatePayload.meta ?? currentMeta);

      updatePayload.meta = {
        ...mergedMeta,
        ...metaPatch,
      };
    }

    const updateRes = await supabase
      .from("conversation_messages")
      .update(updatePayload)
      .eq("id", messageId)
      .eq("conversation_id", conversationId)
      .select("*")
      .single();

    if (updateRes.error) {
      return NextResponse.json(
        { error: updateRes.error.message || "Failed to update message." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: updateRes.data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to update message." },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const cookieStore = await cookies();
    const supabase = getSupabaseServerClient(cookieStore);

    const conversationId = decodeURIComponent(params.conversationId || "");
    const messageId = decodeURIComponent(params.messageId || "");

    if (!conversationId) {
      return NextResponse.json({ error: "Missing conversationId." }, { status: 400 });
    }

    if (!isUuid(conversationId)) {
      return NextResponse.json({ error: "Invalid conversationId." }, { status: 400 });
    }

    if (!messageId) {
      return NextResponse.json({ error: "Missing messageId." }, { status: 400 });
    }

    if (!isUuid(messageId)) {
      return NextResponse.json({ error: "Invalid messageId." }, { status: 400 });
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

    const messageRes = await supabase
      .from("conversation_messages")
      .select("*")
      .eq("id", messageId)
      .eq("conversation_id", conversationId)
      .maybeSingle();

    if (messageRes.error) {
      return NextResponse.json(
        { error: messageRes.error.message || "Failed to load message." },
        { status: 500 }
      );
    }

    const message = messageRes.data as Record<string, any> | null;

    if (!message) {
      return NextResponse.json({ error: "Message not found." }, { status: 404 });
    }

    if (String(message.sender_user_id ?? "") !== String(user.id)) {
      return NextResponse.json(
        { error: "Only the sender can delete this message." },
        { status: 403 }
      );
    }

    const currentMeta = normalizeMeta(message.meta);

    if (currentMeta.deleted) {
      return NextResponse.json(
        { error: "Message already deleted." },
        { status: 400 }
      );
    }

    const updateRes = await supabase
      .from("conversation_messages")
      .update({
        body: "",
        message_type: "text",
        meta: {
          ...currentMeta,
          deleted: true,
          deleted_at: new Date().toISOString(),
          edited: false,
          reactions: {},
        },
      })
      .eq("id", messageId)
      .eq("conversation_id", conversationId)
      .select("*")
      .single();

    if (updateRes.error) {
      return NextResponse.json(
        { error: updateRes.error.message || "Failed to delete message." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: updateRes.data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to delete message." },
      { status: 500 }
    );
  }
}