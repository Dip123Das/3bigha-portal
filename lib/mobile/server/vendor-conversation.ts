import type {
  SupabaseClient,
  User,
} from "@supabase/supabase-js";

import { trackMemoryEvent } from "@/lib/ai/memory-events";
import { sendOperationalPush } from "@/lib/mobile/sendOperationalPush";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class MobileVendorConversationError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "MobileVendorConversationError";
  }
}

export type MobileVendorConversationMessage = {
  id: string;
  senderUserId: string | null;
  senderRole: string;
  messageType: string;
  body: string;
  createdAt: string | null;
  isMine: boolean;
};

export type MobileVendorConversationThread = {
  id: string;
  rfqId: string | null;
  rfqNumber: string | null;
  counterpartName: string | null;
  isClosed: boolean;
  messages: MobileVendorConversationMessage[];
};

type ConversationRow = {
  id: string;
  rfq_id: string | null;
  context_id: string | null;
  context_type: string | null;
  buyer_user_id: string | null;
  vendor_user_id: string | null;
  is_closed: boolean | null;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function requireConversationId(value: string) {
  const id = text(value);

  if (!UUID_RE.test(id)) {
    throw new MobileVendorConversationError(
      "A valid conversation is required.",
      400,
    );
  }

  return id;
}

async function requireVendorConversation(
  supabase: SupabaseClient,
  user: User,
  conversationId: string,
) {
  const id = requireConversationId(conversationId);

  const result = await supabase
    .from("conversations")
    .select(
      "id,rfq_id,context_id,context_type,buyer_user_id,vendor_user_id,is_closed",
    )
    .eq("id", id)
    .eq("context_type", "rfq")
    .eq("vendor_user_id", user.id)
    .maybeSingle();

  if (result.error) {
    throw new MobileVendorConversationError(
      result.error.message,
      500,
    );
  }

  if (!result.data) {
    throw new MobileVendorConversationError(
      "This vendor conversation was not found.",
      404,
    );
  }

  return result.data as ConversationRow;
}

function projectMessage(
  row: any,
  user: User,
): MobileVendorConversationMessage {
  return {
    id: text(row.id),
    senderUserId: text(row.sender_user_id) || null,
    senderRole: text(row.sender_role) || "unknown",
    messageType: text(row.message_type) || "text",
    body: String(row.body ?? ""),
    createdAt: row.created_at || null,
    isMine: text(row.sender_user_id) === user.id,
  };
}

export async function loadMobileVendorConversation(
  supabase: SupabaseClient,
  user: User,
  conversationId: string,
): Promise<MobileVendorConversationThread> {
  const conversation = await requireVendorConversation(
    supabase,
    user,
    conversationId,
  );

  const rfqId = text(
    conversation.rfq_id || conversation.context_id,
  );

  const [messagesResult, rfqResult, buyerResult] =
    await Promise.all([
      supabase
        .from("conversation_messages")
        .select(
          "id,sender_user_id,sender_role,message_type,body,created_at",
        )
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true }),
      rfqId
        ? supabase
            .from("rfqs")
            .select("id,public_id")
            .eq("id", rfqId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null } as any),
      conversation.buyer_user_id
        ? supabase
            .from("profiles")
            .select("id,full_name")
            .eq("id", conversation.buyer_user_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null } as any),
    ]);

  if (messagesResult.error) {
    throw new MobileVendorConversationError(
      messagesResult.error.message,
      500,
    );
  }

  if (rfqResult.error) {
    throw new MobileVendorConversationError(
      rfqResult.error.message,
      500,
    );
  }

  if (buyerResult.error) {
    throw new MobileVendorConversationError(
      buyerResult.error.message,
      500,
    );
  }

  return {
    id: conversation.id,
    rfqId: rfqId || null,
    rfqNumber: text(rfqResult.data?.public_id) || null,
    counterpartName:
      text(buyerResult.data?.full_name) || null,
    isClosed: conversation.is_closed === true,
    messages: (messagesResult.data ?? []).map((row) =>
      projectMessage(row, user),
    ),
  };
}

async function createSignalNotification(
  supabase: SupabaseClient,
  user: User,
  body: string,
) {
  const normalized = body.toLowerCase();

  const signals: Array<{
    matches: boolean;
    type: string;
    title: string;
    message: string;
  }> = [
    {
      matches: ["final", "confirm", "ok", "done"].some(
        (value) => normalized.includes(value),
      ),
      type: "deal_ready",
      title: "Deal closing opportunity",
      message:
        "The conversation may be ready for the next deal step.",
    },
    {
      matches: ["payment", "advance", "upi", "transfer"].some(
        (value) => normalized.includes(value),
      ),
      type: "payment_intent",
      title: "Payment intent detected",
      message:
        "Payment is being discussed. Continue only through an authorised 3Bigha payment flow.",
    },
    {
      matches: [
        "send otp",
        "bank transfer",
        "pay advance",
        "upi id",
        "account number",
      ].some((value) => normalized.includes(value)),
      type: "fraud_chat",
      title: "Suspicious message detected",
      message:
        "Avoid sharing OTPs, passwords or sensitive banking details.",
    },
  ];

  const active = signals.filter((signal) => signal.matches);

  if (active.length === 0) return;

  const result = await supabase
    .from("vendor_notifications")
    .insert(
      active.map((signal) => ({
        user_id: user.id,
        type: signal.type,
        title: signal.title,
        message: signal.message,
        is_read: false,
      })),
    );

  if (result.error) {
    console.error(
      "Native vendor message signal notification failed",
      result.error,
    );
  }
}

