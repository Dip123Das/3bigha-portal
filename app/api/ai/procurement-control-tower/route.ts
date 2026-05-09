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

function riskFromAge(age: number) {
  if (age >= 96) return "Critical";
  if (age >= 48) return "High";
  if (age >= 24) return "Medium";
  return "Low";
}

export async function GET(req: Request) {
  try {
    const supabase = getSupabaseAdmin();

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") || 80), 200);

    const { data, error } = await supabase
      .from("conversations")
      .select("id,title,buyer_user_id,vendor_user_id,context_type,created_at,updated_at,is_closed")
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const rows = Array.isArray(data) ? data : [];

    const activeRows = rows.filter((r: any) => !r.is_closed);
    const closedRows = rows.filter((r: any) => r.is_closed);

    const enriched = activeRows.map((row: any) => {
      const ageHours = hoursSince(row.updated_at || row.created_at);
      const risk = riskFromAge(ageHours);

      const action =
        risk === "Critical"
          ? "Escalate immediately"
          : risk === "High"
          ? "Send follow-up today"
          : risk === "Medium"
          ? "Monitor and nudge"
          : "Stable";

      return {
        id: row.id,
        title: row.title || "Procurement conversation",
        module: row.context_type || "conversation",
        updated_at: row.updated_at,
        ageHours: Math.round(ageHours),
        risk,
        action,
        href: `/dashboard/thread/${row.id}`,
      };
    });

    const critical = enriched.filter((r) => r.risk === "Critical").length;
    const high = enriched.filter((r) => r.risk === "High").length;
    const medium = enriched.filter((r) => r.risk === "Medium").length;
    const low = enriched.filter((r) => r.risk === "Low").length;

    const rfq = enriched.filter((r) => String(r.module).includes("rfq")).length;
    const direct = enriched.filter((r) => !String(r.module).includes("rfq")).length;

    const closureRate =
      rows.length > 0 ? Math.round((closedRows.length / rows.length) * 100) : 0;

    const avgAge =
      enriched.length > 0
        ? Math.round(enriched.reduce((sum, r) => sum + r.ageHours, 0) / enriched.length)
        : 0;

    return NextResponse.json({
      ok: true,
      summary: {
        total: rows.length,
        active: activeRows.length,
        closed: closedRows.length,
        closureRate,
        avgAge,
        critical,
        high,
        medium,
        low,
        rfq,
        direct,
      },
      insights: {
        executiveSummary:
          critical > 0
            ? "Critical stale procurement threads need immediate escalation."
            : high > 0
            ? "Several procurement conversations need follow-up today."
            : "Procurement pipeline is currently stable.",
        nextBestAction:
          critical > 0
            ? "Start with critical SLA-risk conversations."
            : high > 0
            ? "Send follow-ups to high-risk aging threads."
            : "Monitor active conversations and push high-closure RFQs.",
        forecast:
          closureRate >= 60
            ? "Pipeline conversion is healthy."
            : closureRate >= 30
            ? "Pipeline conversion is moderate and can improve with faster follow-ups."
            : "Pipeline conversion needs stronger follow-up and supplier engagement.",
      },
      riskMap: enriched
        .sort((a, b) => {
          const order: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
          return order[b.risk] - order[a.risk] || b.ageHours - a.ageHours;
        })
        .slice(0, 20),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Control tower failed." },
      { status: 500 }
    );
  }
}