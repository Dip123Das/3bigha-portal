import Link from "next/link";
import { fetchBuyerQuoteCompare } from "@/lib/rfq/buyer-quote-compare/server";
import SmartDecisionBox from "./SmartDecisionBox";
import MarketplaceAiDashboard from "./MarketplaceAiDashboard";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function fmtMoney(n?: number | null) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  try {
    return "₹" + Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
  } catch {
    return "₹" + String(n);
  }
}

function pillStyle(tone: "neutral" | "ok" | "warn" | "bad" = "neutral") {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    border: "1px solid rgba(0,0,0,0.10)",
    background: "#fff",
    color: "#111827",
    whiteSpace: "nowrap",
  };

  if (tone === "ok") {
    return { ...base, borderColor: "#bbf7d0", background: "#ecfdf5", color: "#065f46" };
  }
  if (tone === "warn") {
    return { ...base, borderColor: "#fde68a", background: "#fffbeb", color: "#92400e" };
  }
  if (tone === "bad") {
    return { ...base, borderColor: "#fecaca", background: "#fef2f2", color: "#991b1b" };
  }
  return { ...base, borderColor: "#e5e7eb", background: "#f8fafc", color: "#111827" };
}

function titleCase(s: string | null | undefined) {
  const t = (s ?? "").replace(/_/g, " ").trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "—";
}

function getVendorAiSignals(v: any, bestPriceVendorId: string | null, fastestVendorId: string | null, aiRecommendedVendorId: string | null) {
  const signals: Array<{ label: string; tone: "neutral" | "ok" | "warn" | "bad" }> = [];

  const isTopCloser = Number(v.ready_deal_signals || 0) >= 3;
  const isHighWin = Number(v.win_probability || 0) > 0.7;
  const isPremium = Number(v.weighted_boost || 0) > 0;
  const isAiRecommended = aiRecommendedVendorId && String(v.vendor_id) === aiRecommendedVendorId;
  const isBestPrice = bestPriceVendorId && String(v.vendor_id) === String(bestPriceVendorId);
  const isFastest = fastestVendorId && String(v.vendor_id) === String(fastestVendorId);

  if (isAiRecommended) signals.push({ label: "🧠 AI Recommended", tone: "ok" });
  if (isBestPrice) signals.push({ label: "📉 Best value", tone: "ok" });
  if (isTopCloser) signals.push({ label: "🔥 Top Closer", tone: "ok" });
  if (!isTopCloser && isHighWin) signals.push({ label: "⚡ High Win", tone: "ok" });
  if (isPremium) signals.push({ label: "⭐ Premium", tone: "neutral" });
  if (isFastest) signals.push({ label: "🚚 Fastest", tone: "neutral" });

  return signals.slice(0, 5);
}

function actionBtnStyle(kind: "talk" | "normal" | "accept" = "normal"): React.CSSProperties {
  if (kind === "talk") {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      minHeight: 38,
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

  if (kind === "accept") {
    return {
      height: 38,
      padding: "0 14px",
      borderRadius: 999,
      border: "1px solid rgba(0,0,0,0.12)",
      background: "#fff",
      fontWeight: 900,
      cursor: "pointer",
    };
  }

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 38,
    padding: "0 14px",
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "#fff",
    fontWeight: 900,
    textDecoration: "none",
    color: "#111827",
  };
}

