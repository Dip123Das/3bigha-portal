import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase env.");
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const [
      dealEventsRes,
      messageRes,
      convoRes,
    ] = await Promise.all([
      supabase
        .from("ai_deal_events")
        .select("id,event_type,created_at")
        .order("created_at", { ascending: false })
        .limit(300),

      supabase
        .from("conversation_messages")
        .select("id,created_at")
        .order("created_at", { ascending: false })
        .limit(500),

      supabase
        .from("conversations")
        .select("id,is_closed,updated_at")
        .order("updated_at", { ascending: false })
        .limit(300),
    ]);

    const dealEvents = Array.isArray(dealEventsRes.data)
      ? dealEventsRes.data
      : [];

    const messages = Array.isArray(messageRes.data)
      ? messageRes.data
      : [];

    const conversations = Array.isArray(convoRes.data)
      ? convoRes.data
      : [];

    const autonomousExecutions =
      dealEvents.filter(
        (e: any) =>
          e.event_type ===
          "autonomous_procurement_execution"
      );

    const readinessScore = Math.min(
      100,
      40 +
        autonomousExecutions.length * 4 +
        messages.length / 25
    );

    const executionPressure = Math.min(
      100,
      conversations.filter((c: any) => !c.is_closed)
        .length * 2
    );

    const stabilizationReadiness = Math.min(
      100,
      readinessScore +
        autonomousExecutions.length
    );

    return NextResponse.json({
      ok: true,

      readiness: {
        readinessScore,
        executionPressure,
        stabilizationReadiness,

        autonomousExecutions:
          autonomousExecutions.length,

        activeConversations:
          conversations.filter(
            (c: any) => !c.is_closed
          ).length,

        totalMessages:
          messages.length,
      },

      executiveSummary:
        readinessScore >= 80
          ? "Real execution infrastructure is operational."
          : "Execution bridge requires additional live orchestration.",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err?.message ||
          "Execution readiness failed.",
      },
      { status: 500 }
    );
  }
}