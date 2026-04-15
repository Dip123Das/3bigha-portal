import Link from "next/link";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import QuoteForm from "./quote-form";
import QuoteHistory from "./quote-history";
import DeliveryUpdateForm from "./delivery-update-form";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RfqItemRow = {
  id: string;
  rfq_id: string;
  line_no: number | null;
  item_type: string | null;
  title: string | null;
  description: string | null;
  qty: number | null;
  uom: string | null;
  spec: any;
  created_at: string | null;
};

function pill(text: string, tone: "neutral" | "ok" | "warn" = "neutral") {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "3px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
    color: "#111827",
    whiteSpace: "nowrap",
  };

  if (tone === "ok") {
    base.border = "1px solid #bbf7d0";
    base.background = "#ecfdf5";
    base.color = "#065f46";
  }
  if (tone === "warn") {
    base.border = "1px solid #fde68a";
    base.background = "#fffbeb";
    base.color = "#92400e";
  }

  return <span style={base}>{text}</span>;
}

function fmtDateTime(v?: string | null) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return v;
  }
}

function actionBtnStyle(kind: "talk" | "normal" | "call" = "normal"): React.CSSProperties {
  if (kind === "talk") {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      minHeight: 40,
      padding: "0 14px",
      borderRadius: 999,
      border: "1px solid #86efac",
      background: "linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%)",
      color: "#166534",
      fontWeight: 900,
      textDecoration: "none",
      boxShadow: "0 4px 14px rgba(22,101,52,0.10)",
    };
  }

  if (kind === "call") {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      minHeight: 40,
      padding: "0 14px",
      borderRadius: 999,
      border: "1px solid #bbf7d0",
      background: "#ecfdf5",
      color: "#065f46",
      fontWeight: 900,
      textDecoration: "none",
    };
  }

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 40,
    padding: "0 14px",
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "#fff",
    color: "#111827",
    fontWeight: 900,
    textDecoration: "none",
  };
}

