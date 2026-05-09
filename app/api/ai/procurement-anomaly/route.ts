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

function hoursSince(v?: string | null) {
  if (!v) return 999;

  const n = new Date(v).getTime();

  if (!Number.isFinite(n)) return 999;

  return Math.max(0, (Date.now() - n) / (1000 * 60 * 60));
}

function detectAnomaly(age: number, closed?: boolean | null) {
  if (closed) {
    return {
      severity: "none",
      type: "closed",
      score: 0,
      message: "Workflow completed successfully.",
    };
  }

  if (age >= 120) {
    return {
      severity: "critical",
      type: "stalled_workflow",
      score: 96,
      message: "Procurement workflow appears stalled abnormally.",
    };
  }

  if (age >= 72) {
    return {
      severity: "high",
      type: "vendor_silence",
      score: 81,
      message: "Vendor inactivity anomaly detected.",
    };
  }

  if (age >= 36) {
    return {
      severity: "medium",
      type: "aging_rfq",
      score: 58,
      message: "RFQ aging faster than healthy procurement cycle.",
    };
  }

  return {
    severity: "low",
    type: "healthy",
    score: 18,
    message: "Procurement activity looks healthy.",
  };
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("conversations")
      .select("id,title,context_type,created_at,updated_at,is_closed")
      .order("updated_at", { ascending: true })
      .limit(120);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    const rows = Array.isArray(data) ? data : [];

    const anomalies = rows.map((row: any) => {
      const age = hoursSince(row.updated_at || row.created_at);

      const anomaly = detectAnomaly(age, row.is_closed);

      return {
        id: row.id,
        title: row.title || "Procurement workflow",
        module: row.context_type || "conversation",
        ageHours: Math.round(age),
        severity: anomaly.severity,
        anomalyType: anomaly.type,
        anomalyScore: anomaly.score,
        message: anomaly.message,
        href: `/dashboard/thread/${row.id}`,
      };
    });

    const critical = anomalies.filter(
      (a) => a.severity === "critical"
    ).length;

    const high = anomalies.filter(
      (a) => a.severity === "high"
    ).length;

    const medium = anomalies.filter(
      (a) => a.severity === "medium"
    ).length;

    return NextResponse.json({
      ok: true,
      summary: {
        total: anomalies.length,
        critical,
        high,
        medium,
      },
      executiveAlert:
        critical > 0
          ? "Critical procurement anomalies detected."
          : high > 0
          ? "High-risk workflow anomalies detected."
          : "Procurement anomaly levels are stable.",
      anomalies: anomalies
        .sort((a, b) => b.anomalyScore - a.anomalyScore)
        .slice(0, 40),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Anomaly engine failed.",
      },
      { status: 500 }
    );
  }
}