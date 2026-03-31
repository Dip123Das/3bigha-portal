import Link from "next/link";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import VendorConversationChatBox from "./vendor-conversation-chat-box";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isBadConversationId(v?: string | null) {
  const s = String(v ?? "").trim();
  return !s || s === "id" || s === "[id]" || s === "[conversationId]" || s === "<id>" || !UUID_RE.test(s);
}

type ConversationRow = {
  id: string;
  context_type: string | null;
  context_id: string | null;
  buyer_user_id: string | null;
  vendor_user_id: string | null;
  rfq_id: string | null;
  listing_id: string | null;
  property_id: string | null;
  service_id: string | null;
  rental_id: string | null;
  title: string | null;
  context_snapshot: Record<string, any> | null;
  created_at: string | null;
  updated_at: string | null;
  is_closed: boolean | null;
};

type MsgRow = {
  id: string;
  sender_user_id: string;
  sender_role: string;
  message_type: string;
  body: string;
  meta?: Record<string, any> | null;
  created_at: string | null;
};

type ProfileRow = {
  id: string;
  phone: string | null;
  full_name: string | null;
  name: string | null;
};

type ParticipantRow = {
  conversation_id: string;
  user_id: string;
  role: string | null;
  last_read_at: string | null;
  last_seen_message_id?: string | null;
};

function fmtDateTime(v?: string | null) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return v;
  }
}

function digitsOnly(v?: string | null) {
  return String(v ?? "").replace(/[^\d]/g, "");
}

function titleCase(v?: string | null) {
  const s = String(v ?? "").replace(/_/g, " ").trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "—";
}

function buildBackHref(contextType?: string | null, contextId?: string | null) {
  const ct = String(contextType ?? "").trim().toLowerCase();
  const id = String(contextId ?? "").trim();

  if (!id) return "/vendor/inbox-v2";

  if (ct === "property_inquiry") return `/property/${encodeURIComponent(id)}`;
  if (ct === "service_inquiry") return `/services/${encodeURIComponent(id)}`;
  if (ct === "rental_inquiry") return `/rentals/${encodeURIComponent(id)}`;
  if (ct === "listing") return `/materials/${encodeURIComponent(id)}`;
  if (ct === "rfq") return `/vendor/inbox-v2/${encodeURIComponent(id)}`;

  return "/vendor/inbox-v2";
}

