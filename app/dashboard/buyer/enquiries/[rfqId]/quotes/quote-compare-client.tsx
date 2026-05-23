"use client";

import React, { useMemo, useState } from "react";

type QuoteRow = {
  id: string;
  vendor_id: string;
  version: number;
  status: string | null;

  gst_mode: "inclusive" | "exclusive" | null;
  gst_rate: number | null;
  subtotal: number | null;
  gst_amount: number | null;
  grand_total: number | null;

  updated_at: string | null;
};

type QuoteItemRow = {
  quote_id: string;
  rfq_item_id: string;
  qty: number | null;
  unit_price: number | null;
  line_total: number | null;
};

type RfqItemRow = {
  id: string;
  line_no: number | null;
  title: string | null;
  description: string | null;
  qty: number | null;
  uom: string | null;
};

function money(n?: number | null) {
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

function num(n?: number | null) {
  if (n == null) return "—";
  const x = Number(n);
  if (Number.isNaN(x)) return "—";
  return x.toFixed(2);
}

export default function QuoteCompareClient(props: {
  rfqPublicOrId: string;
  rfqInternalId: string;
  rfqNo?: string | null;

  items: RfqItemRow[];
  latestQuotes: QuoteRow[]; // one per vendor (latest version)
  quoteItems: QuoteItemRow[]; // for those latest quotes only
}) {
  const { items, latestQuotes, quoteItems, rfqNo } = props;

  // Selected vendor column highlight (optional)
  const [focusVendor, setFocusVendor] = useState<string>("");

  const vendors = useMemo(() => {
    return latestQuotes
      .slice()
      .sort((a, b) => (a.vendor_id > b.vendor_id ? 1 : -1));
  }, [latestQuotes]);

  const quoteByVendor = useMemo(() => {
    const m = new Map<string, QuoteRow>();
    for (const q of latestQuotes) m.set(q.vendor_id, q);
    return m;
  }, [latestQuotes]);

  const itemsByQuoteId = useMemo(() => {
    const m = new Map<string, QuoteItemRow[]>();
    for (const qi of quoteItems) {
      if (!m.has(qi.quote_id)) m.set(qi.quote_id, []);
      m.get(qi.quote_id)!.push(qi);
    }
    return m;
  }, [quoteItems]);

  const priceCell = (vendorId: string, rfqItemId: string) => {
    const q = quoteByVendor.get(vendorId);
    if (!q) return null;

    const rows = itemsByQuoteId.get(q.id) ?? [];
    const row = rows.find((x) => x.rfq_item_id === rfqItemId) ?? null;
    if (!row) return null;

    return row;
  };

  // Lowest grand total vendor
  const lowestGrandVendorId = useMemo(() => {
    let bestVendor = "";
    let bestVal = Number.POSITIVE_INFINITY;
    for (const q of latestQuotes) {
      const g = q.grand_total == null ? null : Number(q.grand_total);
      if (g == null) continue;
      if (g < bestVal) {
        bestVal = g;
        bestVendor = q.vendor_id;
      }
    }
    return bestVendor;
  }, [latestQuotes]);

  // Lowest unit price per item (per vendor)
  const lowestUnitVendorByItem = useMemo(() => {
    const m = new Map<string, string>(); // rfq_item_id -> vendor_id
    for (const it of items) {
      let bestVendor = "";
      let best = Number.POSITIVE_INFINITY;

      for (const v of vendors) {
        const cell = priceCell(v.vendor_id, it.id);
        const u = cell?.unit_price == null ? null : Number(cell.unit_price);
        if (u == null) continue;
        if (u < best) {
          best = u;
          bestVendor = v.vendor_id;
        }
      }

      if (bestVendor) m.set(it.id, bestVendor);
    }
    return m;
  }, [items, vendors, quoteByVendor, itemsByQuoteId]);

  return (
    <div style={{ padding: 12, maxWidth: 1200 }}>
      <h1 style={{ fontSize: 18, fontWeight: 800 }}>
        Quote Comparison {rfqNo ? `(RFQ #${rfqNo})` : ""}
      </h1>

      {!vendors.length ? (
        <div style={{ marginTop: 12, opacity: 0.75 }}>
          No vendor quotes found yet.
        </div>
      ) : (
        <>
          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{ opacity: 0.75 }}>
              Vendors: <strong>{vendors.length}</strong>
            </div>

            <div>
              <span style={{ fontSize: 12, opacity: 0.7, marginRight: 6 }}>
                Focus vendor:
              </span>
              <select
                value={focusVendor}
                onChange={(e) => setFocusVendor(e.target.value)}
                style={{ padding: 6 }}
              >
                <option value="">None</option>
                {vendors.map((v) => (
                  <option key={v.vendor_id} value={v.vendor_id}>
                    {v.vendor_id}
                  </option>
                ))}
              </select>
            </div>

            {lowestGrandVendorId ? (
              <div style={{ marginLeft: "auto", fontWeight: 700 }}>
                Lowest Grand Total:{" "}
                <span style={{ padding: "3px 10px", border: "1px solid #bbf7d0", background: "#ecfdf5", borderRadius: 12 }}>
                  {lowestGrandVendorId}
                </span>
              </div>
            ) : null}
          </div>

          <div style={{ marginTop: 14, border: "1px solid #e5e7eb", borderRadius: 12, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
                  <th style={{ padding: 10 }}>Item</th>
                  <th style={{ padding: 10 }}>Qty</th>

                  {vendors.map((v) => {
                    const isLowestGrand = v.vendor_id === lowestGrandVendorId;
                    const isFocused = focusVendor && v.vendor_id === focusVendor;
                    return (
                      <th
                        key={v.vendor_id}
                        style={{
                          padding: 10,
                          whiteSpace: "nowrap",
                          background: isFocused ? "#eff6ff" : isLowestGrand ? "#ecfdf5" : "transparent",
                        }}
                      >
                        {v.vendor_id}
                        <div style={{ fontSize: 12, opacity: 0.7 }}>
                          v{v.version} {v.status ? `• ${v.status}` : ""}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {items.map((it) => (
                  <tr key={it.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: 10 }}>
                      <div style={{ fontWeight: 700 }}>{it.title ?? "—"}</div>
                      {it.description ? (
                        <div style={{ fontSize: 12, opacity: 0.7 }}>{it.description}</div>
                      ) : null}
                    </td>

                    <td style={{ padding: 10, whiteSpace: "nowrap" }}>
                      {(it.qty ?? "—") + (it.uom ? ` ${it.uom}` : "")}
                    </td>

                    {vendors.map((v) => {
                      const cell = priceCell(v.vendor_id, it.id);
                      const isFocused = focusVendor && v.vendor_id === focusVendor;

                      const lowestVendorForThisItem = lowestUnitVendorByItem.get(it.id) ?? "";
                      const isLowestUnit = lowestVendorForThisItem && lowestVendorForThisItem === v.vendor_id;

                      return (
                        <td
                          key={v.vendor_id}
                          style={{
                            padding: 10,
                            verticalAlign: "top",
                            background: isFocused ? "#eff6ff" : isLowestUnit ? "#fffbeb" : "transparent",
                          }}
                        >
                          {!cell ? (
                            <span style={{ opacity: 0.6 }}>—</span>
                          ) : (
                            <div style={{ display: "grid", gap: 4 }}>
                              <div style={{ fontSize: 12, opacity: 0.75 }}>Unit</div>
                              <div style={{ fontWeight: 700 }}>{money(cell.unit_price)}</div>

                              <div style={{ fontSize: 12, opacity: 0.75 }}>Line Total</div>
                              <div>{money(cell.line_total)}</div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr style={{ borderTop: "1px solid #e5e7eb" }}>
                  <td style={{ padding: 10, fontWeight: 800 }}>Totals</td>
                  <td style={{ padding: 10 }} />

                  {vendors.map((v) => {
                    const q = quoteByVendor.get(v.vendor_id);
                    const isLowestGrand = v.vendor_id === lowestGrandVendorId;
                    const isFocused = focusVendor && v.vendor_id === focusVendor;

                    return (
                      <td
                        key={v.vendor_id}
                        style={{
                          padding: 10,
                          background: isFocused ? "#eff6ff" : isLowestGrand ? "#ecfdf5" : "transparent",
                        }}
                      >
                        {!q ? (
                          "—"
                        ) : (
                          <div style={{ display: "grid", gap: 6 }}>
                            <div>Subtotal: {money(q.subtotal)}</div>
                            <div>
                              GST:{" "}
                              {q.gst_rate != null
                                ? `${num(q.gst_rate)}% (${q.gst_mode ?? "—"})`
                                : "—"}{" "}
                              → {money(q.gst_amount)}
                            </div>
                            <div style={{ fontWeight: 900 }}>
                              Grand: {money(q.grand_total)}
                            </div>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}