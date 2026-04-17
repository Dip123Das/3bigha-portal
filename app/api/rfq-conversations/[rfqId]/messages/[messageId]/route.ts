import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function resolveUnifiedConversationId(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  rfqId: string
) {
  const { data, error } = await supabase
    .from("conversations")
    .select("id")
    .eq("context_type", "rfq")
    .eq("context_id", rfqId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to load unified conversation.");
  }

  return String(data?.id ?? "");
}

export async function PATCH(
  req: Request,
  { params }: { params: { rfqId: string; messageId: string } }
) {
  try {
    const rfqId = decodeURIComponent(params.rfqId || "");
    const messageId = decodeURIComponent(params.messageId || "");

    if (!UUID_RE.test(rfqId) || !UUID_RE.test(messageId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient(cookies());

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json(
        { error: userErr?.message || "Not authenticated" },
        { status: 401 }
      );
    }

    const body = (await req.json().catch(() => null)) as any;
    const nextText = String(body?.body ?? "").trim();

    if (!nextText) {
      return NextResponse.json(
        { error: "Message body is required." },
        { status: 400 }
      );
    }

    const unifiedConversationId = await resolveUnifiedConversationId(
      supabase,
      rfqId
    );

    if (!UUID_RE.test(unifiedConversationId)) {
      return NextResponse.json(
        { error: "Unified conversation not found." },
        { status: 404 }
      );
    }

    const { data: msg, error: msgErr } = await supabase
      .from("conversation_messages")
      .select("id, conversation_id, sender_user_id, body, meta, message_type")
      .eq("id", messageId)
      .eq("conversation_id", unifiedConversationId)
      .maybeSingle();

    if (msgErr) {
      return NextResponse.json(
        { error: msgErr.message || "Failed to load message." },
        { status: 400 }
      );
    }

    if (!msg) {
      return NextResponse.json(
        { error: "Message not found." },
        { status: 404 }
      );
    }

    if (String(msg.sender_user_id) !== String(user.id)) {
      return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    }

    if ((msg.meta as any)?.deleted) {
      return NextResponse.json(
        { error: "Deleted messages cannot be edited." },
        { status: 400 }
      );
    }

    const nextMeta = {
      ...(msg.meta || {}),
      edited: true,
      edited_at: new Date().toISOString(),
    };

    const { data: updated, error: updErr } = await supabase
      .from("conversation_messages")
      .update({
        body: nextText,
        meta: nextMeta,
      })
      .eq("id", messageId)
      .eq("conversation_id", unifiedConversationId)
      .eq("sender_user_id", user.id)
      .select(
        "id, body, meta, created_at, sender_user_id, sender_role, message_type"
      )
      .maybeSingle();

    if (updErr) {
      return NextResponse.json(
        { error: updErr.message || "Failed to edit message." },
        { status: 400 }
      );
    }

    if (!updated) {
      return NextResponse.json(
        {
          error:
            "Message update did not return a row. Check RLS/update policy.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: updated,
      conversation_id: unifiedConversationId,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected server error while editing message." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { rfqId: string; messageId: string } }
) {
  try {
    const rfqId = decodeURIComponent(params.rfqId || "");
    const messageId = decodeURIComponent(params.messageId || "");

    if (!UUID_RE.test(rfqId) || !UUID_RE.test(messageId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient(cookies());

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const unifiedConversationId = await resolveUnifiedConversationId(
      supabase,
      rfqId
    );

    if (!UUID_RE.test(unifiedConversationId)) {
      return NextResponse.json(
        { error: "Unified conversation not found." },
        { status: 404 }
      );
    }

    const { data: msg, error: msgErr } = await supabase
      .from("conversation_messages")
      .select("id, conversation_id, sender_user_id, meta")
      .eq("id", messageId)
      .eq("conversation_id", unifiedConversationId)
      .maybeSingle();

    if (msgErr) {
      return NextResponse.json(
        { error: msgErr.message || "Failed to load message." },
        { status: 400 }
      );
    }

    if (!msg) {
      return NextResponse.json(
        { error: "Message not found." },
        { status: 404 }
      );
    }

    if (String(msg.sender_user_id) !== String(user.id)) {
      return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    }

    const nextMeta = {
      ...(msg.meta || {}),
      deleted: true,
      deleted_at: new Date().toISOString(),
    };

    const { data: updated, error: updErr } = await supabase
      .from("conversation_messages")
      .update({
        body: "",
        meta: nextMeta,
        message_type: "text",
      })
      .eq("id", messageId)
      .eq("conversation_id", unifiedConversationId)
      .eq("sender_user_id", user.id)
      .select(
        "id, body, meta, created_at, sender_user_id, sender_role, message_type"
      )
      .single();

    if (updErr) {
      return NextResponse.json(
        { error: updErr.message || "Failed to delete." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: updated,
      conversation_id: unifiedConversationId,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected server error while deleting message." },
      { status: 500 }
    );
  }
}