export default async function BuyerQuoteComparePage({
  params,
  searchParams,
}: {
  params: { rfqId: string };
  searchParams?: { accepted?: string };
}) {
  const rfqId = decodeURIComponent(params.rfqId);

  if (!UUID_RE.test(rfqId)) {
    return (
      <main style={{ padding: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Invalid RFQ ID</h1>
        <div style={{ marginTop: 10 }}>
          <Link href="/dashboard/buyer/rfqs" style={{ fontWeight: 900 }}>
            ← Back to My RFQs
          </Link>
        </div>
      </main>
    );
  }

  const res = await fetchBuyerQuoteCompare(rfqId);

  if (res.error) {
    return (
      <main style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
        <div
          style={{
            border: "1px solid #fecaca",
            background: "#fef2f2",
            padding: 14,
            borderRadius: 12,
            color: "#991b1b",
            fontWeight: 900,
          }}
        >
          {res.error}
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/dashboard/buyer/rfqs" style={{ fontWeight: 900 }}>
            ← Back to My RFQs
          </Link>
          <Link href="/dashboard" style={{ fontWeight: 900 }}>
            Dashboard →
          </Link>
        </div>
      </main>
    );
  }

  const rfq: any = res.rfq as any;
  const items = res.items ?? [];
  const vendors = res.vendors ?? [];
  const quoteItems = res.quoteItems ?? [];
  const selectedVendor = "selectedVendor" in res ? (res as any).selectedVendor ?? null : null;

  const byQuote: Record<string, Record<string, any>> = {};
  for (const qi of quoteItems as any[]) {
    const qid = String((qi as any).quote_id);
    const iid = String((qi as any).rfq_item_id);
    if (!byQuote[qid]) byQuote[qid] = {};
    byQuote[qid][iid] = qi;
  }

  const vendorsSorted = [...vendors].sort((a: any, b: any) => {
    const ga = a.grand_total == null ? Number.POSITIVE_INFINITY : Number(a.grand_total);
    const gb = b.grand_total == null ? Number.POSITIVE_INFINITY : Number(b.grand_total);
    if (ga !== gb) return ga - gb;
    const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    return tb - ta;
  });

  const module = rfq?.module ?? null;
  const subjectType =
    module === "materials"
      ? "Material"
      : module === "services"
      ? "Service"
      : module === "rentals"
      ? "Rental"
      : module === "property"
      ? "Property"
      : titleCase(module);

  const rfqNo = rfq?.public_id ?? rfqId.slice(0, 8);

  const acceptedQuoteId = (rfq?.meta as any)?.accepted_quote_id ?? null;
  const acceptedVendorId = (rfq?.meta as any)?.accepted_vendor_id ?? null;
  const acceptedAt = (rfq?.meta as any)?.accepted_at ?? null;

  const priced = vendorsSorted.filter((v: any) => v?.grand_total != null && Number.isFinite(Number(v.grand_total)));
  const bestPriceVendorId = priced.length ? String(priced[0].vendor_id) : null;

  const byDelivery = vendorsSorted
    .filter((v: any) => v?.delivery_days != null && Number.isFinite(Number(v.delivery_days)))
    .sort((a: any, b: any) => Number(a.delivery_days) - Number(b.delivery_days));
  const fastestVendorId = byDelivery.length ? String(byDelivery[0].vendor_id) : null;

  const showAcceptedBanner = String(searchParams?.accepted ?? "") === "1";

  const aiRecommendedVendor: any =
    vendorsSorted.length > 0
      ? [...vendorsSorted].sort((a: any, b: any) => {
          const aScore =
            Number(a.ready_deal_signals || 0) * 30 +
            Number(a.win_probability || 0) * 40 +
            Number(a.weighted_boost || 0);

          const bScore =
            Number(b.ready_deal_signals || 0) * 30 +
            Number(b.win_probability || 0) * 40 +
            Number(b.weighted_boost || 0);

          if (bScore !== aScore) return bScore - aScore;

          const ga = a.grand_total == null ? Number.POSITIVE_INFINITY : Number(a.grand_total);
          const gb = b.grand_total == null ? Number.POSITIVE_INFINITY : Number(b.grand_total);

          return ga - gb;
        })[0]
      : null;

  const aiRecommendedVendorId = aiRecommendedVendor?.vendor_id
    ? String(aiRecommendedVendor.vendor_id)
    : null;

  const buyerPrintHref = `/dashboard/buyer/quote-compare/${encodeURIComponent(rfqId)}/print`;

  const smartDecisionPayload = {
    rfqId,
    rfq,
    quote: aiRecommendedVendor || priced[0] || null,
    module,
    category: subjectType,
    city: rfq?.city ?? null,
    locality: rfq?.locality ?? null,
    district: rfq?.district ?? null,
    pincode: rfq?.pincode ?? null,
    buyerIntent: rfq?.description ?? rfq?.title ?? null,
    urgency: (rfq?.meta as any)?.urgency ?? null,
    budget: (rfq?.meta as any)?.budget ?? null,
    items,
    vendors: vendorsSorted.map((v: any) => ({
      id: v.vendor_id,
      vendorId: v.vendor_id,
      vendor_id: v.vendor_id,
      quote_id: v.quote_id,
      name: v.vendor_business_name,
      business_name: v.vendor_business_name,
      vendor_business_name: v.vendor_business_name,
      price: v.grand_total,
      quoted_price: v.grand_total,
      grand_total: v.grand_total,
      subtotal: v.subtotal,
      gst_amount: v.gst_amount,
      city: v.vendor_city,
      locality: v.vendor_locality,
      delivery_days: v.delivery_days,
      valid_till: v.valid_till,
      ready_deal_signals: v.ready_deal_signals,
      win_probability: v.win_probability,
      weighted_boost: v.weighted_boost,
      risk_score: v.risk_score,
      ai_score: v.ai_score,
      trust_score: v.trust_score,
    })),
    priceData: {
      lowestQuote: priced[0]?.grand_total ?? null,
      highestQuote: priced[priced.length - 1]?.grand_total ?? null,
      averagePrice:
        priced.length > 0
          ? Math.round(
              priced.reduce((sum: number, v: any) => sum + Number(v.grand_total || 0), 0) /
                priced.length
            )
          : null,
    },
  };

  return (
    <main style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Quote Compare</h1>
          <div style={{ marginTop: 6, opacity: 0.8 }}>
            Compare vendors’ latest quotes for this RFQ and pick the best option.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Link href="/dashboard/buyer/rfqs" style={{ fontWeight: 900 }}>
            ← My RFQs
          </Link>
          <Link href="/dashboard" style={{ fontWeight: 900 }}>
            Dashboard →
          </Link>
        </div>
      </div>

      {showAcceptedBanner ? (
        <div
          style={{
            marginTop: 14,
            border: "1px solid #bbf7d0",
            background: "#ecfdf5",
            padding: 12,
            borderRadius: 12,
            color: "#065f46",
            fontWeight: 900,
          }}
        >
          ✅ Quote accepted successfully. RFQ has been closed.
        </div>
      ) : null}

      <div
        style={{
          marginTop: 14,
          padding: 14,
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          background: "#fff",
        }}
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span style={pillStyle("neutral")}>RFQ #{rfqNo}</span>
          <span style={pillStyle(rfq?.status === "open" ? "ok" : "neutral")}>{titleCase(rfq?.status ?? "—")}</span>
          <span style={pillStyle("neutral")}>{subjectType}</span>
          <span style={pillStyle("neutral")}>Revision: {rfq?.revision_no ?? 1}</span>
          <span style={pillStyle("neutral")}>Vendors: {vendorsSorted.length}</span>
          {acceptedQuoteId ? <span style={pillStyle("ok")}>Accepted</span> : null}
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 6, fontSize: 13 }}>
          <div>
            <strong>Buyer:</strong> {rfq?.contact_name ?? "—"}
          </div>
          <div>
            <strong>Location:</strong>{" "}
            {[(rfq?.locality ?? "").trim(), (rfq?.city ?? "").trim(), (rfq?.district ?? "").trim()]
              .filter(Boolean)
              .join(", ") || "—"}
            {rfq?.pincode ? `, ${rfq.pincode}` : ""}
          </div>
          <div>
            <strong>Created:</strong> {fmtDateTime(rfq?.created_at)} <span style={{ opacity: 0.7 }}>•</span>{" "}
            <strong>Updated:</strong> {fmtDateTime(rfq?.updated_at)}
          </div>
        </div>
      </div>

      <MarketplaceAiDashboard payload={smartDecisionPayload} />

      <SmartDecisionBox payload={smartDecisionPayload} />

      {aiRecommendedVendor ? (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            borderRadius: 16,
            border: "1px solid #bfdbfe",
            background: "linear-gradient(135deg, #eff6ff, #ffffff)",
            boxShadow: "0 10px 24px rgba(37,99,235,0.08)",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 950, color: "#1d4ed8" }}>
            🧠 AI Recommended Vendor
          </div>

          <div style={{ marginTop: 6, fontSize: 20, fontWeight: 1000, color: "#0f172a" }}>
            {aiRecommendedVendor.vendor_business_name ??
              (aiRecommendedVendor.vendor_id
                ? `Vendor ${String(aiRecommendedVendor.vendor_id).slice(0, 8)}…`
                : "Vendor")}
          </div>

          <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={pillStyle("ok")}>Best AI Fit</span>

            {Number(aiRecommendedVendor.ready_deal_signals || 0) >= 3 ? (
              <span style={pillStyle("ok")}>🔥 Top Closer</span>
            ) : null}

            {Number(aiRecommendedVendor.win_probability || 0) > 0.7 ? (
              <span style={pillStyle("ok")}>⚡ High Win Probability</span>
            ) : null}

            {Number(aiRecommendedVendor.weighted_boost || 0) > 0 ? (
              <span style={pillStyle("neutral")}>⭐ Premium Vendor</span>
            ) : null}

            <span style={pillStyle("neutral")}>
              Total: {fmtMoney(aiRecommendedVendor.grand_total)}
            </span>
          </div>

          <div style={{ marginTop: 8, fontSize: 13, color: "#475569", fontWeight: 800 }}>
            Suggested based on deal signals, AI win probability, vendor reputation and quote strength.
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link
              href={`/dashboard/buyer/quote-compare/${encodeURIComponent(rfqId)}/chat?vendorId=${encodeURIComponent(
                String(aiRecommendedVendor.vendor_id ?? "")
              )}`}
              style={{
                ...actionBtnStyle("talk"),
                background: "linear-gradient(180deg, #dcfce7 0%, #86efac 100%)",
                border: "1px solid #22c55e",
                fontWeight: 1000,
              }}
            >
              💬 Talk to AI Recommended Vendor
            </Link>

            <form
              action={`/api/buyer/rfq/${encodeURIComponent(rfqId)}/accept`}
              method="post"
              style={{ display: "inline-flex" }}
            >
              <input type="hidden" name="quote_id" value={String(aiRecommendedVendor.quote_id ?? "")} />
              <button
                type="submit"
                style={{
                  height: 38,
                  padding: "0 14px",
                  borderRadius: 999,
                  border: "1px solid #60a5fa",
                  background: "#eff6ff",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                ✅ Accept Recommended
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {selectedVendor ? (
        <div
          style={{
            marginTop: 18,
            padding: 16,
            border: "1px solid #bbf7d0",
            background: "#ecfdf5",
            borderRadius: 14,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 900, color: "#065f46", marginBottom: 6 }}>
                SELECTED VENDOR SUMMARY
              </div>
              <div style={{ fontSize: 20, fontWeight: 900 }}>
                {selectedVendor.vendor_business_name ??
                  (selectedVendor.vendor_id ? `Vendor ${String(selectedVendor.vendor_id).slice(0, 8)}…` : "Vendor")}
              </div>
              <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={pillStyle("ok")}>Winner</span>
                <span style={pillStyle("ok")}>Accepted</span>
                <span style={pillStyle("neutral")}>v{selectedVendor.version ?? "—"}</span>
                {acceptedAt ? <span style={pillStyle("neutral")}>Accepted at: {fmtDateTime(acceptedAt)}</span> : null}
              </div>
              <div style={{ marginTop: 8, fontSize: 13, opacity: 0.85 }}>
                📍 {[selectedVendor.vendor_locality, selectedVendor.vendor_city].filter(Boolean).join(", ") || "—"}
              </div>
            </div>

            <div style={{ textAlign: "right", minWidth: 220 }}>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Final Total</div>
              <div style={{ fontSize: 24, fontWeight: 1000 }}>{fmtMoney(selectedVendor.grand_total)}</div>
              <div style={{ marginTop: 6, fontSize: 13 }}>
                Delivery: <strong>{selectedVendor.delivery_days ?? "—"}</strong> days
              </div>
              <div style={{ marginTop: 4, fontSize: 13 }}>
                Valid till: <strong>{selectedVendor.valid_till ?? "—"}</strong>
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 8, justifyItems: "end" }}>
                <Link
                  href={`/dashboard/buyer/quote-compare/${encodeURIComponent(rfqId)}/chat?vendorId=${encodeURIComponent(
                    String(selectedVendor.vendor_id ?? "")
                  )}`}
                  style={actionBtnStyle("talk")}
                >
                  💬 Talk to Vendor
                </Link>

                <Link
                  href={buyerPrintHref}
                  target="_blank"
                  style={actionBtnStyle("normal")}
                >
                  🧾 Download Quote
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 18 }}>
        <h2 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>Quick Compare</h2>

        {vendorsSorted.length === 0 ? (
          <div style={{ marginTop: 10, opacity: 0.75 }}>No vendor responses yet.</div>
        ) : (
          <div style={{ marginTop: 10, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb", background: "#fafafa" }}>
                  <th style={{ textAlign: "left", padding: 10 }}>Vendor</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Price</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Delivery</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Action</th>
                </tr>
              </thead>

              <tbody>
                {vendorsSorted.map((v: any) => {
                  const name =
                    v.vendor_business_name ??
                    (v.vendor_id ? `Vendor ${String(v.vendor_id).slice(0, 8)}…` : "Vendor");

                  const isAccepted =
                    (acceptedVendorId && String(acceptedVendorId) === String(v.vendor_id)) ||
                    (acceptedQuoteId && String(acceptedQuoteId) === String(v.quote_id));

                  const isTopCloser = Number(v.ready_deal_signals || 0) >= 3;
                  const isHighWin = Number(v.win_probability || 0) > 0.7;
                  const isPremium = Number(v.weighted_boost || 0) > 0;

                  const isBestPrice = bestPriceVendorId && String(v.vendor_id) === String(bestPriceVendorId);
                  const isFastest = fastestVendorId && String(v.vendor_id) === String(fastestVendorId);

                  const rfqClosed = String(rfq?.status ?? "") === "closed";
                  const talkHref = `/dashboard/buyer/quote-compare/${encodeURIComponent(
                    rfqId
                  )}/chat?vendorId=${encodeURIComponent(String(v.vendor_id ?? ""))}`;

                  return (
                    <tr
                      key={v.vendor_id}
                      style={{
                        borderBottom: "1px solid #f3f4f6",
                        background:
                          aiRecommendedVendorId && String(v.vendor_id) === aiRecommendedVendorId
                            ? "#eff6ff"
                            : "transparent",
                      }}
                    >
                      <td style={{ padding: 10, fontWeight: 900 }}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          <span>{name}</span>

                          {getVendorAiSignals(v, bestPriceVendorId, fastestVendorId, aiRecommendedVendorId).map(
                            (signal, idx) => (
                              <span key={idx} style={pillStyle(signal.tone)}>
                                {signal.label}
                              </span>
                            )
                          )}
                          {isAccepted ? <span style={pillStyle("ok")}>Accepted</span> : null}
                        </div>
                      </td>
                      <td style={{ padding: 10 }}>{fmtMoney(v.grand_total)}</td>
                      <td style={{ padding: 10 }}>{v.delivery_days != null ? `${v.delivery_days} days` : "—"}</td>
                      <td style={{ padding: 10 }}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <Link href={talkHref} style={actionBtnStyle("talk")}>
                            💬 Talk to Vendor
                          </Link>

                          {isAccepted ? (
                            <span style={pillStyle("ok")}>Accepted</span>
                          ) : rfqClosed ? (
                            <span style={pillStyle("neutral")}>Closed</span>
                          ) : (
                            <form
                              action={`/api/buyer/rfq/${encodeURIComponent(rfqId)}/accept`}
                              method="post"
                              style={{ display: "inline-flex" }}
                            >
                              <input type="hidden" name="quote_id" value={String(v.quote_id)} />
                              <button type="submit" style={actionBtnStyle("accept")}>
                                Accept
                              </button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginTop: 18 }}>
        <h2 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>RFQ Items</h2>

        {items.length === 0 ? (
          <div style={{ marginTop: 10, opacity: 0.75 }}>No items found for this RFQ.</div>
        ) : (
          <div style={{ marginTop: 10, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb", background: "#fafafa" }}>
                  <th style={{ textAlign: "left", padding: 10 }}>#</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Item</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Description</th>
                  <th style={{ textAlign: "center", padding: 10 }}>Qty</th>
                  <th style={{ textAlign: "center", padding: 10 }}>UOM</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it: any, idx: number) => (
                  <tr key={it.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: 10, fontWeight: 900 }}>{it.line_no ?? idx + 1}</td>
                    <td style={{ padding: 10, fontWeight: 800 }}>{it.title ?? "—"}</td>
                    <td style={{ padding: 10, color: "#374151" }}>{it.description ?? "—"}</td>
                    <td style={{ padding: 10, textAlign: "center" }}>{it.qty ?? "—"}</td>
                    <td style={{ padding: 10, textAlign: "center" }}>{it.uom ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginTop: 18 }}>
        <h2 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>Vendors (latest quote per vendor)</h2>

        {vendorsSorted.length === 0 ? (
          <div style={{ marginTop: 10, opacity: 0.75 }}>No quotes received yet.</div>
        ) : (
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {vendorsSorted.map((v: any) => {
              const outdated = !!v.is_outdated;
              const tone = outdated ? "warn" : "ok";
              const name =
                v.vendor_business_name ?? (v.vendor_id ? `Vendor ${String(v.vendor_id).slice(0, 8)}…` : "Vendor");
              const place = [v.vendor_locality, v.vendor_city].filter(Boolean).join(", ");

              const isAccepted =
                (acceptedVendorId && String(acceptedVendorId) === String(v.vendor_id)) ||
                (acceptedQuoteId && String(acceptedQuoteId) === String(v.quote_id));

              const isTopCloser = Number(v.ready_deal_signals || 0) >= 3;
              const isHighWin = Number(v.win_probability || 0) > 0.7;
              const isPremium = Number(v.weighted_boost || 0) > 0;

              const talkHref = v.conversation_id
                ? `/dashboard/thread/${encodeURIComponent(v.conversation_id)}`
                : `/dashboard/thread/${encodeURIComponent(rfqId)}`;

              return (
                <div
                  key={v.vendor_id}
                  style={{
                    border: "1px solid rgba(0,0,0,0.12)",
                    borderRadius: 14,
                    padding: 12,
                    background: "#fff",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <div style={{ minWidth: 260 }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={pillStyle(isAccepted ? "ok" : tone)}>
                        {isAccepted ? "accepted" : outdated ? "outdated (needs revision)" : "latest"}
                      </span>
                      <span style={pillStyle("neutral")}>v{v.version ?? "—"}</span>
                      <span style={pillStyle("neutral")}>{titleCase(v.status ?? "—")}</span>
                      <span style={pillStyle("neutral")}>{fmtDateTime(v.updated_at ?? v.created_at)}</span>
                    </div>

                    <div style={{ marginTop: 8, fontWeight: 900 }}>
                      {name}
                    </div>

                    <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {getVendorAiSignals(v, bestPriceVendorId, fastestVendorId, aiRecommendedVendorId).map(
                        (signal, idx) => (
                          <span key={idx} style={pillStyle(signal.tone)}>
                            {signal.label}
                          </span>
                        )
                      )}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 13, opacity: 0.8 }}>{place ? `📍 ${place}` : null}</div>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900 }}>Grand Total</div>
                      <div style={{ fontSize: 18, fontWeight: 1000 }}>{fmtMoney(v.grand_total)}</div>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>
                        GST: {fmtMoney(v.gst_amount)} • Subtotal: {fmtMoney(v.subtotal)}
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>
                        Delivery: <strong>{v.delivery_days ?? "—"}</strong> days
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>
                        Valid till: <strong>{v.valid_till ?? "—"}</strong>
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>
                        GST mode: <strong>{titleCase(v.gst_mode ?? "—")}</strong> • Rate:{" "}
                        <strong>{v.gst_rate ?? "—"}%</strong>
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: 8 }}>
                      <Link href={talkHref} style={actionBtnStyle("talk")}>
                        💬 Talk to Vendor
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ marginTop: 18 }}>
        <h2 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>Compare (Item-wise)</h2>

        {items.length === 0 || vendorsSorted.length === 0 ? (
          <div style={{ marginTop: 10, opacity: 0.75 }}>Nothing to compare yet.</div>
        ) : (
          <div style={{ marginTop: 10, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb", background: "#fafafa" }}>
                  <th style={{ textAlign: "left", padding: 10, minWidth: 260 }}>Item</th>
                  {vendorsSorted.map((v: any) => {
                    const name =
                      v.vendor_business_name ?? (v.vendor_id ? `Vendor ${String(v.vendor_id).slice(0, 8)}…` : "Vendor");
                    return (
                      <th key={v.vendor_id} style={{ textAlign: "left", padding: 10, minWidth: 220 }}>
                        <div style={{ fontWeight: 1000 }}>{name}</div>
                        <div style={{ marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <span style={pillStyle(v.is_outdated ? "warn" : "ok")}>
                            {v.is_outdated ? "outdated" : "latest"} v{v.version ?? "—"}
                          </span>
                          <span style={pillStyle("neutral")}>{fmtMoney(v.grand_total)}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {items.map((it: any, idx: number) => (
                  <tr key={it.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: 10, verticalAlign: "top" }}>
                      <div style={{ fontWeight: 900 }}>
                        {(it.line_no ?? idx + 1) + ". "} {it.title ?? "—"}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 12, opacity: 0.8 }}>
                        Qty: <strong>{it.qty ?? "—"}</strong> {it.uom ?? ""}
                      </div>
                      {it.description ? (
                        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>{it.description}</div>
                      ) : null}
                    </td>

                    {vendorsSorted.map((v: any) => {
                      const qid = String(v.quote_id);
                      const cell = byQuote[qid]?.[String(it.id)] ?? null;

                      const unitPrice = cell?.unit_price ?? null;
                      const qty = cell?.qty ?? null;
                      const lineTotal = cell?.line_total ?? null;

                      const hasPrice =
                        unitPrice != null && Number.isFinite(Number(unitPrice)) && Number(unitPrice) > 0;

                      return (
                        <td key={v.vendor_id} style={{ padding: 10, verticalAlign: "top" }}>
                          {!cell ? (
                            <span style={{ opacity: 0.6 }}>—</span>
                          ) : !hasPrice ? (
                            <span style={{ opacity: 0.7 }}>No quote</span>
                          ) : (
                            <div style={{ display: "grid", gap: 6 }}>
                              <div style={{ fontSize: 12, opacity: 0.8 }}>
                                Unit: <strong>{fmtMoney(unitPrice)}</strong>
                              </div>
                              <div style={{ fontSize: 12, opacity: 0.8 }}>
                                Qty: <strong>{qty ?? "—"}</strong>
                              </div>
                              <div style={{ fontSize: 12, opacity: 0.8 }}>
                                Line: <strong>{fmtMoney(lineTotal)}</strong>
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr style={{ borderTop: "1px solid #e5e7eb", background: "#fafafa" }}>
                  <td style={{ padding: 10, fontWeight: 1000 }}>Totals</td>
                  {vendorsSorted.map((v: any) => (
                    <td key={v.vendor_id} style={{ padding: 10 }}>
                      <div style={{ fontWeight: 1000 }}>{fmtMoney(v.grand_total)}</div>
                      <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                        Subtotal: {fmtMoney(v.subtotal)} <br />
                        GST: {fmtMoney(v.gst_amount)}
                      </div>
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginTop: 16, opacity: 0.75, fontSize: 13 }}>
        Tip: If a vendor shows <strong>outdated</strong>, ask them to submit a revised quote for the latest RFQ revision.
      </div>
    </main>
  );
}