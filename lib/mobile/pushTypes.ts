export type MobilePushCategory =
  | "chat_message"
  | "rfq_response"
  | "vendor_lead"
  | "procurement_alert"
  | "operational_alert"
  | "silent_sync";

export type MobilePushPayload = {
  title: string;
  body: string;

  category: MobilePushCategory;

  url?: string;

  image?: string;

  conversationId?: string;
  rfqId?: string;

  silent?: boolean;

  data?: Record<string, any>;
};