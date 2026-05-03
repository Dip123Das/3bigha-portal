import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey);
}

function isPremiumPlan(plan: unknown, status: unknown, boostPriority: unknown) {
  const p = String(plan || "free").toLowerCase();
  const s = String(status || "free").toLowerCase();
  const boost = Number(boostPriority || 0);

  return (
    boost > 0 ||
    s === "active" ||
    p === "silver" ||
    p === "gold" ||
    p === "platinum" ||
    p === "premium" ||
    p === "hub_vendor"
  );
}

type AlertMessage = {
  role?: string;
  body?: string;
};

type AlertResponse = {
  alert: boolean;
  severity: "low" | "medium" | "high";
  audience: "buyer" | "vendor" | "both";
  priority: "free" | "premium";
  premiumEligible: boolean;
  title: string;
  insight: string;
  buyerHint: string;
  vendorHint: string;
  upgradeHint: string;
  actionLabel: string;
  actionMessage: string;
};

function fallbackAlert(): AlertResponse {
  return {
    alert: false,
    severity: "medium",
    audience: "both",
    priority: "free",
    premiumEligible: false,
    title: "Deal Activity Detected",
    insight:
      "Conversation is active. More price, quantity, delivery and confirmation details may be needed.",
    buyerHint:
      "Ask for final price, quantity, delivery location, delivery time and bill details before payment.",
    vendorHint:
      "Reply quickly with price, availability, delivery timeline and trust details.",
    upgradeHint:
      "Premium vendors can receive stronger priority alerts when buyers show closing intent.",
    actionLabel: "Ask Final Details",
    actionMessage:
      "Please confirm final price, quantity, delivery location, delivery time and bill/document availability.",
  };
}

function extractText(payload: any): string {
  if (typeof payload?.output_text === "string") return payload.output_text;

  const parts = payload?.output
    ?.flatMap((item: any) => item?.content || [])
    ?.map((content: any) => content?.text)
    ?.filter(Boolean);

  return parts?.join("\n") || "";
}

function heuristicAlert(messages: AlertMessage[]): AlertResponse {
  const text = messages
    .map((m) => `${m.role || "user"}: ${m.body || ""}`)
    .join("\n")
    .toLowerCase();

  const hasPrice =
    text.includes("price") ||
    text.includes("rate") ||
    text.includes("₹") ||
    text.includes("rs") ||
    text.includes("rupee");

  const hasQuantity =
    text.includes("quantity") ||
    text.includes("qty") ||
    text.includes("bag") ||
    text.includes("cft") ||
    text.includes("ton") ||
    text.includes("piece");

  const hasDelivery =
    text.includes("delivery") ||
    text.includes("dispatch") ||
    text.includes("tomorrow") ||
    text.includes("today");

  const hasConfirmation =
    text.includes("confirm") ||
    text.includes("confirmed") ||
    text.includes("final") ||
    text.includes("finalised") ||
    text.includes("done") ||
    text.includes("okay");

  const hasPayment =
    text.includes("payment") ||
    text.includes("advance") ||
    text.includes("bill");

  if (hasDelivery && hasConfirmation && (!hasPrice || !hasQuantity)) {
    return {
      alert: true,
      severity: "medium",
      audience: "both",
      priority: "free",
      premiumEligible: true,
      title: "Deal Moving Fast — Details Missing",
      insight:
        "Dispatch and confirmation signals are present, but price or quantity is still missing.",
      buyerHint:
        "Confirm final price, quantity, delivery address and bill details before payment.",
      vendorHint:
        "Reply with final price, quantity confirmation, delivery time and bill details.",
      upgradeHint:
        "Premium vendors can receive priority alerts when buyers move toward confirmation.",
      actionLabel: "Ask Missing Details",
      actionMessage:
        "Please confirm final price, quantity, delivery address, delivery time and bill details before we proceed.",
    };
  }

  if (hasPrice && hasQuantity && hasDelivery && hasConfirmation) {
    return {
      alert: true,
      severity: "high",
      audience: "both",
      priority: "premium",
      premiumEligible: true,
      title: "High Intent Buyer Detected",
      insight:
        "This conversation has strong closing signals. Confirm final terms safely.",
      buyerHint:
        "Buyer should verify price, quantity, address, delivery time and bill before payment.",
      vendorHint:
        "Vendor should respond immediately. This buyer may be ready to close.",
      upgradeHint:
        "Premium vendors should receive instant priority alert for this buyer signal.",
      actionLabel: "Send Closing Message",
      actionMessage:
        "Please confirm final price, quantity, delivery address, delivery time and bill details so we can proceed safely.",
    };
  }

  if (hasDelivery || hasConfirmation || hasPrice) {
    return {
      alert: true,
      severity: "medium",
      audience: "both",
      priority: "free",
      premiumEligible: true,
      title: "Active Deal Opportunity",
      insight:
        "This deal is active, but final terms are not complete yet.",
      buyerHint:
        "Ask for price, quantity, delivery address, delivery time and bill details.",
      vendorHint:
        "Give clear final details quickly to avoid losing the lead.",
      upgradeHint:
        "Boosted vendors can use priority alerts to respond faster and close more deals.",
      actionLabel: "Ask Final Details",
      actionMessage:
        "Please confirm final price, quantity, delivery location and delivery timeline.",
    };
  }

  return fallbackAlert();
}