export async function sendMobileVendorMessage(
  supabase: SupabaseClient,
  user: User,
  conversationId: string,
  value: unknown,
): Promise<MobileVendorConversationMessage> {
  const conversation = await requireVendorConversation(
    supabase,
    user,
    conversationId,
  );

  if (conversation.is_closed === true) {
    throw new MobileVendorConversationError(
      "This conversation is closed and cannot accept new messages.",
      409,
    );
  }

  const body = text(value);

  if (!body) {
    throw new MobileVendorConversationError(
      "Message body is required.",
      400,
    );
  }

  if (body.length > 4000) {
    throw new MobileVendorConversationError(
      "Messages cannot exceed 4,000 characters.",
      400,
    );
  }

  const insertResult = await supabase
    .from("conversation_messages")
    .insert({
      conversation_id: conversation.id,
      sender_user_id: user.id,
      sender_role: "vendor",
      message_type: "text",
      body,
      meta: {},
    })
    .select(
      "id,sender_user_id,sender_role,message_type,body,created_at",
    )
    .single();

  if (insertResult.error) {
    throw new MobileVendorConversationError(
      insertResult.error.message,
      500,
    );
  }

  const inserted = insertResult.data;
  const now = new Date().toISOString();

  const participantResult = await supabase
    .from("conversation_participants")
    .upsert(
      {
        conversation_id: conversation.id,
        user_id: user.id,
        role: "vendor",
        last_read_at: now,
        last_seen_message_id: inserted.id,
      },
      {
        onConflict: "conversation_id,user_id",
      },
    );

  if (participantResult.error) {
    console.error(
      "Native vendor participant update failed",
      participantResult.error,
    );
  }

  const conversationResult = await supabase
    .from("conversations")
    .update({ updated_at: now })
    .eq("id", conversation.id)
    .eq("vendor_user_id", user.id);

  if (conversationResult.error) {
    console.error(
      "Native vendor conversation timestamp update failed",
      conversationResult.error,
    );
  }

  await createSignalNotification(supabase, user, body);

  try {
    if (conversation.buyer_user_id) {
      await sendOperationalPush({
        userId: conversation.buyer_user_id,
        title: "New vendor message",
        body: body.slice(0, 120),
        category: "chat_message",
        conversationId: conversation.id,
        url: `/dashboard/thread/${conversation.id}`,
        priority: "high",
      });
    }
  } catch (error) {
    console.error(
      "Native vendor conversation push failed",
      error,
    );
  }

  try {
    await trackMemoryEvent({
      userId: user.id,
      eventType: "chat_message",
      module: "chat",
      entityId: conversation.id,
      entityTitle: "Conversation message",
      category: "vendor",
      type: "text",
      metadata: {
        source: "mobile_vendor_conversation",
        message_id: inserted.id,
        sender_role: "vendor",
        has_body: true,
        message_type: "text",
      },
      score: 20,
    });
  } catch {
    // Memory tracking must never block a message.
  }

  return projectMessage(inserted, user);
}

export async function markMobileVendorConversationRead(
  supabase: SupabaseClient,
  user: User,
  conversationId: string,
  lastSeenMessageId: unknown,
) {
  const conversation = await requireVendorConversation(
    supabase,
    user,
    conversationId,
  );

  const messageId = text(lastSeenMessageId);

  if (messageId && !UUID_RE.test(messageId)) {
    throw new MobileVendorConversationError(
      "The last seen message is invalid.",
      400,
    );
  }

  if (messageId) {
    const messageResult = await supabase
      .from("conversation_messages")
      .select("id")
      .eq("id", messageId)
      .eq("conversation_id", conversation.id)
      .maybeSingle();

    if (messageResult.error) {
      throw new MobileVendorConversationError(
        messageResult.error.message,
        500,
      );
    }

    if (!messageResult.data) {
      throw new MobileVendorConversationError(
        "The last seen message does not belong to this conversation.",
        400,
      );
    }
  }

  const now = new Date().toISOString();

  const result = await supabase
    .from("conversation_participants")
    .upsert(
      {
        conversation_id: conversation.id,
        user_id: user.id,
        role: "vendor",
        last_read_at: now,
        last_seen_message_id: messageId || null,
      },
      {
        onConflict: "conversation_id,user_id",
      },
    )
    .select(
      "conversation_id,user_id,role,last_read_at,last_seen_message_id",
    )
    .single();

  if (result.error) {
    throw new MobileVendorConversationError(
      result.error.message,
      500,
    );
  }

  return {
    conversationId: conversation.id,
    lastReadAt: result.data.last_read_at || now,
    lastSeenMessageId:
      result.data.last_seen_message_id || null,
  };
}
