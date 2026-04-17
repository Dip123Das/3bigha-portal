// app/dashboard/buyer/quote-compare/[rfqId]/print/page.tsx
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import PrintQuoteButton from "@/app/dashboard/buyer/quote-compare/[rfqId]/print/print-quote-button";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fmtMoney(n?: number | null) {
  if (n == null) return "—";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(n));
  } catch {
    return `₹${n}`;
  }
}

function fmtDate(v?: string | null) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return v;
  }
}

export default async function BuyerAcceptedQuotePrintPage({
  params,
}: {
  params: { rfqId: string };
}) {
  const rfqId = decodeURIComponent(params.rfqId || "");
  const supabase = getSupabaseServerClient(cookies());

  if (!UUID_RE.test(rfqId)) {
    return <div style={{ padding: 24 }}>Invalid RFQ ID</div>;
  }

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return <div style={{ padding: 24 }}>Please login.</div>;
  }

  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("context_type", "rfq")
    .eq("rfq_id", rfqId)
    .eq("buyer_user_id", user.id)
    .maybeSingle();

  if (!conv) {
    return <div style={{ padding: 24 }}>Accepted conversation not found.</div>;
  }

  const { data: rfq, error: rfqErr } = await supabase
    .from("rfqs")
    .select("id,public_id,meta,city,district,locality,pincode")
    .eq("id", rfqId)
    .maybeSingle();

  if (rfqErr || !rfq) {
    return <div style={{ padding: 24 }}>{rfqErr?.message ?? "RFQ not found."}</div>;
  }

  const acceptedQuoteId = (rfq.meta as any)?.accepted_quote_id ?? null;
  if (!acceptedQuoteId) {
    return <div style={{ padding: 24 }}>Accepted quote not found.</div>;
  }

  const { data: quote, error: quoteErr } = await supabase
    .from("rfq_quotes")
    .select(
      "id,version,status,delivery_days,valid_till,notes,subtotal,gst_mode,gst_rate,gst_amount,grand_total,created_at,updated_at,vendor_id"
    )
    .eq("id", acceptedQuoteId)
    .maybeSingle();

  if (quoteErr || !quote) {
    return <div style={{ padding: 24 }}>{quoteErr?.message ?? "Quote not found."}</div>;
  }

  const { data: quoteItems, error: quoteItemsErr } = await supabase
    .from("rfq_quote_items")
    .select("rfq_item_id,qty,unit_price,line_total,gst_rate")
    .eq("quote_id", quote.id);

  if (quoteItemsErr) {
    return <div style={{ padding: 24 }}>{quoteItemsErr.message}</div>;
  }

  const { data: items } = await supabase
    .from("rfq_items")
    .select("id,line_no,title,description,uom")
    .eq("rfq_id", rfqId)
    .order("line_no", { ascending: true });

  const { data: vendorBiz } = await supabase
    .from("business_profiles")
    .select("user_id,business_name,city,locality")
    .eq("user_id", quote.vendor_id)
    .maybeSingle();

  const titleById = Object.fromEntries((items ?? []).map((x: any) => [String(x.id), x]));
  const rfqNo = (rfq as any).public_id ?? rfqId.slice(0, 8);

  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        background: "#fff",
        color: "#111",
        margin: 0,
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28 }}>Accepted Quote</h1>
            <div style={{ marginTop: 6, opacity: 0.8 }}>RFQ #{rfqNo}</div>
          </div>

          <PrintQuoteButton />
        </div>

        <div
          style={{
            marginTop: 18,
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div><strong>Vendor:</strong> {(vendorBiz as any)?.business_name ?? "—"}</div>
          <div style={{ marginTop: 6 }}>
            <strong>Location:</strong>{" "}
            {[(rfq as any)?.locality, (rfq as any)?.city, (rfq as any)?.district].filter(Boolean).join(", ") || "—"}
            {(rfq as any)?.pincode ? `, ${(rfq as any).pincode}` : ""}
          </div>
          <div style={{ marginTop: 6 }}>
            <strong>Quote Version:</strong> v{quote.version ?? "—"}
          </div>
          <div style={{ marginTop: 6 }}>
            <strong>Status:</strong> {quote.status ?? "—"}
          </div>
          <div style={{ marginTop: 6 }}>
            <strong>Delivery Days:</strong> {quote.delivery_days ?? "—"}
          </div>
          <div style={{ marginTop: 6 }}>
            <strong>Valid Till:</strong> {quote.valid_till ?? "—"}
          </div>
          <div style={{ marginTop: 6 }}>
            <strong>Updated:</strong> {fmtDate(quote.updated_at ?? quote.created_at)}
          </div>
          <div style={{ marginTop: 6 }}>
            <strong>GST Mode:</strong> {quote.gst_mode ?? "exclusive"}
          </div>
          {quote.notes ? (
            <div style={{ marginTop: 6 }}>
              <strong>Notes:</strong> {quote.notes}
            </div>
          ) : null}
        </div>

        <div style={{ marginTop: 18 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ textAlign: "left", padding: 10 }}>#</th>
                <th style={{ textAlign: "left", padding: 10 }}>Item</th>
                <th style={{ textAlign: "center", padding: 10 }}>Qty</th>
                <th style={{ textAlign: "center", padding: 10 }}>Unit Price</th>
                <th style={{ textAlign: "center", padding: 10 }}>GST%</th>
                <th style={{ textAlign: "right", padding: 10 }}>Line Total</th>
              </tr>
            </thead>
            <tbody>
              {(quoteItems ?? []).map((qi: any, idx: number) => {
                const item = titleById[String(qi.rfq_item_id)];
                return (
                  <tr key={`${qi.rfq_item_id}_${idx}`} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: 10 }}>{item?.line_no ?? idx + 1}</td>
                    <td style={{ padding: 10 }}>
                      <div style={{ fontWeight: 700 }}>{item?.title ?? "—"}</div>
                      {item?.description ? (
                        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>{item.description}</div>
                      ) : null}
                    </td>
                    <td style={{ padding: 10, textAlign: "center" }}>
                      {qi.qty ?? "—"} {item?.uom ?? ""}
                    </td>
                    <td style={{ padding: 10, textAlign: "center" }}>{fmtMoney(qi.unit_price)}</td>
                    <td style={{ padding: 10, textAlign: "center" }}>{qi.gst_rate ?? 0}</td>
                    <td style={{ padding: 10, textAlign: "right" }}>{fmtMoney(qi.line_total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div
          style={{
            marginTop: 18,
            marginLeft: "auto",
            maxWidth: 340,
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 14,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <span>Subtotal</span>
            <strong>{fmtMoney(quote.subtotal)}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 8 }}>
            <span>GST</span>
            <strong>{fmtMoney(quote.gst_amount)}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 8 }}>
            <span>Grand Total</span>
            <strong>{fmtMoney(quote.grand_total)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}