import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  buildProcurementTimelineReplay,
  summarizeProcurementTimelineReplay,
} from "@/lib/ai/procurement-timeline-replay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase admin env variables.");
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

function buildRowsFromMessages(messages: any[] = [], conversationId?: string) {
  return messages.map((m, index) => ({
    id: m.id || `message-${index}`,
    event_type: "chat_message",
    module: "chat",
    entity_title: m.body || "Conversation message",
    category: m.role || m.sender_role || "message",
    score: 70,
    created_at: m.created_at || new Date().toISOString(),
    entity_id: conversationId || "",
  }));
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const conversationId = String(body?.conversationId || "").trim();
    const messages = Array.isArray(body?.messages) ? body.messages : [];

    const messageRows = buildRowsFromMessages(messages, conversationId);

    const steps = buildProcurementTimelineReplay(messageRows);
    const summary = summarizeProcurementTimelineReplay(steps);

    return NextResponse.json({
      ok: true,
      source: "conversation_messages",
      conversationId,
      summary,
      steps,
      executiveSummary: summary.executiveSummary,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Procurement timeline failed.",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const supabase = getSupabaseAdmin();

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");
    const limit = Number(searchParams.get("limit") || 120);

    let query = supabase
      .from("ai_memory_events")
      .select(
        "id,event_type,module,entity_id,entity_title,category,type,score,created_at,metadata"
      )
      .order("created_at", { ascending: true })
      .limit(Number.isFinite(limit) ? limit : 120);

    if (conversationId) {
      query = query.eq("entity_id", conversationId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    const rows = Array.isArray(data) ? data : [];

    const steps = buildProcurementTimelineReplay(rows);
    const summary = summarizeProcurementTimelineReplay(steps);

    return NextResponse.json({
      ok: true,
      source: "ai_memory_events",
      summary,
      steps,
      executiveSummary: summary.executiveSummary,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Procurement timeline replay failed.",
      },
      { status: 500 }
    );
  }
}