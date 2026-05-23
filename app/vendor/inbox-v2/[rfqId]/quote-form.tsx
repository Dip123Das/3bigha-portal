"use client";

import { useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type QuoteItemInput = {
  rfq_item_id: string;
  label: string;
  quantity?: number | null; // requested qty
  unit?: string | null;
};

type ExtraDraftItem = {
  tempId: string; // local-only
  title: string;
  description: string;
  qty: string; // keep as string for inputs
  uom: string;
};

type Msg = { kind: "ok" | "err"; text: string };

function toNum(v: string): number | null {
  const t = (v ?? "").trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function r2(n: number) {
  return Math.round(n * 100) / 100;
}

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function QuoteForm(props: { rfqId: string; items: QuoteItemInput[] }) {
  const { rfqId } = props;

  const supabase = useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  // -----------------------------
  // ✅ Extra items (manual add)
  // -----------------------------
  const [extraItems, setExtraItems] = useState<ExtraDraftItem[]>([]);
  const addExtraItem = () => {
    setExtraItems((p) => [
      ...p,
      {
        tempId: uid(),
        title: "",
        description: "",
        qty: "",
        uom: "",
      },
    ]);
  };
  const removeExtraItem = (tempId: string) => {
    setExtraItems((p) => p.filter((x) => x.tempId !== tempId));
  };
  const updateExtra = (tempId: string, patch: Partial<ExtraDraftItem>) => {
    setExtraItems((p) => p.map((x) => (x.tempId === tempId ? { ...x, ...patch } : x)));
  };

  // -----------------------------
  // Pricing inputs (existing + extra)
  // -----------------------------
  const [unitPrices, setUnitPrices] = useState<Record<string, string>>({});
  const [qtys, setQtys] = useState<Record<string, string>>({});

  // GST mode (header) + default GST for items
  const [gstMode, setGstMode] = useState<"exclusive" | "inclusive">("exclusive");
  const [defaultGstRate, setDefaultGstRate] = useState<string>("18");

  // Per-item GST%
  const [itemGstRates, setItemGstRates] = useState<Record<string, string>>({});

  // Existing commercial fields
  const [deliveryDays, setDeliveryDays] = useState<string>("");
  const [validTill, setValidTill] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<Msg | null>(null);

  const setUnitPrice = (key: string, v: string) => setUnitPrices((p) => ({ ...p, [key]: v }));
  const setQty = (key: string, v: string) => setQtys((p) => ({ ...p, [key]: v }));
  const setItemGst = (key: string, v: string) => setItemGstRates((p) => ({ ...p, [key]: v }));

  // Combine “quoteable items” for UI preview:
  // - Existing items use rfq_item_id as key
  // - Extra drafts use tempId as key until saved
  const uiItems = useMemo(() => {
    const existing = (props.items ?? []).map((it) => ({
      key: it.rfq_item_id,
      rfq_item_id: it.rfq_item_id,
      label: it.label,
      quantity: it.quantity ?? null,
      unit: it.unit ?? null,
      isExtra: false as const,
    }));

    const extras = extraItems.map((x) => ({
      key: x.tempId,
      rfq_item_id: "", // not yet
      label: x.title?.trim() ? x.title.trim() : "New item",
      quantity: toNum(x.qty) ?? null,
      unit: x.uom?.trim() ? x.uom.trim() : null,
      isExtra: true as const,
      draft: x,
    }));

    return [...existing, ...extras];
  }, [props.items, extraItems]);

  const applyDefaultToAllItems = () => {
    const def = defaultGstRate;
    const next: Record<string, string> = {};
    for (const it of uiItems) next[it.key] = def;
    setItemGstRates(next);
  };

  // Preview totals (per-item GST) across existing + extra drafts
  const preview = useMemo(() => {
    let subtotalExcl = 0;
    let gstSum = 0;
    let grand = 0;

    for (const it of uiItems) {
      const qDefault = it.quantity ?? 1;
      const q = toNum(qtys[it.key] ?? "") ?? qDefault;
      const up = toNum(unitPrices[it.key] ?? "") ?? 0;
      const lineTotal = (q ?? 0) * (up ?? 0);

      const rate = toNum(itemGstRates[it.key] ?? "") ?? toNum(defaultGstRate) ?? 0;

      if (gstMode === "inclusive") {
        const gstAmt = rate > 0 ? lineTotal * (rate / (100 + rate)) : 0;
        const base = lineTotal - gstAmt;
        subtotalExcl += base;
        gstSum += gstAmt;
        grand += lineTotal;
      } else {
        const gstAmt = rate > 0 ? lineTotal * (rate / 100) : 0;
        subtotalExcl += lineTotal;
        gstSum += gstAmt;
        grand += lineTotal + gstAmt;
      }
    }

    return { subtotalExcl: r2(subtotalExcl), gstSum: r2(gstSum), grand: r2(grand) };
  }, [uiItems, qtys, unitPrices, gstMode, defaultGstRate, itemGstRates]);

  // -----------------------------
  // Helpers
  // -----------------------------

  async function createExtraRfqItems(): Promise<Record<string, string>> {
    // returns map tempId -> new rfq_item_id
    const drafts = extraItems
      .map((x) => ({
        ...x,
        title: x.title.trim(),
        description: x.description.trim(),
        qtyNum: toNum(x.qty),
        uomTrim: x.uom.trim(),
      }))
      .filter((x) => x.title); // must have title

    if (drafts.length === 0) return {};

    // Find next line_no
    const { data: lastRow, error: lastErr } = await supabase
      .from("rfq_items")
      .select("line_no")
      .eq("rfq_id", rfqId)
      .order("line_no", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastErr) throw new Error(lastErr.message);

    const baseLineNo = Number(lastRow?.line_no ?? 0);

    const rowsToInsert = drafts.map((d, idx) => ({
      rfq_id: rfqId,
      line_no: baseLineNo + (idx + 1),
      item_type: "material", // safe default; nullable in your type, but helps consistency
      title: d.title,
      description: d.description || null,
      qty: d.qtyNum ?? null,
      uom: d.uomTrim || null,
      spec: {}, // keep JSON
    }));

    const { data: inserted, error: insErr } = await supabase
      .from("rfq_items")
      .insert(rowsToInsert)
      .select("id,title");

    if (insErr) throw new Error(insErr.message);

    // Map tempId -> inserted id by title order (same order as drafts)
    // (We use order we inserted; safest is to map by index)
    const map: Record<string, string> = {};
    drafts.forEach((d, i) => {
      const newId = String((inserted ?? [])[i]?.id ?? "");
      if (newId) map[d.tempId] = newId;
    });

    return map;
  }

  async function finalizeQuote(quoteId: string, allFinalItems: Array<{ key: string; rfq_item_id: string; quantity?: number | null }>) {
    // Update quote header mode (keep)
    const { error: hdrErr } = await supabase
      .from("rfq_quotes")
      .update({
        gst_mode: gstMode,
        // keep gst_rate on header as "default", optional:
        gst_rate: toNum(defaultGstRate) ?? 0,
      })
      .eq("id", quoteId);

    if (hdrErr) throw new Error(hdrErr.message);

    // Update quote items with qty, unit_price, line_total, gst_rate (NO spec)
    for (const it of allFinalItems) {
      const q = toNum(qtys[it.key] ?? "") ?? it.quantity ?? 1;
      const up = toNum(unitPrices[it.key] ?? "") ?? 0;
      const line = (q ?? 0) * (up ?? 0);

      const rate = toNum(itemGstRates[it.key] ?? "") ?? toNum(defaultGstRate) ?? 0;

      const { error: itErr } = await supabase
        .from("rfq_quote_items")
        .update({
          qty: q,
          unit_price: up,
          line_total: line,
          gst_rate: rate, // ✅ per-item
        })
        .eq("quote_id", quoteId)
        .eq("rfq_item_id", it.rfq_item_id);

      if (itErr) throw new Error(itErr.message);
    }

    // Recalculate totals: prefer per-item function, fallback to old function
    const rec1 = await supabase.rpc("recalc_rfq_quote_totals_per_item", { p_quote_id: quoteId });
    if (rec1.error) {
      const rec2 = await supabase.rpc("recalc_rfq_quote_totals", { p_quote_id: quoteId });
      if (rec2.error) throw new Error(rec2.error.message);
    }

    // Submit / lock revision
    const { error: subErr } = await supabase.rpc("submit_rfq_quote", { p_quote_id: quoteId });
    if (subErr) throw new Error(subErr.message);
  }

  async function getLatestQuoteId(): Promise<string> {
    const { data: latest, error: qErr } = await supabase
      .from("rfq_quotes")
      .select("id,version")
      .eq("rfq_id", rfqId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (qErr) throw new Error(qErr.message);
    if (!latest?.id) throw new Error("Could not find the newly created quote.");
    return String(latest.id);
  }

  // -----------------------------
  // Submit
  // -----------------------------
  const submit = async () => {
    setMsg(null);

    // Auth check
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) {
      setMsg({ kind: "err", text: "You are not logged in. Please login as vendor and try again." });
      return;
    }

    setLoading(true);
    try {
      // 0) If extra items exist, create them in rfq_items first
      const tempToReal = await createExtraRfqItems();

      // Build final item list: existing + newly created extras (with real rfq_item_id)
      const finalExisting = (props.items ?? []).map((it) => ({
        key: it.rfq_item_id,
        rfq_item_id: it.rfq_item_id,
        quantity: it.quantity ?? null,
      }));

      const finalExtras = extraItems
        .filter((d) => d.title.trim())
        .map((d) => {
          const realId = tempToReal[d.tempId];
          return {
            key: d.tempId,
            rfq_item_id: realId,
            quantity: toNum(d.qty) ?? null,
          };
        })
        .filter((x) => !!x.rfq_item_id);

      const allFinal = [...finalExisting, ...finalExtras];

      if (allFinal.length === 0) {
        setMsg({ kind: "err", text: "No quoteable items found." });
        return;
      }

      // payload for your existing RPC (keep compatibility)
      const payload = allFinal.map((x) => ({
        rfq_item_id: x.rfq_item_id,
        unit_price: Number(toNum(unitPrices[x.key] ?? "") ?? 0),
      }));

      const anyPositive = payload.some((x) => x.unit_price > 0);
      if (!anyPositive) {
        setMsg({ kind: "err", text: "Please enter at least one unit price greater than 0." });
        return;
      }

      const p_delivery_days = deliveryDays.trim() === "" ? null : Number(deliveryDays.trim());
      const p_valid_till = validTill.trim() === "" ? null : validTill.trim();
      const p_notes = notes.trim() === "" ? null : notes.trim();

      // 1) Create new quote version (existing RPC)
      const { error } = await supabase.rpc("submit_vendor_quote_v2", {
        p_rfq_id: rfqId,
        p_items: payload,
        p_valid_till,
        p_notes,
        p_delivery_days,
      });

      if (error) {
        setMsg({ kind: "err", text: error.message });
        return;
      }

      // 2) Finalize: per-item GST + totals for ALL items (including extras)
      const quoteId = await getLatestQuoteId();
      await finalizeQuote(quoteId, allFinal);

      setMsg({ kind: "ok", text: "Quote submitted successfully. Extra items were added to this RFQ." });
      window.location.reload();
    } catch (e: any) {
      setMsg({ kind: "err", text: e?.message ?? "Failed to submit quote." });
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div style={{ marginTop: 12, padding: 12, border: "1px solid #e5e7eb", borderRadius: 12 }}>
      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Submit Quote</h3>

      {/* Commercial fields */}
      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Delivery days</div>
          <input
            type="number"
            placeholder="e.g. 3"
            value={deliveryDays}
            onChange={(e) => setDeliveryDays(e.target.value)}
            style={{ padding: 8, width: 140 }}
          />
        </div>

        <div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Valid till</div>
          <input
            type="date"
            value={validTill}
            onChange={(e) => setValidTill(e.target.value)}
            style={{ padding: 8, width: 180 }}
          />
        </div>

        <div style={{ flex: "1 1 280px", minWidth: 260 }}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Notes</div>
          <input
            type="text"
            placeholder="Any terms / inclusions / exclusions..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ padding: 8, width: "100%" }}
          />
        </div>
      </div>

      {/* GST controls (header + default) */}
      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>GST Mode</div>
          <select value={gstMode} onChange={(e) => setGstMode(e.target.value as any)} style={{ padding: 8, width: 200 }}>
            <option value="exclusive">Exclusive (add GST)</option>
            <option value="inclusive">Inclusive (GST included)</option>
          </select>
        </div>

        <div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Default GST (%)</div>
          <input
            type="number"
            inputMode="decimal"
            value={defaultGstRate}
            onChange={(e) => setDefaultGstRate(e.target.value)}
            style={{ padding: 8, width: 160 }}
          />
        </div>

        <button type="button" onClick={applyDefaultToAllItems} style={{ padding: "8px 12px" }}>
          Apply default to all items
        </button>

        <div style={{ marginLeft: "auto", minWidth: 320 }}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Preview Totals (per-item GST)</div>
          <div style={{ padding: 10, border: "1px solid #e5e7eb", borderRadius: 10, background: "#fafafa" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Subtotal (excl.)</span>
              <strong>₹{preview.subtotalExcl.toFixed(2)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span>GST (sum of items)</span>
              <strong>₹{preview.gstSum.toFixed(2)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span>Grand Total</span>
              <strong>₹{preview.grand.toFixed(2)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Add extra items */}
      <div style={{ marginTop: 16, padding: 12, border: "1px dashed #d1d5db", borderRadius: 10, background: "#fbfbfb" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontWeight: 800 }}>Add extra items (manual)</div>
          <button type="button" onClick={addExtraItem} style={{ padding: "8px 12px" }}>
            + Add Item Row
          </button>
        </div>

        {extraItems.length > 0 ? (
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {extraItems.map((x) => (
              <div key={x.tempId} style={{ padding: 10, border: "1px solid #eee", borderRadius: 10, background: "white" }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
                  <div style={{ flex: "1 1 240px" }}>
                    <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Item title (required)</div>
                    <input
                      value={x.title}
                      onChange={(e) => updateExtra(x.tempId, { title: e.target.value })}
                      placeholder="e.g. TMT Bar 12mm"
                      style={{ padding: 8, width: "100%" }}
                    />
                  </div>

                  <div style={{ flex: "1 1 260px" }}>
                    <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Description</div>
                    <input
                      value={x.description}
                      onChange={(e) => updateExtra(x.tempId, { description: e.target.value })}
                      placeholder="optional"
                      style={{ padding: 8, width: "100%" }}
                    />
                  </div>

                  <div>
                    <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Qty</div>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={x.qty}
                      onChange={(e) => updateExtra(x.tempId, { qty: e.target.value })}
                      placeholder="e.g. 50"
                      style={{ padding: 8, width: 120 }}
                    />
                  </div>

                  <div>
                    <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>UOM</div>
                    <input
                      value={x.uom}
                      onChange={(e) => updateExtra(x.tempId, { uom: e.target.value })}
                      placeholder="pcs, kg..."
                      style={{ padding: 8, width: 120 }}
                    />
                  </div>

                  <button type="button" onClick={() => removeExtraItem(x.tempId)} style={{ padding: "8px 10px" }}>
                    Remove
                  </button>
                </div>

                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
                  Note: This will create a new RFQ item first, then include it in your quote.
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ marginTop: 10, fontSize: 13, opacity: 0.75 }}>
            If buyer forgot to add something, you can add it here before submitting your quote.
          </div>
        )}
      </div>

      {/* Items pricing table */}
      <div style={{ marginTop: 16 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
              <th style={{ padding: 8, textAlign: "left" }}>Item</th>
              <th style={{ padding: 8 }}>RFQ Qty</th>
              <th style={{ padding: 8 }}>Quote Qty</th>
              <th style={{ padding: 8 }}>Unit Price (₹)</th>
              <th style={{ padding: 8 }}>GST %</th>
              <th style={{ padding: 8 }}>Total</th>
            </tr>
          </thead>

          <tbody>
            {uiItems.map((it) => {
              const qDefault = it.quantity ?? 1;
              const q = toNum(qtys[it.key] ?? "") ?? qDefault;
              const up = toNum(unitPrices[it.key] ?? "") ?? 0;
              const baseLine = (q ?? 0) * (up ?? 0);

              const rate = toNum(itemGstRates[it.key] ?? "") ?? toNum(defaultGstRate) ?? 0;

              let gstAmt = 0;
              let total = 0;

              if (gstMode === "inclusive") {
                gstAmt = rate > 0 ? baseLine * (rate / (100 + rate)) : 0;
                total = baseLine;
              } else {
                gstAmt = rate > 0 ? baseLine * (rate / 100) : 0;
                total = baseLine + gstAmt;
              }

              return (
                <tr key={it.key} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: 8 }}>
                    {it.label}
                    {it.isExtra && <div style={{ fontSize: 11, opacity: 0.6 }}>(extra)</div>}
                  </td>

                  <td style={{ padding: 8, textAlign: "center" }}>
                    {it.quantity ?? "-"}
                  </td>

                  <td style={{ padding: 8 }}>
                    <input
                      type="number"
                      value={qtys[it.key] ?? ""}
                      placeholder={String(qDefault)}
                      onChange={(e) => setQty(it.key, e.target.value)}
                      style={{ width: 80, padding: 6 }}
                    />
                  </td>

                  <td style={{ padding: 8 }}>
                    <input
                      type="number"
                      value={unitPrices[it.key] ?? ""}
                      placeholder="0"
                      onChange={(e) => setUnitPrice(it.key, e.target.value)}
                      style={{ width: 100, padding: 6 }}
                    />
                  </td>

                  <td style={{ padding: 8 }}>
                    <input
                      type="number"
                      value={itemGstRates[it.key] ?? ""}
                      placeholder={defaultGstRate}
                      onChange={(e) => setItemGst(it.key, e.target.value)}
                      style={{ width: 70, padding: 6 }}
                    />
                  </td>

                  <td style={{ padding: 8, fontWeight: 700 }}>
                    ₹{r2(total).toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={submit} disabled={loading} style={{ padding: "8px 14px" }}>
          {loading ? "Submitting..." : "Submit Quote (New Version)"}
        </button>

        {msg && (
          <div style={{ alignSelf: "center", color: msg.kind === "err" ? "crimson" : "green" }}>
            {msg.text}
          </div>
        )}
      </div>

      <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
        Note: each submit creates a new version (v1, v2, v3...). After submit we save per-item GST + totals.
      </div>
    </div>
  );
}