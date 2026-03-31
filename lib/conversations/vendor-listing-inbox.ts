import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

type ListingConversationRow = {
  id: string;
  title: string | null;
  buyer_user_id: string | null;
  vendor_user_id: string | null;
  context_type: string | null;
  context_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  name: string | null;
};

type ParticipantRow = {
  conversation_id: string;
  user_id: string;
  role: string | null;
  last_read_at: string | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_user_id: string | null;
  sender_role: string | null;
  message_type: string | null;
  body: string | null;
  created_at: string | null;
};

function buildPreview(
  body: string | null | undefined,
  messageType: string | null | undefined,
  senderIsVendor: boolean,
  senderRole?: string | null
) {
  const raw = String(body ?? "").replace(/\s+/g, " ").trim();
  const role = String(senderRole ?? "").trim().toLowerCase();
  const who = role === "system" ? "System" : senderIsVendor ? "You" : "Buyer";

  if (raw) {
    return `${who}: ${raw.length > 90 ? `${raw.slice(0, 90)}…` : raw}`;
  }

  const mt = String(messageType ?? "").trim().toLowerCase();
  if (mt && mt !== "text") return `${who}: [${mt}]`;

  return `${who}: Message`;
}

export async function fetchVendorListingConversations() {
  try {
    const cookieStore = await cookies();
    const supabase = getSupabaseServerClient(cookieStore);

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) return [];

    const { data, error } = await supabase
      .from("conversations")
      .select(
        [
          "id",
          "title",
          "buyer_user_id",
          "vendor_user_id",
          "context_type",
          "context_id",
          "created_at",
          "updated_at",
          "is_closed",
        ].join(",")
      )
      .eq("vendor_user_id", user.id)
      .in("context_type", ["listing", "property_inquiry", "service_inquiry", "rental_inquiry"])
      .order("updated_at", { ascending: false })
      .limit(50);

    if (error || !data?.length) return [];

    const rows = ((data ?? []) as unknown) as ListingConversationRow[];

    const buyerIds = Array.from(
      new Set(rows.map((r) => String(r.buyer_user_id ?? "").trim()).filter(Boolean))
    );

    let profileMap = new Map<string, string>();

    if (buyerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,full_name,name")
        .in("id", buyerIds);

      profileMap = new Map(
        ((((profiles ?? []) as unknown) as ProfileRow[])).map((p) => [
          String(p.id),
          String(p.full_name ?? p.name ?? "Buyer"),
        ])
      );
    }

    const conversationIds = rows.map((r) => r.id);

    let participants: ParticipantRow[] = [];
    let messages: MessageRow[] = [];

    if (conversationIds.length > 0) {
      const [{ data: partData }, { data: msgData }] = await Promise.all([
        supabase
          .from("conversation_participants")
          .select("conversation_id,user_id,role,last_read_at")
          .eq("user_id", user.id)
          .in("conversation_id", conversationIds),
        supabase
          .from("conversation_messages")
          .select("id,conversation_id,sender_user_id,sender_role,message_type,body,created_at")
          .in("conversation_id", conversationIds)
          .order("created_at", { ascending: true }),
      ]);

      participants = (((partData ?? []) as unknown) as ParticipantRow[]);
      messages = (((msgData ?? []) as unknown) as MessageRow[]);
    }

    const vendorLastReadByConversation = new Map<string, number>();
    for (const p of participants) {
      vendorLastReadByConversation.set(
        String(p.conversation_id),
        p.last_read_at ? new Date(p.last_read_at).getTime() : 0
      );
    }

    const unreadCountByConversation = new Map<string, number>();
    const latestMessageByConversation = new Map<string, MessageRow>();

    for (const m of messages) {
      const convId = String(m.conversation_id ?? "");
      if (!convId) continue;

      latestMessageByConversation.set(convId, m);

      const isVendorMessage = String(m.sender_user_id ?? "") === String(user.id);
      const isSystemMessage =
        String(m.sender_role ?? "").trim().toLowerCase() === "system" ||
        String(m.message_type ?? "").trim().toLowerCase() === "system";
      const createdAtMs = m.created_at ? new Date(m.created_at).getTime() : 0;
      const lastReadMs = vendorLastReadByConversation.get(convId) ?? 0;

      if (!isVendorMessage && !isSystemMessage && createdAtMs > lastReadMs) {
        unreadCountByConversation.set(convId, (unreadCountByConversation.get(convId) ?? 0) + 1);
      }
    }

    return rows
      .filter((r) => String(r.id ?? "").trim())
      .map((r) => {
      const latest = latestMessageByConversation.get(String(r.id));
      const latestSenderIsVendor = String(latest?.sender_user_id ?? "") === String(user.id);

      return {
        id: r.id,
        title: r.title,
        buyer_user_id: r.buyer_user_id,
        buyer_name: r.buyer_user_id
          ? String(profileMap.get(String(r.buyer_user_id)) ?? "").trim() || "Buyer"
          : "Buyer",
        vendor_user_id: r.vendor_user_id,
        context_type: r.context_type,
        context_id: r.context_id,
        created_at: r.created_at,
        updated_at: r.updated_at,
        unread_count: unreadCountByConversation.get(String(r.id)) ?? 0,
        last_message_preview: latest
          ? buildPreview(latest.body, latest.message_type, latestSenderIsVendor, latest.sender_role)
          : null,
        last_message_at: latest?.created_at ?? null,
      };
    });
  } catch {
    return [];
  }
}