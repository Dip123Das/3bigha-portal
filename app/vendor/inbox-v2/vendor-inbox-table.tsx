"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import type { VendorInboxRow } from "@/lib/rfq/vendor-inbox/server";
import { useInboxStore } from "./_store/inboxStore";

function fmtMoney(n?: number | null) {
  if (n == null) return "—";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(n));
  } catch {
    return `₹${n}`;
  }
}

function chip(text: string, tone: "neutral" | "blue" | "amber" | "green" = "neutral") {
  const base: React.CSSProperties = {
    display: "inline-block",
    padding: "2px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
    border: "1px solid #d1d5db",
    background: "#f9fafb",
    color: "#111827",
    lineHeight: "18px",
  };

  if (tone === "blue") {
    base.border = "1px solid #bfdbfe";
    base.background = "#eff6ff";
    base.color = "#1d4ed8";
  } else if (tone === "amber") {
    base.border = "1px solid #fde68a";
    base.background = "#fffbeb";
    base.color = "#92400e";
  } else if (tone === "green") {
    base.border = "1px solid #bbf7d0";
    base.background = "#ecfdf5";
    base.color = "#047857";
  }

  return <span style={base}>{text}</span>;
}

async function markViewed(rfqId: string) {
  try {
    await fetch("/api/vendor/rfq/mark-viewed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rfq_id: rfqId }),
      keepalive: true,
    });
  } catch {}
}

async function markViewedBulk(rfqIds: string[]) {
  await fetch("/api/vendor/rfq/mark-viewed-bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rfq_ids: rfqIds }),
    keepalive: true,
  });
}

type Props = {
  rows: VendorInboxRow[];
  onOpenRFQ?: (rfqId: string, href: string) => void | Promise<void>;
};

export default function VendorInboxTable(props: Props) {
  const { rows, onOpenRFQ } = props;

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);

  const visibleIds = useMemo(() => rows.map((r) => r.rfq_id), [rows]);
  const allVisibleSelected = useMemo(() => {
    if (!visibleIds.length) return false;
    return visibleIds.every((id) => selected[id]);
  }, [visibleIds, selected]);

  function toggleOne(id: string, v: boolean) {
    setSelected((prev) => ({ ...prev, [id]: v }));
  }

  function toggleAllVisible(v: boolean) {
    setSelected((prev) => {
      const next = { ...prev };
      for (const id of visibleIds) next[id] = v;
      return next;
    });
  }

  async function handleMarkSelectedAsRead() {
    if (!selectedIds.length) return;

    // ✅ optimistic unread removal
    const { changedIds } = useInboxStore.getState().bulkMarkReadOptimistic(selectedIds);

    // clear selection immediately
    setSelected({});

    try {
      await markViewedBulk(changedIds.length ? changedIds : selectedIds);
    } catch {
      // rollback only those that we actually changed
      useInboxStore.getState().rollbackBulkMarkRead(changedIds.length ? changedIds : selectedIds);
    }
  }

  if (!rows?.length) {
    return <div style={{ padding: 16, opacity: 0.7 }}>No RFQs found.</div>;
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
        <div
          style={{
            padding: 12,
            borderBottom: "1px solid #e5e7eb",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>RFQs</div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={(e) => toggleAllVisible(e.target.checked)}
              />
              Select all on page
            </label>

            <button
              type="button"
              onClick={handleMarkSelectedAsRead}
              disabled={!selectedIds.length}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid #d1d5db",
                background: selectedIds.length ? "white" : "#f3f4f6",
                cursor: selectedIds.length ? "pointer" : "not-allowed",
                fontWeight: 700,
              }}
            >
              Mark selected as read {selectedIds.length ? `(${selectedIds.length})` : ""}
            </button>

            {selectedIds.length ? (
              <button
                type="button"
                onClick={() => setSelected({})}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                  background: "white",
                }}
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>

        <div style={{ width: "100%", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: 12, width: 48 }}></th>
                <th style={{ padding: 12 }}>RFQ</th>
                <th style={{ padding: 12 }}>Module</th>
                <th style={{ padding: 12 }}>Buyer</th>
                <th style={{ padding: 12 }}>Locality</th>
                <th style={{ padding: 12 }}>Items</th>
                <th style={{ padding: 12 }}>Quote</th>
                <th style={{ padding: 12 }}>Amount</th>
                <th style={{ padding: 12 }}>Status</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => {
                const rfqLabel = r.rfq_no ?? r.rfq_id.slice(0, 8);

                const quoteChip =
                  r.latest_quote_version != null
                    ? `v${r.latest_quote_version}${r.latest_quote_status ? ` • ${r.latest_quote_status}` : ""}`
                    : null;

                const localityText =
                  (r.locality_name ?? "—") +
                  (r.pincode ? `, ${r.pincode}` : "") +
                  (r.district ? `, ${r.district}` : "");

                const isUnread = (r as any).is_unread === true;
                const isNew = (r as any).is_new === true;

                const href = `/vendor/inbox-v2/${r.rfq_id}`;

                return (
                  <tr
                    key={r.rfq_id}
                    style={{
                      borderBottom: "1px solid #f3f4f6",
                      background: isUnread ? "#ecfdf5" : "transparent",
                    }}
                  >
                    <td style={{ padding: 12 }}>
                      <input
                        type="checkbox"
                        checked={!!selected[r.rfq_id]}
                        onChange={(e) => toggleOne(r.rfq_id, e.target.checked)}
                      />
                    </td>

                    <td style={{ padding: 12, fontWeight: 800, whiteSpace: "nowrap" }}>
                      <Link
                        href={href}
                        onClick={async (e) => {
                          if (onOpenRFQ) {
                            e.preventDefault();
                            await onOpenRFQ(r.rfq_id, href);
                            return;
                          }
                          await markViewed(r.rfq_id);
                        }}
                        style={{ textDecoration: "none" }}
                      >
                        {rfqLabel}
                      </Link>

                      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                        {isUnread ? chip("Unread", "amber") : null}
                        {isNew ? chip("New RFQ", "green") : null}
                        {r.is_revised ? chip("Revised", "amber") : null}
                      </div>
                    </td>

                    <td style={{ padding: 12 }}>{chip(r.module ?? "—")}</td>
                    <td style={{ padding: 12 }}>{r.buyer_name ?? "—"}</td>
                    <td style={{ padding: 12 }}>{localityText}</td>
                    <td style={{ padding: 12 }}>{r.items_count ?? "—"}</td>
                    <td style={{ padding: 12 }}>{quoteChip ? chip(quoteChip, "blue") : "—"}</td>
                    <td style={{ padding: 12, whiteSpace: "nowrap" }}>{fmtMoney(r.latest_quote_grand_total)}</td>
                    <td style={{ padding: 12 }}>{chip(r.rfq_status ?? "—")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ padding: 10, fontSize: 12, opacity: 0.65 }}>
            Tip: Select RFQs → Mark selected as read (instant UI + saved).
          </div>
        </div>
      </div>
    </div>
  );
}