export type ConversationContextType =
  | "rfq"
  | "listing"
  | "property_inquiry"
  | "service_inquiry"
  | "rental_inquiry";

export type ConversationRole = "buyer" | "vendor" | "admin" | "system";

export type ConversationMessageType =
  | "text"
  | "image"
  | "file"
  | "audio"
  | "system";

export type ConversationRow = {
  id: string;
  context_type: ConversationContextType;
  context_id: string;

  rfq_id: string | null;
  listing_id: string | null;
  property_id: string | null;
  service_id: string | null;
  rental_id: string | null;

  buyer_user_id: string | null;
  vendor_user_id: string | null;

  created_by_user_id: string | null;
  title: string | null;
  context_snapshot: Record<string, any>;

  last_message_id: string | null;
  last_message_at: string | null;

  buyer_last_seen_at: string | null;
  vendor_last_seen_at: string | null;

  buyer_archived: boolean;
  vendor_archived: boolean;
  is_closed: boolean;

  created_at: string;
  updated_at: string;
};

export type ConversationMessageRow = {
  id: string;
  conversation_id: string;
  sender_user_id: string | null;
  sender_role: ConversationRole;
  message_type: ConversationMessageType;
  body: string;
  reply_to_message_id: string | null;
  meta: Record<string, any>;
  edited_at: string | null;
  deleted_for_everyone: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EnsureConversationPayload = {
  contextType: ConversationContextType;
  contextId: string;
  buyerUserId: string;
  vendorUserId: string;
  title?: string;
  contextSnapshot?: Record<string, any>;
  rfqId?: string | null;
  listingId?: string | null;
  propertyId?: string | null;
  serviceId?: string | null;
  rentalId?: string | null;
  starterMessage?: string | null;
};

export type SendConversationMessagePayload = {
  conversationId: string;
  messageType: ConversationMessageType;
  body: string;
  replyToMessageId?: string | null;
  meta?: Record<string, any>;
};