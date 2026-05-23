"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type QuoteRow = {
  id: string;
  version: number;
  status: string | null;
  delivery_days: number | null;
  valid_till: string | null;
  notes: string | null;

  subtotal: number | null;     // excl GST
  gst_rate: number | null;     // default (optional)
  gst_mode: string | null;     // exclusive/inclusive
  gst_amount: number | null;   // sum of per-item GST (after new RPC)
  grand_total: number | null;

  created_at: string | null;
  updated_at: string | null;
};

type QuoteItemRow = {
  rfq_item_id: string;
  qty: number | null;
  unit_price: number | null;
  line_total: number | null;
  gst_rate: number | null; // ✅ per-item
};

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

export default function QuoteHistory(props: {
  rfqId: string;
  history: QuoteRow[];
  itemTitleById: Record<string, string>;
}) {
  const { history, itemTitleById } = props;

  const supabase = useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const [selectedQuoteId, setSelectedQuoteId] = useState<string>(history?.[0]?.id ?? "");
  const [selected, setSelected] = useState<QuoteRow | null>(history?.[0] ?? null);

  const [items, setItems] = useState<QuoteItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const q = history.find((x) => x.id === selectedQuoteId) ?? null;
    setSelected(q);
  }, [selectedQuoteId, history]);

  useEffect(() => {
    const run = async () => {
      if (!selectedQuoteId) return;
      setLoading(true);
      setErr(null);
      try {
        const { data, error } = await supabase
          .from("rfq_quote_items")
          .select("rfq_item_id,qty,unit_price,line_total,gst_rate")
          .eq("quote_id", selectedQuoteId);

        if (error) {
          setErr(error.message);
          setItems([]);
        } else {
          setItems((data ?? []) as any);
        }
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [selectedQuoteId, supabase]);

  const label = (rfq_item_id: string) => itemTitleById[rfq_item_id] ?? "—";

  const modeLabel = useMemo(() => {
    const mode = (selected?.gst_mode ?? "exclusive").toLowerCase();
    return mode === "inclusive" ? "inclusive" : "exclusive";
  }, [selected]);

  return (
    <div style={{ marginTop: 14, padding: 12, border: "1px solid #e5e7eb", borderRadius: 12, background: "#fafafa" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0, fontWeight: 800 }}>Your Submitted Quotes</h3>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ fontSize: 13, opacity: 0.8 }}>View version:</div>
          <select value={selectedQuoteId} onChange={(e) => setSelectedQuoteId(e.target.value)} style={{ padding: 6 }}>
            {history.map((q) => (
              <option key={q.id} value={q.id}>
                v{q.version} ({fmtMoney(q.grand_total ?? q.subtotal)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {!selected ? (
        <div style={{ marginTop: 10, opacity: 0.7 }}>No quote found.</div>
      ) : (
        <>
          <div style={{ marginTop: 10 }}>
            <strong>Status:</strong> {selected.status ?? "—"} {" | "}
            <strong>Version:</strong> {selected.version ?? "—"} {" | "}
            <strong>GST mode:</strong> {modeLabel}
          </div>

          <div style={{ marginTop: 8, display: "grid", gap: 4, fontSize: 13, opacity: 0.9 }}>
            <div><strong>Delivery days:</strong> {selected.delivery_days ?? "—"}</div>
            <div><strong>Valid till:</strong> {selected.valid_till ?? "—"}</div>
            <div><strong>Updated:</strong> {selected.updated_at ?? selected.created_at ?? "—"}</div>
          </div>

          {selected.notes ? (
            <div style={{ marginTop: 10 }}>
              <strong>Notes:</strong> {selected.notes}
            </div>
          ) : null}

          <div style={{ marginTop: 12 }}>
            {loading ? (
              <div style={{ opacity: 0.7 }}>Loading quote items…</div>
            ) : err ? (
              <div style={{ color: "crimson" }}>{err}</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <th style={{ padding: 8, textAlign: "left" }}>Item</th>
                    <th style={{ padding: 8, textAlign: "center" }}>Qty</th>
                    <th style={{ padding: 8, textAlign: "center" }}>Unit Price</th>
                    <th style={{ padding: 8, textAlign: "center" }}>GST%</th>
                    <th style={{ padding: 8, textAlign: "right" }}>Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((qi) => (
                    <tr key={qi.rfq_item_id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: 8 }}>{label(qi.rfq_item_id)}</td>
                      <td style={{ padding: 8, textAlign: "center" }}>{qi.qty ?? "—"}</td>
                      <td style={{ padding: 8, textAlign: "center" }}>{fmtMoney(qi.unit_price)}</td>
                      <td style={{ padding: 8, textAlign: "center" }}>{qi.gst_rate ?? 0}</td>
                      <td style={{ padding: 8, textAlign: "right" }}>{fmtMoney(qi.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Totals (already calculated by RPC) */}
          <div style={{ marginTop: 14, padding: 12, border: "1px solid #e5e7eb", borderRadius: 12, background: "white" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <span style={{ opacity: 0.85 }}>Subtotal (excl.)</span>
              <strong>{fmtMoney(selected.subtotal)}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 8 }}>
              <span style={{ opacity: 0.85 }}>GST (sum of items)</span>
              <strong>{fmtMoney(selected.gst_amount)}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 8 }}>
              <span style={{ opacity: 0.85 }}>Grand Total</span>
              <strong>{fmtMoney(selected.grand_total)}</strong>
            </div>
          </div>

          <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}>
            <strong>History:</strong> {history.map((q) => `v${q.version}`).join(", ")}
          </div>
        </>
      )}
    </div>
  );
}