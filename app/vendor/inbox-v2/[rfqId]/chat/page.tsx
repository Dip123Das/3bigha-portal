// app/vendor/inbox-v2/[rfqId]/chat/page.tsx
import Link from "next/link";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import VendorRfqChatBox from "@/app/vendor/inbox-v2/[rfqId]/chat/vendor-rfq-chat-box";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

export default async function VendorRfqChatPage({
  params,
}: {
  params: { rfqId: string };
}) {
  const rfqId = decodeURIComponent(params.rfqId || "");
  const supabase = getSupabaseServerClient(cookies());

  if (!UUID_RE.test(rfqId)) {
    return <div style={{ padding: 12 }}>Invalid RFQ ID</div>;
  }

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return <div style={{ padding: 12 }}>Please login.</div>;
  }

  const { data: conv, error: convErr } = await supabase
    .from("conversations")
    .select("id,rfq_id,context_id,buyer_user_id,vendor_user_id,is_closed,created_at,updated_at")
    .eq("context_type", "rfq")
    .eq("rfq_id", rfqId)
    .eq("vendor_user_id", user.id)
    .maybeSingle();

  if (convErr) {
    return <div style={{ padding: 12, color: "crimson" }}>{convErr.message}</div>;
  }

  if (!conv) {
    return (
      <div style={{ padding: 12 }}>
        <h1 style={{ fontSize: 18, fontWeight: 800 }}>RFQ Chat</h1>
        <div style={{ marginTop: 10, opacity: 0.75 }}>
          Conversation not found for this RFQ.
        </div>
        <div style={{ marginTop: 12 }}>
          <Link href={`/vendor/inbox-v2/${encodeURIComponent(rfqId)}`} style={{ fontWeight: 800 }}>
            ← Back to RFQ
          </Link>
        </div>
      </div>
    );
  }

  await supabase
    .from("conversation_participants")
    .update({
      last_read_at: new Date().toISOString(),
    })
    .eq("conversation_id", conv.id)
    .eq("user_id", user.id);

  const { data: msgs, error: msgsErr } = await supabase
    .from("conversation_messages")
    .select("id,sender_user_id,sender_role,message_type,body,meta,created_at")
    .eq("conversation_id", conv.id)
    .order("created_at", { ascending: true });

  if (msgsErr) {
    return <div style={{ padding: 12, color: "crimson" }}>{msgsErr.message}</div>;
  }

  const { data: buyerProfile } = await supabase
    .from("profiles")
    .select("id,phone,full_name,name")
    .eq("id", conv.buyer_user_id)
    .maybeSingle();

  const buyerName =
    (buyerProfile as any)?.full_name ??
    (buyerProfile as any)?.name ??
    "Buyer";

  const buyerPhone = (buyerProfile as any)?.phone ?? null;
  const cleanPhone = digitsOnly(buyerPhone);

  const whatsappHref = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        `Please check 3Bigha RFQ chat for RFQ ${rfqId.slice(0, 8)}.`
      )}`
    : null;

  const smsHref = cleanPhone
    ? `sms:${cleanPhone}?body=${encodeURIComponent(
        `Please check 3Bigha RFQ chat for RFQ ${rfqId.slice(0, 8)}.`
      )}`
    : null;

  return (
    <div style={{ padding: 12, maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>RFQ Chat</h1>
          <div style={{ marginTop: 6, opacity: 0.75 }}>
            Buyer ↔ Vendor conversation for RFQ #{rfqId.slice(0, 8)}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href={`/vendor/inbox-v2/${encodeURIComponent(rfqId)}`} style={{ fontWeight: 800 }}>
            ← Back to RFQ
          </Link>
          {buyerPhone ? (
            <a href={`tel:${buyerPhone}`} style={{ fontWeight: 800, textDecoration: "none" }}>
              Call
            </a>
          ) : null}
          {whatsappHref ? (
            <a href={whatsappHref} target="_blank" style={{ fontWeight: 800, textDecoration: "none" }}>
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
        <div style={{ marginTop: 6 }}><strong>Role:</strong> Buyer</div>
        <div style={{ marginTop: 6 }}><strong>Conversation Updated:</strong> {fmtDateTime(conv.updated_at)}</div>
      </div>

      <div style={{ marginTop: 16 }}>
        <VendorRfqChatBox
          rfqId={rfqId}
          conversationId={conv.id}
          currentUserId={user.id}
          buyerName={buyerName}
          buyerPhone={buyerPhone}
          initialMessages={(msgs ?? []) as any}
        />
      </div>
    </div>
  );
}