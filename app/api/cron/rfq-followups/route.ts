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

type FollowupAutomationDecision = {
  shouldSend: boolean;
  automationStage: "first_reminder" | "urgent_escalation" | "final_nudge" | "skip";
  urgency: "normal" | "high" | "critical";
  reason: string;
  maxFollowupsReached: boolean;
};

function getHoursSince(iso?: string | null) {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, (Date.now() - t) / (1000 * 60 * 60));
}

function decideFollowupAutomation(row: any): FollowupAutomationDecision {
  const followupCount = Number(row.followup_count || 0);
  const ageHours = getHoursSince(row.created_at);
  const lastFollowupHours = getHoursSince(row.followup_sent_at);

  if (row.read_at) {
    return {
      shouldSend: false,
      automationStage: "skip",
      urgency: "normal",
      reason: "Notification already read.",
      maxFollowupsReached: false,
    };
  }

  if (followupCount >= 3) {
    return {
      shouldSend: false,
      automationStage: "skip",
      urgency: "critical",
      reason: "Maximum follow-up limit reached.",
      maxFollowupsReached: true,
    };
  }

  if (row.followup_sent_at && lastFollowupHours < 12) {
    return {
      shouldSend: false,
      automationStage: "skip",
      urgency: "normal",
      reason: "Recent follow-up already sent within 12 hours.",
      maxFollowupsReached: false,
    };
  }

  if (ageHours >= 48 && followupCount >= 2) {
    return {
      shouldSend: true,
      automationStage: "final_nudge",
      urgency: "critical",
      reason: "RFQ still unread after multiple reminders.",
      maxFollowupsReached: false,
    };
  }

  if (ageHours >= 24 && followupCount >= 1) {
    return {
      shouldSend: true,
      automationStage: "urgent_escalation",
      urgency: "high",
      reason: "Vendor has not responded after first reminder.",
      maxFollowupsReached: false,
    };
  }

  if (ageHours >= 0.5 && followupCount === 0) {
    return {
      shouldSend: true,
      automationStage: "first_reminder",
      urgency: "normal",
      reason: "New RFQ has not been viewed/responded after 30 minutes.",
      maxFollowupsReached: false,
    };
  }

  return {
    shouldSend: false,
    automationStage: "skip",
    urgency: "normal",
    reason: "Not due for follow-up yet.",
    maxFollowupsReached: false,
  };
}

async function generateAiFollowupText({
  title,
  message,
  rfqLink,
  automationStage,
  urgency,
}: {
  title?: string | null;
  message?: string | null;
  rfqLink: string;
  automationStage?: FollowupAutomationDecision["automationStage"];
  urgency?: FollowupAutomationDecision["urgency"];
}) {
  const stageLabel =
    automationStage === "urgent_escalation"
      ? "Urgent RFQ Follow-up"
      : automationStage === "final_nudge"
        ? "Final RFQ Reminder"
        : "RFQ Reminder";

  const urgencyLine =
    urgency === "critical"
      ? "This enquiry is still waiting and may need immediate attention."
      : urgency === "high"
        ? "Please respond today to avoid missing this buyer enquiry."
        : "Please open and respond when available.";

  const fallbackText = `⏰ ${stageLabel}

${urgencyLine}

${message || title || "A buyer enquiry is waiting for your response."}

👉 Open now: ${rfqLink}`;

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) return fallbackText;

  try {
    const prompt = `
Write a short WhatsApp RFQ follow-up message for a vendor on 3bigha.com.

Automation context:
- Stage: ${automationStage || "first_reminder"}
- Urgency: ${urgency || "normal"}

Rules:
- Keep it polite and action-oriented.
- Mention that a buyer enquiry/RFQ is waiting.
- Ask vendor to open and respond with price, availability, delivery/work timeline.
- Do not mention AI.
- Do not add false promises.
- Do not sound threatening.
- Keep it under 90 words.
- Include this link exactly once: ${rfqLink}

RFQ title/message:
${message || title || "Buyer enquiry waiting."}
`;

    const aiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: [{ role: "user", content: prompt }],
        temperature: 0.25,
        max_output_tokens: 180,
      }),
    });

    const aiJson = await aiRes.json().catch(() => null);
    const outputText =
      typeof aiJson?.output_text === "string"
        ? aiJson.output_text
        : aiJson?.output
            ?.flatMap((item: any) => item?.content || [])
            ?.map((content: any) => content?.text)
            ?.filter(Boolean)
            ?.join("\n");

    const cleanText = String(outputText || "").trim();

    if (!aiRes.ok || !cleanText) return fallbackText;

    return cleanText.includes(rfqLink)
      ? cleanText
      : `${cleanText}

👉 Open now: ${rfqLink}`;
  } catch {
    return fallbackText;
  }
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
        "id,vendor_user_id,vendor_phone,rfq_id,title,message,created_at,read_at,followup_sent_at,followup_count,status,last_followup_error"
      )
      .eq("type", "new_rfq")
      .is("read_at", null)
      .lte("created_at", cutoff)
      .lt("followup_count", 3)
      .order("created_at", { ascending: true })
      .limit(30);

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

    const automationStats = {
      first_reminder: 0,
      urgent_escalation: 0,
      final_nudge: 0,
      max_followups_reached: 0,
      missing_phone_or_rfq: 0,
    };

    for (const row of rows || []) {
      const decision = decideFollowupAutomation(row);

      if (!decision.shouldSend) {
        skipped += 1;

        if (decision.maxFollowupsReached) {
          automationStats.max_followups_reached += 1;
        }

        await supabase
          .from("vendor_notifications")
          .update({
            last_followup_error: decision.reason,
          })
          .eq("id", row.id);

        continue;
      }

      const to = normalizeIndianPhone(row.vendor_phone || "");

      if (!to || !row.rfq_id) {
        skipped += 1;
        automationStats.missing_phone_or_rfq += 1;

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

      const text = await generateAiFollowupText({
        title: row.title,
        message: row.message,
        rfqLink,
        automationStage: decision.automationStage,
        urgency: decision.urgency,
      });

      const result = await sendGupshupWhatsApp({ to, text });

      if (result.ok) {
        sent += 1;

        if (decision.automationStage === "first_reminder") {
          automationStats.first_reminder += 1;
        }

        if (decision.automationStage === "urgent_escalation") {
          automationStats.urgent_escalation += 1;
        }

        if (decision.automationStage === "final_nudge") {
          automationStats.final_nudge += 1;
        }

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
      automationStats,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Follow-up cron failed." },
      { status: 500 }
    );
  }
}