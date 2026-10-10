import type {
  SupabaseClient,
  User,
} from "@supabase/supabase-js";

export type MobileVendorNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string | null;
};

export type MobileVendorConversation = {
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

export type MobileVendorWorkspace = {
  generatedAt: string;
  notifications: MobileVendorNotification[];
  conversations: MobileVendorConversation[];
};

type ConversationRow = {
  id: string;
  rfq_id: string | null;
  context_id: string | null;
  buyer_user_id: string | null;
  vendor_user_id: string | null;
  is_closed: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_user_id: string | null;
  sender_role: string | null;
  body: string | null;
  message_type: string | null;
  created_at: string | null;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function time(value: string | null) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function buildMobileVendorWorkspace(
  supabase: SupabaseClient,
  user: User,
): Promise<MobileVendorWorkspace> {
  const [notificationResult, conversationResult] =
    await Promise.all([
      supabase
        .from("vendor_notifications")
        .select("id,type,title,message,is_read,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("conversations")
        .select(
          "id,rfq_id,context_id,buyer_user_id,vendor_user_id,is_closed,created_at,updated_at",
        )
        .eq("context_type", "rfq")
        .eq("vendor_user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(50),
    ]);

  if (notificationResult.error) {
    throw new Error(notificationResult.error.message);
  }

  if (conversationResult.error) {
    throw new Error(conversationResult.error.message);
  }

  const conversations =
    (conversationResult.data ?? []) as ConversationRow[];

  if (conversations.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      notifications: (notificationResult.data ?? []).map(
        (row: any) => ({
          id: text(row.id),
          type: text(row.type) || "general",
          title: text(row.title) || "3Bigha update",
          message: text(row.message),
          isRead: row.is_read === true,
          createdAt: row.created_at || null,
        }),
      ),
      conversations: [],
    };
  }

  const conversationIds = conversations.map((row) => row.id);

  const rfqIds = Array.from(
    new Set(
      conversations
        .map((row) => text(row.rfq_id || row.context_id))
        .filter(Boolean),
    ),
  );

  const buyerIds = Array.from(
    new Set(
      conversations
        .map((row) => text(row.buyer_user_id))
        .filter(Boolean),
    ),
  );

  const [messageResult, participantResult, rfqResult, profileResult] =
    await Promise.all([
      supabase
        .from("conversation_messages")
        .select(
          "id,conversation_id,sender_user_id,sender_role,body,message_type,created_at",
        )
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: true }),
      supabase
        .from("conversation_participants")
        .select("conversation_id,last_read_at")
        .eq("user_id", user.id)
        .in("conversation_id", conversationIds),
      rfqIds.length > 0
        ? supabase
            .from("rfqs")
            .select("id,public_id,status")
            .in("id", rfqIds)
        : Promise.resolve({ data: [], error: null } as any),
      buyerIds.length > 0
        ? supabase
            .from("profiles")
            .select("id,full_name")
            .in("id", buyerIds)
        : Promise.resolve({ data: [], error: null } as any),
    ]);

  for (const result of [
    messageResult,
    participantResult,
    rfqResult,
    profileResult,
  ]) {
    if (result.error) throw new Error(result.error.message);
  }

  const messages =
    (messageResult.data ?? []) as MessageRow[];

  const messagesByConversation =
    new Map<string, MessageRow[]>();

  for (const message of messages) {
    const current =
      messagesByConversation.get(message.conversation_id) ?? [];
    current.push(message);
    messagesByConversation.set(message.conversation_id, current);
  }

  const lastReadByConversation = new Map<string, number>();

  for (const row of participantResult.data ?? []) {
    lastReadByConversation.set(
      text((row as any).conversation_id),
      time((row as any).last_read_at || null),
    );
  }

  const rfqById = new Map<string, any>();

  for (const row of rfqResult.data ?? []) {
    rfqById.set(text((row as any).id), row);
  }

  const profileById = new Map<string, any>();

  for (const row of profileResult.data ?? []) {
    profileById.set(text((row as any).id), row);
  }

  const projectedConversations =
    conversations.map((conversation) => {
      const conversationMessages =
        messagesByConversation.get(conversation.id) ?? [];

      const lastMessage =
        conversationMessages.length > 0
          ? conversationMessages[
              conversationMessages.length - 1
            ]
          : null;

      const lastRead =
        lastReadByConversation.get(conversation.id) ?? 0;

      const unreadCount =
        conversationMessages.filter((message) => {
          const senderIsSelf =
            text(message.sender_user_id) === user.id;
          const system =
            text(message.sender_role).toLowerCase() === "system" ||
            text(message.message_type).toLowerCase() === "system";

          return (
            !senderIsSelf &&
            !system &&
            time(message.created_at) > lastRead
          );
        }).length;

      const rfqId = text(
        conversation.rfq_id || conversation.context_id,
      );
      const rfq = rfqById.get(rfqId);
      const buyer = profileById.get(
        text(conversation.buyer_user_id),
      );

      return {
        id: conversation.id,
        rfqId,
        rfqNumber: text(rfq?.public_id) || null,
        counterpartName: text(buyer?.full_name) || null,
        rfqStatus: text(rfq?.status) || null,
        isClosed: conversation.is_closed === true,
        lastMessageBody: lastMessage?.body || null,
        lastMessageType: lastMessage?.message_type || null,
        lastMessageAt: lastMessage?.created_at || null,
        unreadCount,
      };
    });

  projectedConversations.sort((left, right) => {
    if (right.unreadCount !== left.unreadCount) {
      return right.unreadCount - left.unreadCount;
    }

    return time(right.lastMessageAt) - time(left.lastMessageAt);
  });

  return {
    generatedAt: new Date().toISOString(),
    notifications: (notificationResult.data ?? []).map(
      (row: any) => ({
        id: text(row.id),
        type: text(row.type) || "general",
        title: text(row.title) || "3Bigha update",
        message: text(row.message),
        isRead: row.is_read === true,
        createdAt: row.created_at || null,
      }),
    ),
    conversations: projectedConversations,
  };
}
