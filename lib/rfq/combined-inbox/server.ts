// lib/rfq/combined-inbox/server.ts
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export type CombinedInboxRole = "buyer" | "vendor";

export type CombinedInboxRow = {
  conversation_id: string;
  rfq_id: string;
  rfq_no: string | null;

  role: CombinedInboxRole;
  counterpart_user_id: string | null;
  counterpart_name: string | null;
  counterpart_phone: string | null;

  rfq_status: string | null;
  conversation_status: string | null;

  last_message_id: string | null;
  last_message_body: string | null;
  last_message_type: string | null;
  last_message_at: string | null;
  last_message_sender_user_id: string | null;
  last_message_sender_role: string | null;

  unread_count: number;
  last_seen_at: string | null;

  created_at: string | null;
  updated_at: string | null;

  open_href: string;
};

type ConversationRow = {
  id: string;
  rfq_id: string;
  buyer_user_id: string | null;
  vendor_user_id: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type RfqRow = {
  id: string;
  public_id: string | null;
  status: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
};

type ReadRow = {
  conversation_id: string;
  user_id: string;
  last_seen_at: string | null;
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

async function requireUser() {
  const cookieStore = cookies();
  const supabase = getSupabaseServerClient(cookieStore);

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      supabase,
      userId: null as string | null,
      error: error?.message ?? "Not logged in.",
    };
  }

  return {
    supabase,
    userId: user.id,
    error: null as string | null,
  };
}

function buildOpenHref(role: CombinedInboxRole, rfqId: string) {
  return role === "buyer"
    ? `/dashboard/buyer/quote-compare/${encodeURIComponent(rfqId)}/chat`
    : `/vendor/inbox-v2/${encodeURIComponent(rfqId)}/chat`;
}

