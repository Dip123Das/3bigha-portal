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

    let alertMessage: string | null = null;

    if (lastRow?.rank && rank > Number(lastRow.rank)) {
      alertMessage = `⚠️ Your rank dropped from #${lastRow.rank} to #${rank}. A competitor may have improved visibility.`;
    } else if (lastRow?.rank && rank < Number(lastRow.rank)) {
      alertMessage = `🔥 Your rank improved from #${lastRow.rank} to #${rank}. Keep your visibility active.`;
    }

    const { error } = await supabase.from("vendor_rank_history").insert({
      user_id: user.id,
      rank,
      score,
      alert_message: alertMessage,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (alertMessage && lastRow?.rank) {
      const whatsappText = buildWhatsAppText(alertMessage);

      await supabase.from("vendor_notifications").insert({
        user_id: user.id,
        type: getNotificationType(rank, Number(lastRow.rank)),
        title: rank > Number(lastRow.rank) ? "Rank dropped" : "Rank improved",
        message: alertMessage,
        data: {
          previous_rank: Number(lastRow.rank),
          current_rank: rank,
          score,
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
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to save rank history" },
      { status: 500 }
    );
  }
}