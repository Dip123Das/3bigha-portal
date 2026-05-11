import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

function ageHours(v?: string | null) {
  if (!v) return 0;

  const ts = new Date(v).getTime();

  if (!Number.isFinite(ts)) return 0;

  return Math.max(
    0,
    Math.round((Date.now() - ts) / (1000 * 60 * 60))
  );
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const [
      conversationsRes,
      messagesRes,
      memoryRes,
    ] = await Promise.all([
      supabase
        .from("conversations")
        .select(
          "id,created_at,updated_at,is_closed,context_type,title"
        )
        .order("updated_at", { ascending: false })
        .limit(300),

      supabase
        .from("conversation_messages")
        .select(
          "id,conversation_id,created_at,message_type"
        )
        .order("created_at", { ascending: false })
        .limit(1000),

      supabase
        .from("ai_memory_events")
        .select(
          "id,event_type,module,score,created_at"
        )
        .order("created_at", { ascending: false })
        .limit(1000),
    ]);

    const conversations = Array.isArray(
      conversationsRes.data
    )
      ? conversationsRes.data
      : [];

    const messages = Array.isArray(messagesRes.data)
      ? messagesRes.data
      : [];

    const memory = Array.isArray(memoryRes.data)
      ? memoryRes.data
      : [];

    const activeConversations = conversations.filter(
      (c: any) => !c.is_closed
    );

    const staleConversations =
      activeConversations.filter(
        (c: any) => ageHours(c.updated_at) >= 48
      );

    const criticalConversations =
      activeConversations.filter(
        (c: any) => ageHours(c.updated_at) >= 96
      );

    const last24hMessages = messages.filter(
      (m: any) => ageHours(m.created_at) <= 24
    );

    const last24hMemory = memory.filter(
      (m: any) => ageHours(m.created_at) <= 24
    );

    const rfqSignals = last24hMemory.filter(
      (m: any) =>
        m.module === "rfq"
    );

    const chatSignals = last24hMemory.filter(
      (m: any) =>
        m.module === "chat"
    );

    const telemetry = {
      totalConversations: conversations.length,
      activeConversations:
        activeConversations.length,
      closedConversations:
        conversations.filter((c: any) => c.is_closed)
          .length,
      staleConversations:
        staleConversations.length,
      criticalConversations:
        criticalConversations.length,
      messages24h:
        last24hMessages.length,
      memorySignals24h:
        last24hMemory.length,
      rfqSignals24h:
        rfqSignals.length,
      chatSignals24h:
        chatSignals.length,
      operationalLoad:
        Math.min(
          100,
          activeConversations.length +
            last24hMessages.length / 5
        ),
      recoveryPressure:
        Math.min(
          100,
          staleConversations.length * 8 +
            criticalConversations.length * 15
        ),
    };

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      telemetry,
      executiveSummary:
        telemetry.criticalConversations > 0
          ? "Critical procurement telemetry detected."
          : telemetry.staleConversations > 0
          ? "Procurement follow-up pressure increasing."
          : "Procurement telemetry stable.",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err?.message ||
          "Telemetry generation failed.",
      },
      { status: 500 }
    );
  }
}