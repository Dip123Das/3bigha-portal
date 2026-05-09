import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase admin environment variables.");
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

function isCronAuthorized(req: Request) {
  const configured = process.env.CRON_SECRET;
  if (!configured) return true;

  const auth = req.headers.get("authorization") || "";
  const token = auth.replace("Bearer ", "").trim();

  const url = new URL(req.url);
  const querySecret = url.searchParams.get("secret") || "";

  return token === configured || querySecret === configured;
}

function parseMs(v?: string | null) {
  if (!v) return 0;
  const n = new Date(v).getTime();
  return Number.isFinite(n) ? n : 0;
}

function hoursSince(v?: string | null) {
  const ms = parseMs(v);
  if (!ms) return 999;
  return Math.max(0, (Date.now() - ms) / (1000 * 60 * 60));
}

function buildNotificationForConversation(row: any) {
  const age = hoursSince(row.updated_at || row.created_at);
  const contextType = String(row.context_type || "conversation");

  const priority =
    age >= 96 ? "critical" : age >= 48 ? "high" : age >= 24 ? "medium" : "low";

  const title =
    priority === "critical"
      ? "🚨 Stale procurement thread"
      : priority === "high"
      ? "⚡ Procurement follow-up required"
      : "⏳ Procurement reminder";

  const message =
    priority === "critical"
      ? `A ${contextType} procurement conversation has been inactive for more than 4 days. Escalate or follow up now.`
      : priority === "high"
      ? `A ${contextType} procurement conversation is aging. Send a follow-up to avoid losing the deal.`
      : `A ${contextType} procurement conversation may need a reminder.`;

  return {
    priority,
    title,
    message,
    age,
  };
}

async function insertVendorNotificationIfMissing({
  supabase,
  userId,
  conversationId,
  notification,
}: {
  supabase: ReturnType<typeof getSupabaseAdmin>;
  userId: string;
  conversationId: string;
  notification: {
    priority: string;
    title: string;
    message: string;
    age: number;
  };
}) {
  const since = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();

  const { data: existing } = await supabase
    .from("vendor_notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "procurement_ai")
    .eq("data->>conversation_id", conversationId)
    .gte("created_at", since)
    .maybeSingle();

  if (existing?.id) {
    return { created: false, id: existing.id };
  }

  const { data, error } = await supabase
    .from("vendor_notifications")
    .insert({
      user_id: userId,
      type: "procurement_ai",
      title: notification.title,
      message: notification.message,
      data: {
        conversation_id: conversationId,
        source: "cron-procurement-execution",
        priority: notification.priority,
        age_hours: Math.round(notification.age),
        href: `/dashboard/thread/${conversationId}`,
      },
      is_read: false,
      whatsapp_sent: false,
      push_sent: false,
    })
    .select("id")
    .single();

  if (error) {
    return { created: false, error: error.message };
  }

  return { created: true, id: data?.id };
}

export async function GET(req: Request) {
  try {
    if (!isCronAuthorized(req)) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: conversations, error } = await supabase
      .from("conversations")
      .select("id,title,buyer_user_id,vendor_user_id,context_type,created_at,updated_at,is_closed")
      .eq("is_closed", false)
      .lt("updated_at", cutoff)
      .order("updated_at", { ascending: true })
      .limit(40);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const rows = Array.isArray(conversations) ? conversations : [];

    let created = 0;
    let skipped = 0;
    const results: any[] = [];

    for (const row of rows) {
      const notification = buildNotificationForConversation(row);

      if (notification.priority === "low") {
        skipped += 1;
        continue;
      }

      const targetUserId = String(row.vendor_user_id || row.buyer_user_id || "").trim();

      if (!targetUserId) {
        skipped += 1;
        continue;
      }

      const result = await insertVendorNotificationIfMissing({
        supabase,
        userId: targetUserId,
        conversationId: String(row.id),
        notification,
      });

      if (result.created) created += 1;
      else skipped += 1;

      results.push({
        conversationId: row.id,
        priority: notification.priority,
        ...result,
      });
    }

    return NextResponse.json({
      ok: true,
      scanned: rows.length,
      created,
      skipped,
      results,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Procurement execution cron failed." },
      { status: 500 }
    );
  }
}