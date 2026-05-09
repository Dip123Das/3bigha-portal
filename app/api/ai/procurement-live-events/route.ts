import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    const { data, error } = await supabase
      .from("conversations")
      .select("id,title,context_type,created_at,updated_at,is_closed")
      .order("updated_at", { ascending: false })
      .limit(80);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const rows = Array.isArray(data) ? data : [];

    const events = rows.map((row: any) => {
      const age = hoursSince(row.updated_at || row.created_at);
      const tone = eventTone(age, row.is_closed);

      return {
        id: row.id,
        title: row.title || "Procurement conversation",
        module: row.context_type || "conversation",
        ageHours: Math.round(age),
        tone,
        signal:
          tone === "closed"
            ? "Closed procurement workflow"
            : tone === "critical"
            ? "Critical SLA breach risk"
            : tone === "high"
            ? "High follow-up urgency"
            : tone === "medium"
            ? "Procurement nudge recommended"
            : "Active procurement signal",
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
        href: `/dashboard/thread/${row.id}`,
        updated_at: row.updated_at || row.created_at,
      };
    });

    const summary = {
      total: events.length,
      active: events.filter((e) => e.tone === "active").length,
      medium: events.filter((e) => e.tone === "medium").length,
      high: events.filter((e) => e.tone === "high").length,
      critical: events.filter((e) => e.tone === "critical").length,
      closed: events.filter((e) => e.tone === "closed").length,
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
      events,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Live event stream failed." },
      { status: 500 }
    );
  }
}