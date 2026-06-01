import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  buildProcurementLiveFeed,
  summarizeProcurementLiveFeed,
} from "@/lib/ai/procurement-live-feed";

export const runtime = "nodejs";
export const revalidate = 30;

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) throw new Error("Missing Supabase admin env variables.");

  return createClient(url, key, { auth: { persistSession: false } });
}

function hoursSince(v?: string | null) {
  if (!v) return 999;
  const n = new Date(v).getTime();
  if (!Number.isFinite(n)) return 999;
  return Math.max(0, (Date.now() - n) / (1000 * 60 * 60));
}

function eventScore(age: number, isClosed?: boolean | null) {
  if (isClosed) return 25;
  if (age >= 96) return 95;
  if (age >= 48) return 80;
  if (age >= 24) return 60;
  return 45;
}

function eventTone(age: number, isClosed?: boolean | null) {
  if (isClosed) return "closed";
  if (age >= 96) return "critical";
  if (age >= 48) return "high";
  if (age >= 24) return "medium";
  return "active";
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const [{ data: conversations, error: convError }, { data: memoryEvents }] =
      await Promise.all([
        supabase
          .from("conversations")
          .select("id,title,context_type,created_at,updated_at,is_closed")
          .order("updated_at", { ascending: false })
          .limit(80),

        supabase
          .from("ai_memory_events")
          .select(
            "id,event_type,module,entity_title,category,score,created_at,entity_id"
          )
          .order("created_at", { ascending: false })
          .limit(80),
      ]);

    if (convError) {
      return NextResponse.json(
        { ok: false, error: convError.message },
        { status: 500 }
      );
    }

    const conversationRows = Array.isArray(conversations) ? conversations : [];
    const memoryRows = Array.isArray(memoryEvents) ? memoryEvents : [];

    const conversationEvents = conversationRows.map((row: any) => {
      const age = hoursSince(row.updated_at || row.created_at);
      const tone = eventTone(age, row.is_closed);
      const score = eventScore(age, row.is_closed);

      return {
        id: row.id,
        event_type:
          tone === "closed"
            ? "conversation_closed"
            : tone === "critical"
              ? "sla_breach_risk"
              : tone === "high"
                ? "followup_due"
                : tone === "medium"
                  ? "nudge_recommended"
                  : "conversation_active",
        module: row.context_type || "conversation",
        entity_title: row.title || "Procurement conversation",
        category: tone,
        score,
        created_at: row.updated_at || row.created_at,
        entity_id: row.id,
        href: `/dashboard/thread/${row.id}`,
        action:
          tone === "critical"
            ? "Escalate immediately"
            : tone === "high"
              ? "Follow up today"
              : tone === "medium"
                ? "Send smart nudge"
                : tone === "closed"
                  ? "Archive / review outcome"
                  : "Monitor",
      };
    });

    const allRows = [
      ...memoryRows.map((row: any) => ({
        ...row,
        href:
          row.module === "rfq"
            ? `/dashboard/buyer/rfqs/${row.entity_id}`
            : row.entity_id
              ? `/dashboard/thread/${row.entity_id}`
              : "/dashboard/procurement-live",
        action:
          row.event_type === "rfq_created"
            ? "Review RFQ and vendor matching"
            : row.event_type === "chat_message"
              ? "Review latest conversation"
              : row.event_type === "recommendation_click"
                ? "Analyze recommendation interest"
                : row.event_type === "listing_view"
                  ? "Track buyer discovery signal"
                  : "Review memory event",
      })),
      ...conversationEvents,
    ];

    const events = buildProcurementLiveFeed(allRows).map((event: any) => {
      const sourceRow = allRows.find((r: any) => String(r.id) === String(event.id));

      return {
        ...event,
        tone:
          event.priority === "critical"
            ? "critical"
            : event.priority === "high"
              ? "high"
              : event.priority === "medium"
                ? "medium"
                : "active",
        signal:
          event.priority === "critical"
            ? "Critical procurement signal"
            : event.priority === "high"
              ? "High-priority procurement signal"
              : event.priority === "medium"
                ? "Procurement nudge recommended"
                : "Active procurement signal",
        action: sourceRow?.action || "Monitor",
        href: sourceRow?.href || "/dashboard/procurement-live",
        updated_at: event.createdAt,
      };
    });

    const feedSummary = summarizeProcurementLiveFeed(events);

    const summary = {
      total: events.length,
      active: events.filter((e) => e.tone === "active").length,
      medium: events.filter((e) => e.tone === "medium").length,
      high: events.filter((e) => e.tone === "high").length,
      critical: events.filter((e) => e.tone === "critical").length,
      closed: conversationEvents.filter((e) => e.category === "closed").length,
      memory: memoryRows.length,
      rfq: feedSummary.rfq,
      chat: feedSummary.chat,
    };

    return NextResponse.json({
      ok: true,
      summary,
      executiveSignal:
        summary.critical > 0
          ? "Critical live procurement risks need escalation."
          : summary.high > 0
            ? "High-priority procurement follow-ups are active."
            : "Live procurement stream is stable.",
      feedHealth: feedSummary.health,
      events,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Live event stream failed." },
      { status: 500 }
    );
  }
}