export default async function VendorRfqDetailV2Page({
  params,
}: {
  params: { rfqId: string };
}) {
  const supabase = getSupabaseServerClient(cookies());
  const rfqId = decodeURIComponent(params.rfqId);

  if (!UUID_RE.test(rfqId)) {
    return (
      <div style={{ padding: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Invalid RFQ ID</h1>
      </div>
    );
  }

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return (
      <div style={{ padding: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Please login</h1>
      </div>
    );
  }

  try {
    const { error: markErr } = await supabase.rpc("mark_rfq_viewed", {
      p_rfq_id: rfqId,
    });

    if (markErr) console.error("mark_rfq_viewed failed:", markErr.message);
  } catch (e: any) {
    console.error("mark viewed exception:", e?.message || e);
  }

  const headerRes = await supabase
    .from("vendor_rfq_detail")
    .select("*")
    .eq("rfq_id", rfqId)
    .order("created_at", { ascending: false });

  const headerErr = headerRes.error;
  const headerRows = (headerRes.data ?? []) as any[];
  const header = headerRows.length > 0 ? headerRows[0] : null;

  if (headerErr) {
    return (
      <div style={{ padding: 16 }}>
        <pre style={{ color: "crimson" }}>{headerErr.message}</pre>
      </div>
    );
  }

  if (!header) {
    return (
      <div style={{ padding: 16 }}>
        <h2>RFQ not found</h2>
      </div>
    );
  }

  const rfqNo = (header as any).rfq_no ?? rfqId.slice(0, 8);
  const rfqStatus = String((header as any).rfq_status ?? "").toLowerCase();
  const targetStatus = String((header as any).target_status ?? "").toLowerCase();

  const isAccepted = targetStatus === "accepted" || targetStatus === "won";
  const isLost = rfqStatus === "closed" && !isAccepted;

  const { data: items, error: itemsErr } = await supabase
    .from("rfq_items")
    .select("id,rfq_id,line_no,item_type,title,description,qty,uom,spec,created_at")
    .eq("rfq_id", rfqId)
    .order("line_no", { ascending: true });

  if (itemsErr) {
    return (
      <div style={{ padding: 16 }}>
        <pre style={{ color: "crimson" }}>{itemsErr.message}</pre>
      </div>
    );
  }

  const rows = (items ?? []) as RfqItemRow[];

  const itemsForForm = rows.map((x, idx) => ({
    rfq_item_id: String(x.id),
    label: x.title ?? `Item ${idx + 1}`,
    quantity: x.qty ?? null,
    unit: x.uom ?? null,
  }));

  const itemTitleById: Record<string, string> = Object.fromEntries(
    rows.map((r) => [r.id, r.title ?? "—"])
  );

  const { data: quoteHistory, error: qhErr } = await supabase
    .from("rfq_quotes")
    .select(
      "id,version,status,delivery_days,valid_till,notes,subtotal,gst_mode,gst_rate,gst_amount,grand_total,created_at,updated_at"
    )
    .eq("rfq_id", rfqId)
    .eq("vendor_id", user.id)
    .order("version", { ascending: false });

  if (qhErr) {
    return (
      <div style={{ padding: 16 }}>
        <pre style={{ color: "crimson" }}>{qhErr.message}</pre>
      </div>
    );
  }

  const history = (quoteHistory ?? []) as any[];
  const latestQuote = history.length > 0 ? history[0] : null;
  const hasSubmittedQuote = history.length > 0;

  let conversationId: string | null = null;
  let buyerPhone: string | null = null;
  let buyerName: string | null = (header as any).buyer_name ?? null;

  if (hasSubmittedQuote) {
    const { data: conv } = await supabase
      .from("rfq_conversations")
      .select("id,buyer_user_id,vendor_user_id")
      .eq("rfq_id", rfqId)
      .eq("vendor_user_id", user.id)
      .maybeSingle();

    conversationId = conv?.id ?? null;

    if (conv?.buyer_user_id) {
      const { data: buyerProfile } = await supabase
        .from("profiles")
        .select("id,phone,full_name,name")
        .eq("id", conv.buyer_user_id)
        .maybeSingle();

      buyerPhone = (buyerProfile as any)?.phone ?? null;
      buyerName =
        (buyerProfile as any)?.full_name ??
        (buyerProfile as any)?.name ??
        buyerName;
    }
  }

  const { data: latestDelivery } = await supabase
    .from("rfq_delivery_updates")
    .select("id,status,message,expected_dispatch_date,expected_delivery_date,created_at")
    .eq("rfq_id", rfqId)
    .eq("vendor_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div style={{ padding: 16, maxWidth: 1000 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>RFQ #{rfqNo}</h1>

      {isAccepted ? (
        <div
          style={{
            marginTop: 12,
            border: "1px solid #bbf7d0",
            background: "#ecfdf5",
            padding: 12,
            borderRadius: 12,
            color: "#065f46",
            fontWeight: 900,
          }}
        >
          🎉 Congratulations! Your quote has been <strong>ACCEPTED</strong> by the buyer.
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.9, fontWeight: 800 }}>
            RFQ is now locked. You can view history, totals, and next actions below.
          </div>
        </div>
      ) : null}

      {isLost ? (
        <div
          style={{
            marginTop: 12,
            border: "1px solid #fde68a",
            background: "#fffbeb",
            padding: 12,
            borderRadius: 12,
            color: "#92400e",
            fontWeight: 900,
          }}
        >
          This RFQ has been <strong>closed</strong> and your quote was <strong>not selected</strong>.
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.9, fontWeight: 800 }}>
            You can still review the RFQ details and your quote history below.
          </div>
        </div>
      ) : null}

      <div
        style={{
          marginTop: 16,
          padding: 16,
          border: "1px solid #e5e7eb",
          borderRadius: 12,
        }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {pill(`Status: ${rfqStatus || "—"}`, rfqStatus === "open" ? "ok" : "neutral")}
          {targetStatus
            ? pill(`Target: ${targetStatus}`, isAccepted ? "ok" : isLost ? "warn" : "neutral")
            : null}
          {isAccepted ? pill("Won", "ok") : null}
          {isLost ? pill("Not Selected", "warn") : null}
        </div>

        <div style={{ marginTop: 10 }}>
          <div>
            <strong>Buyer:</strong> {buyerName ?? "—"}
          </div>
          <div>
            <strong>Location:</strong>{" "}
            {((header as any).locality_name ?? "—") +
              ((header as any).pincode ? `, ${(header as any).pincode}` : "")}
          </div>
          <div>
            <strong>Created:</strong> {(header as any).created_at ?? "—"}
          </div>
        </div>
      </div>

      {hasSubmittedQuote ? (
        <div
          style={{
            marginTop: 16,
            padding: 14,
            border: "1px solid rgba(0,0,0,0.10)",
            borderRadius: 12,
            background: "#fff",
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 8 }}>
            {isAccepted ? "Next Actions" : "Talk / Quote Actions"}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link
              href={`/vendor/inbox-v2/${encodeURIComponent(rfqId)}/chat`}
              style={actionBtnStyle("talk")}
            >
              💬 {isAccepted ? "Talk to Buyer" : "Contact Buyer"}
            </Link>

            {isAccepted ? (
              <Link
                href={`/vendor/inbox-v2/${encodeURIComponent(rfqId)}/print`}
                target="_blank"
                style={actionBtnStyle("normal")}
              >
                🧾 Download / Print Quote
              </Link>
            ) : null}

            {isAccepted ? (
              <a
                href="#delivery-update-panel"
                style={actionBtnStyle("normal")}
              >
                🚚 Update Delivery Schedule
              </a>
            ) : null}

            {buyerPhone ? (
              <a href={`tel:${buyerPhone}`} style={actionBtnStyle("call")}>
                📞 Call Buyer
              </a>
            ) : null}
          </div>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
            {isAccepted
              ? "Tip: Once accepted, the buyer typically expects quick confirmation + delivery timeline."
              : "Tip: You can now talk with the buyer before acceptance to discuss rate, delivery time, rental terms, or clarification."}
          </div>

          {isAccepted && latestDelivery ? (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                background: "#f9fafb",
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Latest Delivery Update</div>
              <div style={{ fontSize: 13 }}>
                <strong>Status:</strong> {latestDelivery.status ?? "—"}
              </div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                <strong>Dispatch:</strong> {latestDelivery.expected_dispatch_date ?? "—"}
              </div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                <strong>Delivery:</strong> {latestDelivery.expected_delivery_date ?? "—"}
              </div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                <strong>Updated:</strong> {fmtDateTime(latestDelivery.created_at)}
              </div>
              {latestDelivery.message ? (
                <div style={{ fontSize: 13, marginTop: 6 }}>
                  <strong>Note:</strong> {latestDelivery.message}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {isAccepted ? (
        <div id="delivery-update-panel" style={{ marginTop: 18 }}>
          <DeliveryUpdateForm rfqId={rfqId} latestQuoteId={latestQuote?.id ?? null} />
        </div>
      ) : null}

      <div style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>RFQ Items</h2>

        {rows.length > 0 ? (
          <table style={{ width: "100%", marginTop: 12, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: 8, textAlign: "left" }}>Item</th>
                <th style={{ padding: 8, textAlign: "left" }}>Description</th>
                <th style={{ padding: 8 }}>Qty</th>
                <th style={{ padding: 8 }}>UOM</th>
                <th style={{ padding: 8, textAlign: "left" }}>Spec</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((it) => (
                <tr key={it.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: 8 }}>{it.title ?? "—"}</td>
                  <td style={{ padding: 8 }}>{it.description ?? "—"}</td>
                  <td style={{ padding: 8, textAlign: "center" }}>{it.qty ?? "—"}</td>
                  <td style={{ padding: 8, textAlign: "center" }}>{it.uom ?? "—"}</td>
                  <td style={{ padding: 8 }}>
                    {it.spec ? <code style={{ fontSize: 12 }}>{JSON.stringify(it.spec)}</code> : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ marginTop: 12, opacity: 0.7 }}>No items found.</div>
        )}
      </div>

      {history.length > 0 ? (
        <QuoteHistory rfqId={rfqId} history={history} itemTitleById={itemTitleById} />
      ) : (
        <div style={{ marginTop: 24, opacity: 0.7 }}>No submitted quotes yet.</div>
      )}

      <div style={{ marginTop: 28, padding: 16, border: "1px dashed #ccc", borderRadius: 12 }}>
        <h3 style={{ margin: 0, fontWeight: 700 }}>Submit Your Quote</h3>

        {isAccepted ? (
          <div style={{ marginTop: 10 }}>
            <div
              style={{
                padding: 12,
                borderRadius: 12,
                border: "1px solid #bbf7d0",
                background: "#ecfdf5",
                color: "#065f46",
                fontWeight: 900,
              }}
            >
              ✅ Quote submission is disabled because this RFQ is already <strong>ACCEPTED</strong>.
            </div>
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
              You can still review your submitted versions above.
            </div>
          </div>
        ) : isLost ? (
          <div style={{ marginTop: 10 }}>
            <div
              style={{
                padding: 12,
                borderRadius: 12,
                border: "1px solid #fde68a",
                background: "#fffbeb",
                color: "#92400e",
                fontWeight: 900,
              }}
            >
              This RFQ is closed and your quote was <strong>not selected</strong>.
            </div>
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
              New quote submission is disabled for this RFQ.
            </div>
          </div>
        ) : itemsForForm.length === 0 ? (
          <div style={{ marginTop: 10, opacity: 0.7 }}>No quoteable items found in this RFQ.</div>
        ) : (
          <QuoteForm rfqId={rfqId} items={itemsForForm} />
        )}
      </div>
    </div>
  );
}