export async function fetchCombinedInbox(params?: {
  q?: string;
  role?: "" | CombinedInboxRole;
}) {
  const { supabase, userId, error } = await requireUser();

  if (error || !userId) {
    return {
      rows: [] as CombinedInboxRow[],
      error: error ?? "Not logged in.",
    };
  }

  const { data: convData, error: convErr } = await supabase
    .from("rfq_conversations")
    .select("id,rfq_id,buyer_user_id,vendor_user_id,status,created_at,updated_at")
    .or(`buyer_user_id.eq.${userId},vendor_user_id.eq.${userId}`);

  if (convErr) {
    return {
      rows: [] as CombinedInboxRow[],
      error: convErr.message,
    };
  }

  const allConversations = (convData ?? []) as ConversationRow[];

  let conversations = allConversations.map((c) => {
    const role: CombinedInboxRole =
      String(c.buyer_user_id ?? "") === String(userId) ? "buyer" : "vendor";

    const counterpartUserId =
      role === "buyer" ? c.vendor_user_id ?? null : c.buyer_user_id ?? null;

    return {
      ...c,
      role,
      counterpart_user_id: counterpartUserId,
    };
  });

  if (params?.role === "buyer" || params?.role === "vendor") {
    conversations = conversations.filter((c) => c.role === params.role);
  }

  if (conversations.length === 0) {
    return {
      rows: [] as CombinedInboxRow[],
      error: null as string | null,
    };
  }

  const rfqIds = Array.from(new Set(conversations.map((c) => String(c.rfq_id)).filter(Boolean)));
  const counterpartIds = Array.from(
    new Set(conversations.map((c) => String(c.counterpart_user_id ?? "")).filter(Boolean))
  );
  const conversationIds = conversations.map((c) => c.id);

  const [rfqRes, profileRes, readRes, msgRes] = await Promise.all([
    supabase.from("rfqs").select("id,public_id,status").in("id", rfqIds),
    counterpartIds.length > 0
      ? supabase.from("profiles").select("id,full_name,phone").in("id", counterpartIds)
      : Promise.resolve({ data: [], error: null } as any),
    supabase
      .from("rfq_conversation_reads")
      .select("conversation_id,user_id,last_seen_at")
      .eq("user_id", userId)
      .in("conversation_id", conversationIds),
    supabase
      .from("rfq_messages")
      .select("id,conversation_id,sender_user_id,sender_role,body,message_type,created_at")
      .in("conversation_id", conversationIds),
  ]);

  if (rfqRes.error) {
    return {
      rows: [] as CombinedInboxRow[],
      error: rfqRes.error.message,
    };
  }

  if (profileRes?.error) {
    return {
      rows: [] as CombinedInboxRow[],
      error: profileRes.error.message,
    };
  }

  if (readRes.error) {
    return {
      rows: [] as CombinedInboxRow[],
      error: readRes.error.message,
    };
  }

  if (msgRes.error) {
    return {
      rows: [] as CombinedInboxRow[],
      error: msgRes.error.message,
    };
  }

  const rfqs = (rfqRes.data ?? []) as RfqRow[];
  const profiles = (profileRes.data ?? []) as ProfileRow[];
  const reads = (readRes.data ?? []) as ReadRow[];
  const messages = (msgRes.data ?? []) as MessageRow[];

  const rfqById: Record<string, RfqRow> = {};
  for (const r of rfqs) rfqById[String(r.id)] = r;

  const profileById: Record<string, ProfileRow> = {};
  for (const p of profiles) profileById[String(p.id)] = p;

  const readByConversationId: Record<string, ReadRow> = {};
  for (const r of reads) readByConversationId[String(r.conversation_id)] = r;

  const messagesByConversationId: Record<string, MessageRow[]> = {};
  for (const m of messages) {
    const key = String(m.conversation_id ?? "");
    if (!key) continue;
    if (!messagesByConversationId[key]) messagesByConversationId[key] = [];
    messagesByConversationId[key].push(m);
  }

  const rows: CombinedInboxRow[] = conversations.map((c) => {
    const rfq = rfqById[String(c.rfq_id)];
    const counterpart = c.counterpart_user_id
      ? profileById[String(c.counterpart_user_id)]
      : undefined;
    const read = readByConversationId[String(c.id)];
    const lastSeenAt = read?.last_seen_at ?? null;
    const lastSeenMs = lastSeenAt ? new Date(lastSeenAt).getTime() : 0;

    const msgs = (messagesByConversationId[String(c.id)] ?? []).sort((a, b) => {
      const at = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
      return at - bt;
    });

    const lastMessage = msgs.length > 0 ? msgs[msgs.length - 1] : null;

    let unreadCount = 0;
    for (const m of msgs) {
      const createdMs = m.created_at ? new Date(m.created_at).getTime() : 0;
      const senderIsSelf = String(m.sender_user_id ?? "") === String(userId);
      const isSystemMessage =
        String(m.sender_role ?? "").trim().toLowerCase() === "system" ||
        String(m.message_type ?? "").trim().toLowerCase() === "system";

      if (!senderIsSelf && !isSystemMessage && createdMs > lastSeenMs) {
        unreadCount += 1;
      }
    }

    return {
      conversation_id: c.id,
      rfq_id: c.rfq_id,
      rfq_no: rfq?.public_id ?? null,

      role: c.role,
      counterpart_user_id: c.counterpart_user_id ?? null,
      counterpart_name: counterpart?.full_name ?? null,
      counterpart_phone: counterpart?.phone ?? null,

      rfq_status: rfq?.status ?? null,
      conversation_status: c.status ?? null,

      last_message_id: lastMessage?.id ?? null,
      last_message_body: lastMessage?.body ?? null,
      last_message_type: lastMessage?.message_type ?? null,
      last_message_at: lastMessage?.created_at ?? null,
      last_message_sender_user_id: lastMessage?.sender_user_id ?? null,
      last_message_sender_role: lastMessage?.sender_role ?? null,

      unread_count: unreadCount,
      last_seen_at: lastSeenAt,

      created_at: c.created_at ?? null,
      updated_at: c.updated_at ?? null,

      open_href: buildOpenHref(c.role, c.rfq_id),
    };
  });

  let filtered = rows;

  const needle = String(params?.q ?? "").trim().toLowerCase();
  if (needle) {
    filtered = filtered.filter((r) => {
      const hay = [
        r.rfq_no ?? "",
        r.rfq_id ?? "",
        r.role ?? "",
        r.counterpart_name ?? "",
        r.rfq_status ?? "",
        r.last_message_body ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(needle);
    });
  }

  filtered.sort((a, b) => {
    const at = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
    const bt = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;

    if ((b.unread_count ?? 0) !== (a.unread_count ?? 0)) {
      return (b.unread_count ?? 0) - (a.unread_count ?? 0);
    }

    return bt - at;
  });

  return {
    rows: filtered,
    error: null as string | null,
  };
}