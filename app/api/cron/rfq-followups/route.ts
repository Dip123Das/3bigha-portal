import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase env vars.");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

function normalizeIndianPhone(phone: string) {
  const digits = String(phone || "").replace(/\D/g, "");

  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;

  return "";
}

async function sendGupshupWhatsApp({
  to,
  text,
}: {
  to: string;
  text: string;
}) {
  const apiKey = process.env.GUPSHUP_API_KEY;
  const sourcePhone = process.env.GUPSHUP_SOURCE_PHONE;
  const appName = process.env.GUPSHUP_APP_NAME;

  if (!apiKey || !sourcePhone || !appName || !to) {
    return {
      ok: false,
      skipped: true,
      error: "Gupshup env vars or phone missing.",
    };
  }

  const form = new URLSearchParams();
  form.set("channel", "whatsapp");
  form.set("source", sourcePhone);
  form.set("destination", to);
  form.set("src.name", appName);
  form.set("message", JSON.stringify({ type: "text", text }));

  const res = await fetch("https://api.gupshup.io/sm/api/v1/msg", {
    method: "POST",
    headers: {
      apikey: apiKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    return {
      ok: false,
      skipped: false,
      error: json?.message || "Gupshup follow-up send failed.",
    };
  }

  return { ok: true, skipped: false, data: json };
}

export async function GET(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization") || "";
    const vercelCron = req.headers.get("x-vercel-cron");
    const url = new URL(req.url);
    const queryKey = url.searchParams.get("key") || "";
    const token = authHeader.replace("Bearer ", "").trim();

    if (
      cronSecret &&
      token !== cronSecret &&
      queryKey !== cronSecret &&
      !vercelCron
    ) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized cron request." },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdmin();
    const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const { data: rows, error } = await supabase
      .from("vendor_notifications")
      .select(
        "id,vendor_user_id,vendor_phone,rfq_id,title,message,created_at,read_at,followup_sent_at,followup_count,status"
      )
      .eq("type", "new_rfq")
      .is("read_at", null)
      .is("followup_sent_at", null)
      .lte("created_at", cutoff)
      .limit(25);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      );
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://www.3bigha.com";

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const row of rows || []) {
      const to = normalizeIndianPhone(row.vendor_phone || "");

      if (!to || !row.rfq_id) {
        skipped += 1;

        await supabase
          .from("vendor_notifications")
          .update({
            followup_count: Number(row.followup_count || 0) + 1,
            last_followup_error: "Missing phone or RFQ id.",
          })
          .eq("id", row.id);

        continue;
      }

      const rfqLink = `${siteUrl}/dashboard/vendor/rfqs/${row.rfq_id}`;

      const text = `⏰ RFQ Reminder

You have not viewed/responded to this buyer enquiry yet.

${row.message || row.title}

👉 Open now: ${rfqLink}`;

      const result = await sendGupshupWhatsApp({ to, text });

      if (result.ok) {
        sent += 1;

        await supabase
          .from("vendor_notifications")
          .update({
            followup_sent_at: new Date().toISOString(),
            followup_count: Number(row.followup_count || 0) + 1,
            last_followup_error: null,
          })
          .eq("id", row.id);
      } else {
        failed += 1;

        await supabase
          .from("vendor_notifications")
          .update({
            followup_count: Number(row.followup_count || 0) + 1,
            last_followup_error: result.error || "Follow-up failed.",
          })
          .eq("id", row.id);
      }
    }

    return NextResponse.json({
      ok: true,
      checked: rows?.length || 0,
      sent,
      skipped,
      failed,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Follow-up cron failed." },
      { status: 500 }
    );
  }
}