import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const revalidate = 60;

type ConversationRow = {
  id: string;
  title: string | null;
  context_type: string | null;
  created_at: string | null;
  updated_at: string | null;
  is_closed: boolean | null;
};

type ForecastRow = {
  id: string;
  title: string;
  module: string;
  ageHours: number;
  closureProbability: number;
  supplierReliability: string;
  risk: "Critical" | "High" | "Medium" | "Low";
  projectedStatus: string;
  href: string;
};

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase admin environment variables.");
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

function closureProbability(age: number, closed: boolean) {
  if (closed) return 100;

  if (age <= 6) return 82;
  if (age <= 24) return 68;
  if (age <= 48) return 54;
  if (age <= 96) return 31;

  return 14;
}

function supplierReliability(age: number) {
  if (age <= 12) return "Excellent";
  if (age <= 36) return "Good";
  if (age <= 72) return "Moderate";
  return "Weak";
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("conversations")
      .select("id,title,context_type,created_at,updated_at,is_closed")
      .order("updated_at", { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    const rows = Array.isArray(data) ? (data as ConversationRow[]) : [];

    const enriched: ForecastRow[] = rows.map((row) => {
      const age = hoursSince(row.updated_at || row.created_at);
      const probability = closureProbability(age, Boolean(row.is_closed));

      return {
        id: row.id,
        title: row.title || "Procurement conversation",
        module: row.context_type || "conversation",
        ageHours: Math.round(age),
        closureProbability: probability,
        supplierReliability: supplierReliability(age),
        risk:
          probability <= 20
            ? "Critical"
            : probability <= 40
              ? "High"
              : probability <= 65
                ? "Medium"
                : "Low",
        projectedStatus:
          probability >= 70
            ? "Likely to close"
            : probability >= 40
              ? "Needs follow-up"
              : "High churn risk",
        href: `/dashboard/thread/${row.id}`,
      };
    });

    const avgProbability =
      enriched.length > 0
        ? Math.round(
            enriched.reduce(
              (sum: number, item: ForecastRow) =>
                sum + item.closureProbability,
              0
            ) / enriched.length
          )
        : 0;

    const likelyClosures = enriched.filter(
      (r: ForecastRow) => r.closureProbability >= 70
    ).length;

    const highRisk = enriched.filter(
      (r: ForecastRow) => r.risk === "Critical" || r.risk === "High"
    ).length;

    return NextResponse.json({
      ok: true,
      summary: {
        totalThreads: enriched.length,
        avgProbability,
        likelyClosures,
        highRisk,
      },
      forecast: {
        executiveInsight:
          avgProbability >= 60
            ? "Procurement conversion health is strong."
            : avgProbability >= 40
              ? "Pipeline health is moderate and requires active follow-up."
              : "Procurement pipeline needs aggressive engagement.",
        nextWeekForecast:
          likelyClosures >= 10
            ? "High procurement momentum expected next week."
            : likelyClosures >= 4
              ? "Moderate procurement momentum expected next week."
              : "Low procurement momentum expected next week.",
      },
      rows: enriched
        .sort(
          (a: ForecastRow, b: ForecastRow) =>
            b.closureProbability - a.closureProbability
        )
        .slice(0, 30),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Forecast engine failed.",
      },
      { status: 500 }
    );
  }
}
