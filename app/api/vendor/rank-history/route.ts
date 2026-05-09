import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase env vars");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

function getNotificationType(currentRank: number, previousRank: number) {
  if (currentRank > previousRank) return "rank_drop";
  if (currentRank < previousRank) return "rank_improved";
  return "rank_stable";
}

function buildWhatsAppText(message: string) {
  return [
    "3Bigha Vendor Alert",
    "",
    message,
    "",
    "Open your vendor dashboard to improve visibility:",
    "https://www.3bigha.com/dashboard/vendor",
  ].join("\n");
}

function buildVendorLearning({
  rank,
  score,
  previousRank,
  previousScore,
}: {
  rank: number;
  score: number;
  previousRank: number | null;
  previousScore: number | null;
}) {
  const rankDelta = previousRank ? previousRank - rank : 0;
  const scoreDelta = previousScore != null ? score - previousScore : 0;

  const momentumScore = Math.max(
    1,
    Math.min(
      100,
      Math.round(50 + rankDelta * 8 + scoreDelta * 0.7)
    )
  );

  const trend =
    !previousRank
      ? "new_signal"
      : rankDelta > 0
        ? "improving"
        : rankDelta < 0
          ? "declining"
          : scoreDelta > 0
            ? "score_improving"
            : scoreDelta < 0
              ? "score_declining"
              : "stable";

  const recommendation =
    trend === "improving" || trend === "score_improving"
      ? "Keep profile active, respond quickly to RFQs, and maintain quote quality."
      : trend === "declining" || trend === "score_declining"
        ? "Improve response speed, update business profile, add better quotes, and consider boost/subscription visibility."
        : "Maintain consistent RFQ response and profile completeness.";

  const risk =
    trend === "declining" && Math.abs(rankDelta) >= 3
      ? "high"
      : trend === "declining" || trend === "score_declining"
        ? "medium"
        : "low";

  return {
    previous_rank: previousRank,
    current_rank: rank,
    rank_delta: rankDelta,
    previous_score: previousScore,
    current_score: score,
    score_delta: Number(scoreDelta.toFixed(2)),
    momentum_score: momentumScore,
    trend,
    risk,
    recommendation,
    learning_reason:
      trend === "improving"
        ? "Vendor rank improved compared with previous snapshot."
        : trend === "declining"
          ? "Vendor rank dropped compared with previous snapshot."
          : trend === "score_improving"
            ? "Rank is stable but score improved."
            : trend === "score_declining"
              ? "Rank is stable but score declined."
              : "Vendor rank and score are stable.",
  };
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: "Invalid user" }, { status: 401 });
    }

    const body = await req.json();
    const rank = Number(body?.rank);
    const score = Number(body?.score);

    if (!Number.isFinite(rank) || !Number.isFinite(score)) {
      return NextResponse.json({ error: "Invalid rank data" }, { status: 400 });
    }

    const { data: lastRow } = await supabase
      .from("vendor_rank_history")
      .select("rank,score")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const previousRank = lastRow?.rank ? Number(lastRow.rank) : null;
    const previousScore =
      lastRow?.score != null && Number.isFinite(Number(lastRow.score))
        ? Number(lastRow.score)
        : null;

    const learning = buildVendorLearning({
      rank,
      score,
      previousRank,
      previousScore,
    });

    let alertMessage: string | null = null;

    if (previousRank && rank > previousRank) {
      alertMessage = `⚠️ Your rank dropped from #${previousRank} to #${rank}. AI suggests improving response speed, quote quality and profile visibility.`;
    } else if (previousRank && rank < previousRank) {
      alertMessage = `🔥 Your rank improved from #${previousRank} to #${rank}. Keep your visibility and response quality active.`;
    } else if (previousScore != null && score < previousScore) {
      alertMessage = `⚠️ Your vendor score reduced from ${previousScore} to ${score}. Improve profile activity and RFQ response quality.`;
    }

    const { error } = await supabase.from("vendor_rank_history").insert({
      user_id: user.id,
      rank,
      score,
      alert_message: alertMessage,
      learning_data: learning,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    try {
      await supabase.from("vendor_performance_metrics").upsert(
        {
          vendor_user_id: user.id,
          latest_rank: rank,
          latest_score: score,
          rank_momentum_score: learning.momentum_score,
          rank_trend: learning.trend,
          rank_risk: learning.risk,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "vendor_user_id" }
      );
    } catch {
      // Metrics table/columns may not exist yet. Rank history must still work.
    }

    if (alertMessage && previousRank) {
      const whatsappText = buildWhatsAppText(alertMessage);

      await supabase.from("vendor_notifications").insert({
        user_id: user.id,
        type: getNotificationType(rank, previousRank),
        title: rank > previousRank ? "Rank dropped" : "Rank improved",
        message: alertMessage,
        data: {
          ...learning,
          whatsapp_text: whatsappText,
          whatsapp_url: `https://wa.me/?text=${encodeURIComponent(whatsappText)}`,
          channel_ready: {
            dashboard: true,
            whatsapp: true,
            push: false,
          },
        },
        is_read: false,
        whatsapp_sent: false,
      });
    }

    return NextResponse.json({
      ok: true,
      alertMessage,
      learning,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to save rank history" },
      { status: 500 }
    );
  }
}