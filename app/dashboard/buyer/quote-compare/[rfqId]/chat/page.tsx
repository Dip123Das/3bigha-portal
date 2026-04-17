// app/dashboard/buyer/quote-compare/[rfqId]/chat/page.tsx
import Link from "next/link";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import BuyerRfqChatBox from "@/app/dashboard/buyer/quote-compare/[rfqId]/chat/buyer-rfq-chat-box";

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

export default async function BuyerRfqChatPage({
  params,
  searchParams,
}: {
  params: { rfqId: string };
  searchParams?: { vendorId?: string };
}) {
  const rfqId = decodeURIComponent(params.rfqId || "");
  const vendorId = decodeURIComponent(searchParams?.vendorId || "");
  const supabase = getSupabaseServerClient(cookies());

  if (!UUID_RE.test(rfqId)) {
    return <div style={{ padding: 16 }}>Invalid RFQ ID</div>;
  }

  if (vendorId && !UUID_RE.test(vendorId)) {
    return <div style={{ padding: 16 }}>Invalid vendor ID</div>;
  }

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return <div style={{ padding: 16 }}>Please login.</div>;
  }

  let conv: any = null;
  let convErr: any = null;

  if (vendorId) {
    const res = await supabase
      .from("conversations")
      .select("id,rfq_id,context_id,buyer_user_id,vendor_user_id,status,is_closed,created_at,updated_at")
      .eq("context_type", "rfq")
      .eq("rfq_id", rfqId)
      .eq("buyer_user_id", user.id)
      .eq("vendor_user_id", vendorId)
      .maybeSingle();

    conv = res.data ?? null;
    convErr = res.error ?? null;
  }

  if (!conv && !convErr) {
    const fallback = await supabase
      .from("conversations")
      .select("id,rfq_id,context_id,buyer_user_id,vendor_user_id,status,is_closed,created_at,updated_at")
      .eq("context_type", "rfq")
      .eq("rfq_id", rfqId)
      .eq("buyer_user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    conv = fallback.data ?? null;
    convErr = fallback.error ?? null;
  }

  if (convErr) {
    return <div style={{ padding: 16, color: "crimson" }}>{convErr.message}</div>;
  }

  if (!conv) {
    return (
      <div style={{ padding: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>RFQ Chat</h1>
        <div style={{ marginTop: 10, opacity: 0.75 }}>
          Conversation not found for this RFQ.
        </div>
        <div style={{ marginTop: 12 }}>
          <Link
            href={`/dashboard/buyer/quote-compare/${encodeURIComponent(rfqId)}`}
            style={{ fontWeight: 800 }}
          >
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
    return <div style={{ padding: 16, color: "crimson" }}>{msgsErr.message}</div>;
  }

  const { data: vendorBiz } = await supabase
    .from("business_profiles")
    .select("user_id,business_name,city,locality")
    .eq("user_id", conv.vendor_user_id)
    .maybeSingle();

  const { data: vendorProfile } = await supabase
    .from("profiles")
    .select("id,phone,full_name,name")
    .eq("id", conv.vendor_user_id)
    .maybeSingle();

  const vendorName =
    (vendorBiz as any)?.business_name ??
    (vendorProfile as any)?.full_name ??
    (vendorProfile as any)?.name ??
    "Vendor";

  const vendorPhone = (vendorProfile as any)?.phone ?? null;
  const cleanPhone = digitsOnly(vendorPhone);

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

  const backHref = vendorId
    ? `/dashboard/buyer/quote-compare/${encodeURIComponent(rfqId)}?vendorId=${encodeURIComponent(vendorId)}`
    : `/dashboard/buyer/quote-compare/${encodeURIComponent(rfqId)}`;

  return (
    <div style={{ padding: 16, maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>RFQ Chat</h1>
          <div style={{ marginTop: 6, opacity: 0.75 }}>
            Buyer ↔ Vendor conversation for RFQ #{rfqId.slice(0, 8)}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href={backHref} style={{ fontWeight: 800 }}>
            ← Back to RFQ
          </Link>
          {vendorPhone ? (
            <a href={`tel:${vendorPhone}`} style={{ fontWeight: 800, textDecoration: "none" }}>
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
        <div><strong>Vendor:</strong> {vendorName}</div>
        <div style={{ marginTop: 6 }}><strong>Role:</strong> Vendor</div>
        <div style={{ marginTop: 6 }}><strong>Conversation Updated:</strong> {fmtDateTime(conv.updated_at)}</div>
      </div>

      <div style={{ marginTop: 16 }}>
        <BuyerRfqChatBox
          rfqId={rfqId}
          conversationId={conv.id}
          currentUserId={user.id}
          vendorName={vendorName}
          vendorPhone={vendorPhone}
          initialMessages={(msgs ?? []) as any}
        />
      </div>
    </div>
  );
}