import type { Session } from "@supabase/supabase-js";

import { canonicalApiUrl, mobileApiRequest } from "@/lib/api/request";

export type VendorRfqRow = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  delivery_city: string | null;
  delivery_district: string | null;
  delivery_pincode: string | null;
  status: string | null;
  created_at: string | null;
  target_status: string | null;
  target_created_at: string | null;
};

export type VendorRfqAnalytics = {
  leadsLast7Days: number;
  leadsLast30Days: number;
  newLeadCount: number;
  viewedLeadCount: number;
  estimatedPremiumLeads: number;
};

export type VendorRfqInbox = {
  rows: VendorRfqRow[];
  analytics: VendorRfqAnalytics;
};

function errorMessage(value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    "error" in value &&
    typeof value.error === "string"
  ) {
    return value.error;
  }

  return "Your assigned RFQs could not be loaded.";
}

export async function loadVendorRfqs(
  session: Session,
): Promise<VendorRfqInbox> {
  const response = await fetch(
    canonicalApiUrl("/api/vendor/rfqs?limit=100"),
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
    },
  );

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(errorMessage(payload));
  }

  const value =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};

  const analytics =
    value.analytics && typeof value.analytics === "object"
      ? (value.analytics as Record<string, unknown>)
      : {};

  return {
    rows: Array.isArray(value.rows)
      ? (value.rows as VendorRfqRow[])
      : [],
    analytics: {
      leadsLast7Days: Number(analytics.leadsLast7Days || 0),
      leadsLast30Days: Number(analytics.leadsLast30Days || 0),
      newLeadCount: Number(analytics.newLeadCount || 0),
      viewedLeadCount: Number(analytics.viewedLeadCount || 0),
      estimatedPremiumLeads: Number(
        analytics.estimatedPremiumLeads || 0,
      ),
    },
  };
}

export type VendorNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string | null;
};

export type VendorConversation = {
  id: string;
  rfqId: string;
  rfqNumber: string | null;
  counterpartName: string | null;
  rfqStatus: string | null;
  isClosed: boolean;
  lastMessageBody: string | null;
  lastMessageType: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

export type VendorWorkspace = {
  generatedAt: string;
  notifications: VendorNotification[];
  conversations: VendorConversation[];
};

export function loadVendorWorkspace(
  session: Session,
): Promise<VendorWorkspace> {
  return mobileApiRequest<VendorWorkspace>(
    session,
    "/api/v1/mobile/vendor-workspace",
    { method: "GET" },
    "Your vendor notifications and conversations could not be loaded.",
  );
}

export type VendorConversationMessage = {
  id: string;
  senderUserId: string | null;
  senderRole: string;
  messageType: string;
  body: string;
  createdAt: string | null;
  isMine: boolean;
};

export type VendorConversationThread = {
  id: string;
  rfqId: string | null;
  rfqNumber: string | null;
  counterpartName: string | null;
  isClosed: boolean;
  messages: VendorConversationMessage[];
};

function conversationPath(conversationId: string) {
  return `/api/v1/mobile/vendor-workspace/conversations/${encodeURIComponent(
    conversationId,
  )}`;
}

export function loadVendorConversation(
  session: Session,
  conversationId: string,
): Promise<VendorConversationThread> {
  return mobileApiRequest<VendorConversationThread>(
    session,
    conversationPath(conversationId),
    { method: "GET" },
    "Your conversation could not be loaded.",
  );
}

export function sendVendorConversationMessage(
  session: Session,
  conversationId: string,
  body: string,
): Promise<VendorConversationMessage> {
  return mobileApiRequest<VendorConversationMessage>(
    session,
    conversationPath(conversationId),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body }),
    },
    "Your message could not be sent.",
  );
}

export function markVendorConversationSeen(
  session: Session,
  conversationId: string,
  lastSeenMessageId: string | null,
) {
  return mobileApiRequest<{
    conversationId: string;
    lastReadAt: string;
    lastSeenMessageId: string | null;
  }>(
    session,
    `${conversationPath(conversationId)}/seen`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ lastSeenMessageId }),
    },
    "Your conversation read state could not be updated.",
  );
}
