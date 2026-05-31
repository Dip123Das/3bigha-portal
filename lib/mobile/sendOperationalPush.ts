import { notifyUser } from "./notifyUser";

export type OperationalPushCategory =
  | "chat_message"
  | "rfq_response"
  | "vendor_lead"
  | "procurement_alert"
  | "operational_alert";

export async function sendOperationalPush(input: {
  userId: string;
  title: string;
  body: string;
  url: string;
  category?: OperationalPushCategory;
  rfqId?: string;
  conversationId?: string;
  priority?: "normal" | "high" | "critical";
}) {
  if (!input.userId) return { ok: false, skipped: "missing_user" };

  await notifyUser(input.userId, {
    title: input.title,
    body: input.body,
    category: input.category || "operational_alert",
    url: input.url,
    rfqId: input.rfqId,
    conversationId: input.conversationId,
    data: {
      source: "real_mobile_push_delivery_engine",
      priority: input.priority || "normal",
      deepLink: input.url,
    },
  });

  return { ok: true };
}

export function buildPushUrl(input: {
  conversationId?: string;
  rfqId?: string;
  fallback?: string;
}) {
  if (input.conversationId) {
    return `/dashboard/thread/${input.conversationId}`;
  }

  if (input.rfqId) {
    return `/dashboard/buyer/quote-compare/${input.rfqId}`;
  }

  return input.fallback || "/dashboard";
}