async function createPremiumVendorAlertNotification({
  vendorUserId,
  alert,
}: {
  vendorUserId: string;
  alert: AlertResponse;
}) {
  const supabase = getSupabaseAdmin();

  if (!supabase || !vendorUserId || !alert.alert || !alert.premiumEligible) {
    return {
      created: false,
      reason: "Not eligible or Supabase admin unavailable",
    };
  }

  const { data: profile } = await supabase
    .from("business_profiles")
    .select("subscription_plan,subscription_status,boost_priority,boost_expires_at")
    .eq("user_id", vendorUserId)
    .maybeSingle();

  const boostExpiresAt = profile?.boost_expires_at
    ? new Date(String(profile.boost_expires_at))
    : null;

  const boostExpired = boostExpiresAt ? boostExpiresAt < new Date() : false;

  const premium = isPremiumPlan(
    profile?.subscription_plan,
    profile?.subscription_status,
    boostExpired ? 0 : profile?.boost_priority
  );

  if (!premium) {
    return {
      created: false,
      premium: false,
      reason: "Vendor is not premium or boosted",
    };
  }

  const message = [
    `🔥 ${alert.title}`,
    "",
    alert.vendorHint || alert.insight,
    "",
    "Reply quickly and confirm:",
    "✔ Final price",
    "✔ Quantity",
    "✔ Delivery address/time",
    "✔ Bill/document details",
  ].join("\n");

  const { data, error } = await supabase
    .from("vendor_notifications")
    .insert({
      user_id: vendorUserId,
      title: alert.title,
      message,
      type: "premium_buyer_alert",
      priority: alert.priority,
      is_read: false,
      whatsapp_status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    return {
      created: false,
      premium: true,
      error: error.message,
    };
  }

  return {
    created: true,
    premium: true,
    notificationId: data?.id || null,
  };
}

function normalizeAlert(value: unknown, fallback: AlertResponse): AlertResponse {
  if (!value || typeof value !== "object") return fallback;

  const row = value as Partial<AlertResponse>;
  const severity =
    row.severity === "high" || row.severity === "medium" || row.severity === "low"
      ? row.severity
      : fallback.severity;

  const audience =
    row.audience === "buyer" || row.audience === "vendor" || row.audience === "both"
      ? row.audience
      : fallback.audience;

  const priority =
    row.priority === "premium" || row.priority === "free"
      ? row.priority
      : fallback.priority;

  return {
    alert: Boolean(row.alert ?? fallback.alert),
    severity,
    audience,
    priority,
    premiumEligible: Boolean(row.premiumEligible ?? fallback.premiumEligible),
    title: String(row.title || fallback.title).slice(0, 70),
    insight: String(row.insight || fallback.insight).slice(0, 220),
    buyerHint: String(row.buyerHint || fallback.buyerHint).slice(0, 220),
    vendorHint: String(row.vendorHint || fallback.vendorHint).slice(0, 220),
    upgradeHint: String(row.upgradeHint || fallback.upgradeHint).slice(0, 220),
    actionLabel: String(row.actionLabel || fallback.actionLabel).slice(0, 50),
    actionMessage: String(row.actionMessage || fallback.actionMessage).slice(0, 220),
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const side = String(body?.side || "buyer").toLowerCase();
    const vendorUserId = String(body?.vendorUserId || "");

    const messages: AlertMessage[] = Array.isArray(body?.messages)
      ? body.messages.slice(-12)
      : [];

    const fallback = heuristicAlert(messages);

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey || messages.length === 0) {
      const monetization =
        fallback.alert && fallback.premiumEligible && vendorUserId
          ? await createPremiumVendorAlertNotification({
              vendorUserId,
              alert: fallback,
            })
          : {
              created: false,
              reason: "No vendorUserId or alert not premium eligible",
            };

      return NextResponse.json({
        ok: true,
        source: "heuristic",
        side,
        monetization,
        ...fallback,
      });
    }

    const context = messages
      .map((m) => `${String(m.role || "user")}: ${String(m.body || "").slice(0, 500)}`)
      .join("\n");

    const prompt = `
You are the AI deal alert engine of 3bigha.com.

Detect whether this buyer-vendor conversation needs an alert.

Return only valid JSON:
{
  "alert": true,
  "severity": "high",
  "audience": "both",
  "title": "High Intent Buyer Detected",
  "insight": "Short insight under 180 characters.",
  "actionLabel": "Send Closing Message",
  "actionMessage": "Short safe next message."
}

Audience rules:
- vendor: alert vendor when buyer is serious or waiting.
- buyer: alert buyer when vendor is responsive or final details are missing.
- both: use when both sides should act.

Safety:
- Do not assume payment is completed.
- Do not mention AI.
- Push confirmation of final terms before payment.

Current side: ${side}

Chat:
${context}
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
        temperature: 0.2,
        max_output_tokens: 260,
      }),
    });

    const aiJson = await aiRes.json().catch(() => ({}));
    const raw = extractText(aiJson).trim();

    let parsed: unknown = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }

    const alert = normalizeAlert(parsed, fallback);

    const monetization =
      alert.alert && alert.premiumEligible && vendorUserId
        ? await createPremiumVendorAlertNotification({
            vendorUserId,
            alert,
          })
        : {
            created: false,
            reason: "No vendorUserId or alert not premium eligible",
          };

    return NextResponse.json({
      ok: true,
      source: parsed ? "ai+heuristic" : "heuristic",
      side,
      monetization,
      ...alert,
    });
  } catch {
    return NextResponse.json({
      ok: true,
      source: "catch-fallback",
      side: "buyer",
      ...fallbackAlert(),
    });
  }
}