export default async function VendorConversationPage({
  params,
}: {
  params: { conversationId: string };
}) {
  const conversationId = decodeURIComponent(params.conversationId || "");
  const supabase = getSupabaseServerClient(await cookies());

  if (isBadConversationId(conversationId)) {
    return (
      <div style={{ padding: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Conversation</h1>
        <div style={{ marginTop: 10, opacity: 0.75 }}>Invalid conversation ID.</div>
        <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/vendor/inbox-v2" style={{ fontWeight: 800 }}>
            ← Back to Vendor Inbox
          </Link>
          <Link href="/dashboard/inbox-v2" style={{ fontWeight: 800 }}>
            Open Unified Inbox →
          </Link>
        </div>
      </div>
    );
  }

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return <div style={{ padding: 16 }}>Please login.</div>;
  }

  const convRes = await supabase
    .from("conversations")
    .select(
      [
        "id",
        "context_type",
        "context_id",
        "buyer_user_id",
        "vendor_user_id",
        "rfq_id",
        "listing_id",
        "property_id",
        "service_id",
        "rental_id",
        "title",
        "context_snapshot",
        "created_at",
        "updated_at",
        "is_closed",
      ].join(",")
    )
    .eq("id", conversationId)
    .eq("vendor_user_id", user.id)
    .maybeSingle();

  const convErr = convRes.error;
  const conv = (convRes.data ?? null) as ConversationRow | null;

  if (convErr) {
    return <div style={{ padding: 16, color: "crimson" }}>{convErr.message}</div>;
  }

  if (!conv) {
    return (
      <div style={{ padding: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>Conversation</h1>
        <div style={{ marginTop: 10, opacity: 0.75 }}>Conversation not found.</div>
        <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/vendor/inbox-v2" style={{ fontWeight: 800 }}>
            ← Back to Vendor Inbox
          </Link>
          <Link href="/dashboard/inbox-v2" style={{ fontWeight: 800 }}>
            Open Unified Inbox →
          </Link>
        </div>
      </div>
    );
  }

  const participantRes = await supabase
    .from("conversation_participants")
    .select("conversation_id,user_id,role,last_read_at,last_seen_message_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();

  const participantErr = participantRes.error;
  const participant = (participantRes.data ?? null) as ParticipantRow | null;
  const initialUnreadCutoffAt = participant?.last_read_at ?? null;

  if (participantErr) {
    return <div style={{ padding: 16, color: "crimson" }}>{participantErr.message}</div>;
  }

  const msgsRes = await supabase
    .from("conversation_messages")
    .select("id,sender_user_id,sender_role,message_type,body,meta,created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  const msgsErr = msgsRes.error;
  const msgs = (msgsRes.data ?? []) as MsgRow[];

  if (msgsErr) {
    return <div style={{ padding: 16, color: "crimson" }}>{msgsErr.message}</div>;
  }

  const latestMessageId =
    msgs.length > 0 ? String(msgs[msgs.length - 1]?.id ?? "").trim() || null : null;

  const buyerId = String(conv.buyer_user_id ?? "");

  const profileRes = await supabase
    .from("profiles")
    .select("id,phone,full_name,name")
    .eq("id", buyerId)
    .maybeSingle();

  const profile = (profileRes.data ?? null) as ProfileRow | null;

  const buyerName = profile?.full_name ?? profile?.name ?? "Buyer";
  const buyerPhone = profile?.phone ?? null;
  const cleanPhone = digitsOnly(buyerPhone);

  const whatsappHref = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        `Please check our 3Bigha conversation: ${String(conv.title ?? conv.context_type ?? "Chat")}.`
      )}`
    : null;

  const smsHref = cleanPhone
    ? `sms:${cleanPhone}?body=${encodeURIComponent(
        `Please check our 3Bigha conversation: ${String(conv.title ?? conv.context_type ?? "Chat")}.`
      )}`
    : null;

  const backHref = buildBackHref(conv.context_type, conv.context_id);
  const contextMeta = (conv.context_snapshot ?? {}) as Record<string, any>;
  const isClosed = !!conv.is_closed;

  return (
    <div style={{ padding: 16, maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Conversation</h1>
          <div style={{ marginTop: 6, opacity: 0.75 }}>
            {titleCase(conv.context_type)} • {String(conv.title ?? "Chat")}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href={backHref} style={{ fontWeight: 800 }}>
            ← Back
          </Link>
          <Link href="/vendor/inbox-v2" style={{ fontWeight: 800 }}>
            Vendor Inbox
          </Link>
          <Link href="/dashboard/inbox-v2" style={{ fontWeight: 800 }}>
            Unified Inbox
          </Link>
          {buyerPhone ? (
            <a href={`tel:${buyerPhone}`} style={{ fontWeight: 800, textDecoration: "none" }}>
              Call
            </a>
          ) : null}
          {whatsappHref ? (
            <a href={whatsappHref} target="_blank" rel="noreferrer" style={{ fontWeight: 800, textDecoration: "none" }}>
              WhatsApp
            </a>
          ) : null}
          {smsHref ? (
            <a href={smsHref} style={{ fontWeight: 800, textDecoration: "none" }}>
              SMS
            </a>
          ) : null}
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 14,
          background: "#fff",
        }}
      >
        <div><strong>Buyer:</strong> {buyerName}</div>
        <div style={{ marginTop: 6 }}><strong>Context:</strong> {titleCase(conv.context_type)}</div>
        <div style={{ marginTop: 6 }}><strong>Title:</strong> {String(conv.title ?? "—")}</div>
        <div style={{ marginTop: 6 }}><strong>Status:</strong> {isClosed ? "Closed" : "Open"}</div>
        <div style={{ marginTop: 6 }}><strong>Updated:</strong> {fmtDateTime(conv.updated_at)}</div>

        {Object.keys(contextMeta).length > 0 ? (
          <div style={{ marginTop: 10, fontSize: 13, color: "#4b5563" }}>
            <strong>Context Meta:</strong>{" "}
            {Object.entries(contextMeta)
              .filter(([, v]) => v != null && String(v).trim() !== "")
              .slice(0, 4)
              .map(([k, v]) => `${titleCase(k)}: ${String(v)}`)
              .join(" • ")}
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 16, opacity: isClosed ? 0.72 : 1 }}>
        <VendorConversationChatBox
          conversationId={conversationId}
          currentUserId={user.id}
          counterpartName={buyerName}
          counterpartPhone={buyerPhone}
          contextType={String(conv.context_type ?? "")}
          contextTitle={String(conv.title ?? "")}
          initialMessages={msgs}
          initialUnreadCutoffAt={initialUnreadCutoffAt}
        />
      </div>
    </div>
  );
}