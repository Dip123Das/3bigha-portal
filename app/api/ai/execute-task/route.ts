import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase admin environment variables missing.");
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

function cleanText(value: unknown, fallback = "") {
  return String(value || fallback).trim();
}

function normalizeConfidence(value: unknown) {
  const n = Number(value || 70);
  if (Number.isNaN(n)) return 70;
  return Math.max(0, Math.min(100, n));
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const conversationId = cleanText(body?.conversationId);
    const message = cleanText(body?.message);
    const actionType = cleanText(body?.actionType, "autonomous_task");
    const target = cleanText(body?.target, "system");
    const priority = cleanText(body?.priority, "medium");
    const confidence = normalizeConfidence(body?.confidence);

    const rfqId = cleanText(body?.rfqId);
    const taskId = cleanText(body?.taskId);
    const senderSide = cleanText(body?.senderSide, "ai");
    const actorUserId = cleanText(body?.actorUserId);

    if (!message) {
      return NextResponse.json(
        { ok: false, error: "AI message is required." },
        { status: 400 }
      );
    }

    if (!conversationId) {
      return NextResponse.json({
        ok: true,
        mode: "preview",
        executed: false,
        message:
          "AI execution message generated. Real chat injection requires conversationId.",
        execution: {
          actionType,
          target,
          priority,
          confidence,
          rfqId: rfqId || null,
          taskId: taskId || null,
          generatedMessage: message,
        },
      });
    }

    const supabase = getSupabaseAdmin();

    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        {
          ok: false,
          error: convError?.message || "Conversation not found.",
        },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    const aiRole =
  senderSide === "buyer"
    ? "buyer"
    : senderSide === "vendor"
      ? "vendor"
      : "vendor";

const fallbackSenderId =
  actorUserId ||
  conversation?.vendor_user_id ||
  conversation?.buyer_user_id ||
  null;

const messagePayload: Record<string, any> = {
  conversation_id: conversationId,
  sender_user_id: fallbackSenderId,
  sender_role: aiRole,
  body: message,
  message_type: "text",
  meta: {
    source: "procurement_autonomous_execution",
    autonomous: true,
    actionType,
    target,
    priority,
    confidence,
    senderSide,
    rfqId: rfqId || conversation?.rfq_id || null,
    taskId: taskId || null,
    actorUserId: actorUserId || null,
    executedAt: now,
  },
};

    const { data: insertedMessage, error: msgError } = await supabase
      .from("conversation_messages")
      .insert(messagePayload)
      .select("*")
      .single();

    if (msgError) {
      return NextResponse.json(
        {
          ok: false,
          error: msgError.message,
          hint:
            "conversation_messages insert failed. If your table requires sender_role, user_id, or another sender field, share the table structure or latest chat API and I will adjust exactly.",
          attemptedPayload: messagePayload,
        },
        { status: 500 }
      );
    }

    await supabase
      .from("conversations")
      .update({
        last_message_at: now,
        updated_at: now,
      })
      .eq("id", conversationId);

    await supabase.from("ai_deal_events").insert({
      conversation_id: conversationId,
      event_type: "autonomous_procurement_execution",
      payload: {
        actionType,
        target,
        priority,
        confidence,
        message,
        rfqId: rfqId || conversation?.rfq_id || null,
        taskId: taskId || null,
        senderSide,
        actorUserId: actorUserId || null,
        insertedMessageId: insertedMessage?.id || null,
        executedAt: now,
      },
    });

    return NextResponse.json({
      ok: true,
      mode: "executed",
      executed: true,
      conversationId,
      messageId: insertedMessage?.id || null,
      insertedMessage,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "AI task execution failed.",
      },
      { status: 500 }
    );
  }
}