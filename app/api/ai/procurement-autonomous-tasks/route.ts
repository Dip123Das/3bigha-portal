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

function safeDate(value: any) {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  return d;
}

function hoursSince(value: any) {
  const d = safeDate(value);
  if (!d) return 999;
  return Math.max(0, Math.round((Date.now() - d.getTime()) / 36_000) / 10);
}

function priorityFromHours(hours: number) {
  if (hours >= 48) return "critical";
  if (hours >= 24) return "high";
  return "medium";
}

function confidenceFromHours(hours: number) {
  if (hours >= 72) return 96;
  if (hours >= 48) return 91;
  if (hours >= 24) return 84;
  return 72;
}

function targetFromConversation(row: any) {
  if (row?.vendor_user_id) return "vendor";
  if (row?.buyer_user_id) return "buyer";
  return "system";
}

function workflowFromConversation(row: any) {
  if (row?.rfq_id) return "RFQ Conversation";
  if (row?.context_type) return String(row.context_type);
  return "Unified Inbox Conversation";
}

function buildTaskFromConversation(row: any, index: number) {
  const lastActivity =
    row?.last_message_at || row?.updated_at || row?.created_at || null;

  const staleHours = hoursSince(lastActivity);
  const priority = priorityFromHours(staleHours);
  const target = targetFromConversation(row);
  const workflow = workflowFromConversation(row);

  const type =
    target === "vendor"
      ? "follow_up"
      : target === "buyer"
        ? "buyer_recovery"
        : "closure_nudge";

  const title =
    target === "vendor"
      ? "Escalate inactive vendor conversation"
      : target === "buyer"
        ? "Recover buyer engagement"
        : "Nudge inactive procurement thread";

  const suggestedMessage =
    target === "vendor"
      ? "Hello, this procurement request is still pending. Please share your final price, delivery timeline, and availability today."
      : target === "buyer"
        ? "Hello, we noticed this discussion is pending. Would you like us to help compare options or continue the negotiation?"
        : "AI recommends nudging this procurement thread to improve closure probability.";

  const reason =
    staleHours >= 48
      ? `No meaningful activity detected for about ${staleHours} hours.`
      : `This conversation needs proactive follow-up after about ${staleHours} hours of inactivity.`;

  return {
    id: `conversation-task-${row.id || index}`,
    title,
    workflow,
    type,
    priority,
    target,
    suggestedMessage,
    reason,
    confidence: confidenceFromHours(staleHours),
    status: "ready",
    conversationId: row.id,
    conversation_id: row.id,
    rfqId: row.rfq_id || null,
    rfq_id: row.rfq_id || null,
    contextType: row.context_type || null,
    contextId: row.context_id || null,
    buyerUserId: row.buyer_user_id || null,
    vendorUserId: row.vendor_user_id || null,
    lastActivityAt: lastActivity,
    staleHours,
  };
}

function fallbackTasks() {
  return [
    {
      id: "task-preview-1",
      title: "Escalate inactive RFQ conversation",
      workflow: "RFQ Conversation",
      type: "follow_up",
      priority: "critical",
      target: "vendor",
      suggestedMessage:
        "Hello, this procurement request is still pending. Please share your final price, delivery timeline, and availability today.",
      reason:
        "No live open conversation was found yet. This is a preview task until live RFQ conversations are available.",
      confidence: 94,
      status: "ready",
      conversationId: null,
      conversation_id: null,
      rfqId: null,
      rfq_id: null,
    },
    {
      id: "task-preview-2",
      title: "Recover buyer engagement",
      workflow: "Unified Inbox Conversation",
      type: "buyer_recovery",
      priority: "high",
      target: "buyer",
      suggestedMessage:
        "Hello, we noticed this discussion is pending. Would you like us to help compare options or continue the negotiation?",
      reason:
        "Preview buyer recovery action. Real execution will activate when a conversationId is available.",
      confidence: 82,
      status: "ready",
      conversationId: null,
      conversation_id: null,
      rfqId: null,
      rfq_id: null,
    },
  ];
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data: conversations, error } = await supabase
      .from("conversations")
      .select(
        "id, rfq_id, context_type, context_id, buyer_user_id, vendor_user_id, is_closed, last_message_at, created_at, updated_at"
      )
      .or("is_closed.is.null,is_closed.eq.false")
      .order("last_message_at", { ascending: true, nullsFirst: false })
      .limit(12);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          hint:
            "Could not read conversations. Check conversations columns: id, rfq_id, context_type, context_id, buyer_user_id, vendor_user_id, is_closed, last_message_at.",
        },
        { status: 500 }
      );
    }

    const liveTasks = (conversations || [])
      .filter((row: any) => row?.id)
      .map(buildTaskFromConversation);

    const tasks = liveTasks.length ? liveTasks : fallbackTasks();

    return NextResponse.json({
      ok: true,
      mode: liveTasks.length ? "live-conversations" : "preview",
      generatedAt: new Date().toISOString(),
      tasks,
      summary: {
        total: tasks.length,
        critical: tasks.filter((x: any) => x.priority === "critical").length,
        high: tasks.filter((x: any) => x.priority === "high").length,
        ready: tasks.filter((x: any) => x.status === "ready").length,
      },
      executiveDirective: liveTasks.length
        ? "Autonomous procurement task engine has found live unified inbox conversations ready for AI execution."
        : "Autonomous procurement task engine is ready. Create or open RFQ conversations to activate real execution.",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Autonomous procurement tasks failed.",
      },
      { status: 500 }
    );
  }
}