// app/dashboard/buyer/rfqs/[id]/page.tsx
import Link from "next/link";
import { fetchBuyerQuoteCompare } from "@/lib/rfq/buyer-quote-compare/server";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody, CardFooter } from "@/components/ui/Card";
import { ActionButton } from "@/components/ui/ActionButton";
import { EmptyState } from "@/components/ui/EmptyState";

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "warn" | "ok";
}) {
  const base =
    "inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold border";
  const cls =
    tone === "warn"
      ? `${base} border-amber-200 bg-amber-50 text-amber-900`
      : tone === "ok"
      ? `${base} border-emerald-200 bg-emerald-50 text-emerald-900`
      : `${base} border-neutral-200 bg-neutral-50 text-neutral-800`;

  return <span className={cls}>{children}</span>;
}

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function money(x: number | null | undefined) {
  if (x == null || Number.isNaN(Number(x))) return "—";
  try {
    return Number(x).toLocaleString(undefined, { maximumFractionDigits: 2 });
  } catch {
    return String(x);
  }
}

export default async function BuyerRfqComparePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rfqId } = await params;

  const res = await fetchBuyerQuoteCompare(rfqId);

  if ((res as any).error) {
    const msg = (res as any).error as string;

    const looksLikeOwnershipMismatch =
      /access denied|not your rfq|created_by/i.test(msg);

    return (
      <main>
        <Container>
          <SectionHeader title="Compare Quotes" subtitle="" />
          <EmptyState message="Could not load quote comparison for this RFQ." />
          <div style={{ marginTop: 12, color: "crimson", fontWeight: 900 }}>
            {msg}
          </div>

          {looksLikeOwnershipMismatch ? (
            <div style={{ marginTop: 10, opacity: 0.85, fontSize: 13 }}>
              Note: Your RFQ create API stores buyer in{" "}
              <b>rfqs.requester_user_id</b>, but the compare helper is validating
              <b> rfqs.created_by</b>. We can fix this with a minimal change
              after you confirm which column is correct.
            </div>
          ) : null}

          <div
            style={{
              marginTop: 12,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <ActionButton href="/dashboard/buyer/rfqs" variant="secondary">
              ← Back to My RFQs
            </ActionButton>
            <Link
              href={`/dashboard/buyer/rfqs/${encodeURIComponent(rfqId)}`}
              style={{ fontWeight: 900 }}
            >
              Reload →
            </Link>
          </div>
        </Container>
      </main>
    );
  }

  const { rfq, revisionNo, items, vendors, quoteItems } = res as any;

  // ✅ Determine lowest TOTAL vendor (overall best price)
  let bestVendorId: string | null = null;
  let lowestTotal = Number.POSITIVE_INFINITY;

  for (const v of vendors ?? []) {
    const totalRaw = v?.grand_total;
    const total = totalRaw == null ? Number.NaN : Number(totalRaw);
    if (Number.isFinite(total) && total < lowestTotal) {
      lowestTotal = total;
      bestVendorId = String(v.vendor_id);
    }
  }

  // Build lookup: quote_id -> (rfq_item_id -> quoteItem)
  const qiByQuote: Record<string, Record<string, any>> = {};
  for (const qi of quoteItems ?? []) {
    const qid = String((qi as any).quote_id);
    const iid = String((qi as any).rfq_item_id);
    qiByQuote[qid] = qiByQuote[qid] || {};
    qiByQuote[qid][iid] = qi;
  }

  // ✅ BEST PRICE PER ITEM (row-wise):
  // itemId -> Set(vendorId) who have the lowest unit_price for that item (ties allowed)
  const bestVendorsByItem: Record<string, Set<string>> = {};

  for (const it of items ?? []) {
    const itemId = String(it.id);
    let minUnit = Number.POSITIVE_INFINITY;

    // 1) find min unit_price
    for (const v of vendors ?? []) {
      const qi = qiByQuote[String(v.quote_id)]?.[itemId];
      const unitRaw = qi?.unit_price;
      const unit = unitRaw == null ? Number.NaN : Number(unitRaw);
      if (Number.isFinite(unit) && unit < minUnit) minUnit = unit;
    }

    // 2) collect vendors with that min unit_price (ties)
    if (Number.isFinite(minUnit) && minUnit !== Number.POSITIVE_INFINITY) {
      const winners = new Set<string>();
      for (const v of vendors ?? []) {
        const qi = qiByQuote[String(v.quote_id)]?.[itemId];
        const unitRaw = qi?.unit_price;
        const unit = unitRaw == null ? Number.NaN : Number(unitRaw);
        if (Number.isFinite(unit) && unit === minUnit) {
          winners.add(String(v.vendor_id));
        }
      }
      bestVendorsByItem[itemId] = winners;
    } else {
      bestVendorsByItem[itemId] = new Set(); // no prices yet
    }
  }

  // Styles (overall best vendor column = green, best per item cell = amber)
  const bestColBg = "#f5fbf6";
  const bestColBorder = "2px solid rgba(16,185,129,0.55)";

  const rowBestBg = "#fff7ed"; // amber-ish
  const rowBestBorder = "1px solid rgba(245,158,11,0.6)";

  return (
    <main>
      <Container>
        <SectionHeader
          title="Compare Quotes"
          subtitle="Compare latest vendor quotes item-by-item."
        />

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <ActionButton href="/dashboard/buyer/rfqs" variant="secondary">
            ← My RFQs
          </ActionButton>

          <ActionButton href="/dashboard/buyer/enquiries" variant="secondary">
            Conversations Inbox
          </ActionButton>

          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <Pill>revision: {revisionNo ?? 1}</Pill>
            <Pill>vendors: {(vendors ?? []).length}</Pill>
            <Pill>items: {(items ?? []).length}</Pill>
          </div>
        </div>

        {/* RFQ Summary */}
        <Card>
          <CardBody>
            <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>
              {rfq?.public_id ? `RFQ ${rfq.public_id}` : "RFQ Summary"}
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: 10,
              }}
            >
              <Pill>{rfq?.status ?? "—"}</Pill>
              <Pill>Created: {fmtDateTime(rfq?.created_at)}</Pill>
              <Pill>Updated: {fmtDateTime(rfq?.updated_at)}</Pill>
              <Pill>
                {[rfq?.locality, rfq?.city, rfq?.district, rfq?.pincode]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </Pill>
            </div>

            <div style={{ color: "#5b6472", fontSize: 13 }}>
              Buyer: <b>{rfq?.contact_name ?? "—"}</b>
            </div>
          </CardBody>

          <CardFooter>
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                width: "100%",
              }}
            >
              <span style={{ fontWeight: 900 }}>
                RFQ ID: {String(rfq?.id ?? rfqId).slice(0, 8)}…
              </span>
              <span
                style={{ marginLeft: "auto", opacity: 0.75, fontSize: 13 }}
              >
                Shows latest quote per vendor (max version).
              </span>
            </div>
          </CardFooter>
        </Card>

        {/* Vendor cards */}
        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          {(vendors ?? []).length === 0 ? (
            <EmptyState message="No vendor quotes received yet." />
          ) : (
            <Card>
              <CardBody>
                <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 10 }}>
                  Vendor Quotes (Latest)
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  {(vendors ?? []).map((v: any) => {
                    const isBestOverall =
                      bestVendorId != null &&
                      String(v.vendor_id) === String(bestVendorId);

                    return (
                      <div
                        key={v.quote_id}
                        style={{
                          border: isBestOverall
                            ? "2px solid rgba(16,185,129,0.55)"
                            : "1px solid rgba(0,0,0,0.08)",
                          borderRadius: 12,
                          padding: 12,
                          background: isBestOverall ? bestColBg : "white",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                            marginBottom: 8,
                          }}
                        >
                          <Pill>
                            {v.vendor_business_name
                              ? v.vendor_business_name
                              : `${String(v.vendor_id).slice(0, 8)}…`}
                          </Pill>

                          {isBestOverall ? (
                            <Pill tone="ok">⭐ Best Price (Overall)</Pill>
                          ) : null}

                          <Pill>v{v.version}</Pill>
                          <Pill>Latest</Pill>

                          <Pill>{v.status ?? "—"}</Pill>
                          {v.is_outdated ? (
                            <Pill tone="warn">outdated</Pill>
                          ) : (
                            <Pill tone="ok">current</Pill>
                          )}
                          {v.delivery_days != null ? (
                            <Pill>{v.delivery_days} days</Pill>
                          ) : null}
                          {v.valid_till ? (
                            <Pill>valid till: {fmtDateTime(v.valid_till)}</Pill>
                          ) : null}
                          <Pill>
                            updated: {fmtDateTime(v.updated_at ?? v.created_at)}
                          </Pill>
                        </div>

                        {(v.vendor_locality || v.vendor_city) ? (
                          <div
                            style={{
                              color: "#5b6472",
                              fontSize: 12,
                              marginBottom: 8,
                            }}
                          >
                            {[v.vendor_locality, v.vendor_city]
                              .filter(Boolean)
                              .join(", ")}
                          </div>
                        ) : null}

                        <div
                          style={{
                            display: "flex",
                            gap: 16,
                            flexWrap: "wrap",
                            alignItems: "baseline",
                          }}
                        >
                          <div style={{ fontWeight: 900 }}>
                            Subtotal: {money(v.subtotal)}
                          </div>
                          <div style={{ fontWeight: 900 }}>
                            GST: {money(v.gst_amount)}
                          </div>
                          <div style={{ fontWeight: 900, fontSize: 16 }}>
                            Total: {money(v.grand_total)}
                          </div>
                          <div
                            style={{
                              marginLeft: "auto",
                              color: "#5b6472",
                              fontSize: 13,
                            }}
                          >
                            gst_mode: {v.gst_mode ?? "—"} • rate:{" "}
                            {v.gst_rate ?? "—"}
                          </div>
                        </div>

                        {v.notes ? (
                          <div
                            style={{
                              marginTop: 8,
                              color: "#111827",
                              fontSize: 13,
                              lineHeight: 1.6,
                            }}
                          >
                            <b>Notes:</b> {v.notes}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Comparison Table */}
        {(vendors ?? []).length > 0 && (items ?? []).length > 0 ? (
          <div style={{ marginTop: 12 }}>
            <Card>
              <CardBody>
                <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 10 }}>
                  Item-wise Comparison
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "6px 10px",
      borderRadius: 12,
      border: "1px solid rgba(16,185,129,0.35)",
      background: "#f5fbf6",
      fontSize: 12,
      fontWeight: 800,
      color: "#065f46",
    }}
  >
    <span
      style={{
        width: 10,
        height: 10,
        borderRadius: 12,
        background: "rgba(16,185,129,0.7)",
        display: "inline-block",
      }}
    />
    Best overall vendor
  </span>

  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "6px 10px",
      borderRadius: 12,
      border: "1px solid rgba(245,158,11,0.45)",
      background: "#fff7ed",
      fontSize: 12,
      fontWeight: 800,
      color: "#92400e",
    }}
  >
    <span
      style={{
        width: 10,
        height: 10,
        borderRadius: 12,
        background: "rgba(245,158,11,0.8)",
        display: "inline-block",
      }}
    />
    Best price per item
  </span>

  <span style={{ marginLeft: "auto", color: "#6b7280", fontSize: 12 }}>
    (Ties allowed)
  </span>
</div>

                <div style={{ overflowX: "auto", background: "#ffffff" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      minWidth: 900,
                    }}
                  >
                    <thead>
                      <tr>
                        <th
                          style={{
                            textAlign: "left",
                            padding: 10,
                            borderBottom: "1px solid rgba(0,0,0,0.08)",
                          }}
                        >
                          Item
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            padding: 10,
                            borderBottom: "1px solid rgba(0,0,0,0.08)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Qty / UOM
                        </th>

                        {(vendors ?? []).map((v: any) => {
                          const isBestOverall =
                            bestVendorId != null &&
                            String(v.vendor_id) === String(bestVendorId);

                          return (
                            <th
                              key={v.quote_id}
                              style={{
                                textAlign: "left",
                                padding: 10,
                                borderBottom: "1px solid rgba(0,0,0,0.08)",
                                background: isBestOverall
                                  ? bestColBg
                                  : "transparent",
                                borderLeft: isBestOverall
                                  ? bestColBorder
                                  : undefined,
                                borderRight: isBestOverall
                                  ? bestColBorder
                                  : undefined,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  gap: 6,
                                  flexWrap: "wrap",
                                  alignItems: "center",
                                }}
                              >
                                <Pill>
                                  {v.vendor_business_name
                                    ? v.vendor_business_name
                                    : `vendor ${String(v.vendor_id).slice(
                                        0,
                                        6
                                      )}…`}
                                </Pill>
                                <Pill>v{v.version}</Pill>
                                {isBestOverall ? <Pill tone="ok">⭐</Pill> : null}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>

                    <tbody>
                      {(items ?? []).map((it: any) => {
                        const itemId = String(it.id);
                        const rowWinners = bestVendorsByItem[itemId] || new Set();

                        return (
                          <tr key={it.id}>
                            <td
                              style={{
                                padding: 10,
                                borderBottom: "1px solid rgba(0,0,0,0.06)",
                              }}
                            >
                              <div style={{ fontWeight: 900 }}>
                                {it.title ?? "—"}
                              </div>
                              {it.description ? (
                                <div style={{ color: "#5b6472", fontSize: 13 }}>
                                  {it.description}
                                </div>
                              ) : null}
                            </td>

                            <td
                              style={{
                                padding: 10,
                                borderBottom: "1px solid rgba(0,0,0,0.06)",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {(it.qty ?? "—")} {it.uom ?? ""}
                            </td>

                            {(vendors ?? []).map((v: any) => {
                              const vendorId = String(v.vendor_id);

                              const isBestOverall =
                                bestVendorId != null &&
                                vendorId === String(bestVendorId);

                              const isBestForThisItem =
                                rowWinners.size > 0 && rowWinners.has(vendorId);

                              const qi =
                                qiByQuote[String(v.quote_id)]?.[itemId];
                              const unit = qi?.unit_price ?? null;
                              const line = qi?.line_total ?? null;

                              // Priority: Overall best (green) > Row best (amber)
                              const bg = isBestOverall
                                ? bestColBg
                                : isBestForThisItem
                                ? rowBestBg
                                : "transparent";

                              const borderLeft = isBestOverall
                                ? bestColBorder
                                : isBestForThisItem
                                ? rowBestBorder
                                : undefined;

                              const borderRight = isBestOverall
                                ? bestColBorder
                                : isBestForThisItem
                                ? rowBestBorder
                                : undefined;

                              return (
                                <td
                                  key={v.quote_id + ":" + it.id}
                                  style={{
                                    padding: 10,
                                    borderBottom:
                                      "1px solid rgba(0,0,0,0.06)",
                                    background: bg,
                                    borderLeft,
                                    borderRight,
                                  }}
                                >
                                  {qi ? (
                                    <div style={{ display: "grid", gap: 6 }}>
                                      <div
                                        style={{
                                          display: "flex",
                                          gap: 8,
                                          alignItems: "center",
                                          flexWrap: "wrap",
                                        }}
                                      >
                                        <div style={{ fontWeight: 900 }}>
                                          ₹ {money(unit)}
                                        </div>

                                        {isBestForThisItem ? (
                                          <Pill tone="ok">⭐ Best</Pill>
                                        ) : null}
                                      </div>

                                      <div
                                        style={{
                                          color: "#5b6472",
                                          fontSize: 13,
                                        }}
                                      >
                                        line: ₹ {money(line)}
                                      </div>
                                    </div>
                                  ) : (
                                    <span style={{ color: "#9aa3af" }}>—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardBody>

              <CardFooter>
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    width: "100%",
                  }}
                >
                  <Link
                    href={`/dashboard/buyer/rfqs/${encodeURIComponent(rfqId)}`}
                    style={{ fontWeight: 900 }}
                  >
                    Refresh comparison →
                  </Link>
                  <span
                    style={{
                      marginLeft: "auto",
                      color: "#5b6472",
                      fontSize: 13,
                    }}
                  >
                    Tip: If totals are blank, ask vendors to submit final totals
                    in their quote.
                  </span>
                </div>
              </CardFooter>
            </Card>
          </div>
        ) : null}
      </Container>
    </main>
  );
}