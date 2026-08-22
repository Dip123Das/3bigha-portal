"use client";

import { useEffect, useMemo, useState } from "react";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  ErpKpiCard,
  ErpKpiGrid,
  ErpPanel,
} from "@/components/vendor-erp/VendorErpWidgets";
import { VendorErpNav } from "@/components/vendor-erp/VendorErpNav";

type RiskLevel = "low" | "medium" | "high";

type IntelligenceItem = {
  materialListingId: string;
  item: string;
  sku: string | null;
  onHandStock: number;
  reservedStock: number;
  availableToSell: number;
  unit: string;
  reorderLevel: number;
  purchasePrice: number;
  sellingPrice: number;
  stockIn30d: number;
  stockOut30d: number;
  movementCount30d: number;
  lastMovementAt: string | null;
  stockAgeDays: number;
  stockStatus:
    | "out_of_stock"
    | "fully_reserved"
    | "low_stock"
    | "healthy";
  movementVelocity: "no_movement" | "slow" | "normal" | "fast";
  ageingStatus: "active" | "slow_moving" | "dead_stock";
  suggestedReorderQuantity: number;
  allocatedStock: number;
  allocationDrift: number;
  locationBalanced: boolean;
  riskScore: number;
  riskLevel: RiskLevel;
};

type IntelligenceTotals = {
  itemCount: number;
  onHand: number;
  reserved: number;
  availableToSell: number;
  reservationCoverage: number;
  stockIn30d: number;
  stockOut30d: number;
  inventoryCostValue: number;
  inventorySalesValue: number;
};

type IntelligenceCounts = {
  healthy: number;
  lowStock: number;
  outOfStock: number;
  fullyReserved: number;
  fastMoving: number;
  slowMoving: number;
  deadStock: number;
  reorderSuggestions: number;
  locationDrift: number;
  highRisk: number;
  mediumRisk: number;
};

type IntelligenceResponse = {
  ok?: boolean;
  source?: string;
  generatedAt?: string;
  summary?: string;
  managementSummary?: string;
  riskLevel?: RiskLevel;
  healthScore?: number;
  totals?: IntelligenceTotals;
  counts?: IntelligenceCounts;
  items?: IntelligenceItem[];
  lowStock?: IntelligenceItem[];
  outOfStock?: IntelligenceItem[];
  fullyReserved?: IntelligenceItem[];
  fastMoving?: IntelligenceItem[];
  slowMoving?: IntelligenceItem[];
  deadStock?: IntelligenceItem[];
  reorderSuggestions?: IntelligenceItem[];
  locationDrift?: IntelligenceItem[];
  highRisk?: IntelligenceItem[];
  billingInsight?: string;
  dispatchInsight?: string;
  fleetInsight?: string;
  nextActions?: string[];
  ai_error?: string;
  error?: string;
};

const emptyTotals: IntelligenceTotals = {
  itemCount: 0,
  onHand: 0,
  reserved: 0,
  availableToSell: 0,
  reservationCoverage: 0,
  stockIn30d: 0,
  stockOut30d: 0,
  inventoryCostValue: 0,
  inventorySalesValue: 0,
};

const emptyCounts: IntelligenceCounts = {
  healthy: 0,
  lowStock: 0,
  outOfStock: 0,
  fullyReserved: 0,
  fastMoving: 0,
  slowMoving: 0,
  deadStock: 0,
  reorderSuggestions: 0,
  locationDrift: 0,
  highRisk: 0,
  mediumRisk: 0,
};

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function humanize(value: string | null | undefined) {
  return String(value || "—")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function panelRiskTone(
  risk: RiskLevel | undefined,
): "green" | "orange" | "violet" {
  if (risk === "high") return "violet";
  if (risk === "medium") return "orange";
  return "green";
}

function kpiRiskTone(
  risk: RiskLevel | undefined,
): "green" | "orange" | "red" {
  if (risk === "high") return "red";
  if (risk === "medium") return "orange";
  return "green";
}

function itemKey(item: IntelligenceItem) {
  return item.materialListingId;
}

export default function InventoryIntelligencePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<IntelligenceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/inventory-intelligence", {
        cache: "no-store",
      });

      const json = (await response
        .json()
        .catch(() => null)) as IntelligenceResponse | null;

      if (!response.ok || !json?.ok) {
        throw new Error(
          json?.error || "Failed to load inventory intelligence.",
        );
      }

      setData(json);
    } catch (loadError: unknown) {
      setData(null);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load inventory intelligence.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const totals = data?.totals || emptyTotals;
  const counts = data?.counts || emptyCounts;
  const items = data?.items || [];
  const lowStock = data?.lowStock || [];
  const fastMoving = data?.fastMoving || [];
  const slowMoving = data?.slowMoving || [];
  const deadStock = data?.deadStock || [];
  const reorderSuggestions = data?.reorderSuggestions || [];
  const locationDrift = data?.locationDrift || [];
  const nextActions = data?.nextActions || [];

  const priorityItems = useMemo(
    () =>
      [...items]
        .sort((a, b) => b.riskScore - a.riskScore)
        .slice(0, 12),
    [items],
  );

  return (
    <main>
      <Container>
        <SectionHeader
          title="Inventory Intelligence"
          subtitle="Canonical stock health, availability, movement, ageing, reorder and location-integrity intelligence."
        />

        <VendorErpNav />

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: 14,
          }}
        >
          <button
            type="button"
            disabled={loading}
            onClick={() => void load()}
            style={{
              minHeight: 40,
              padding: "0 16px",
              borderRadius: 12,
              border: "1px solid rgba(15,23,42,0.14)",
              background: loading ? "#f1f5f9" : "#ffffff",
              color: "#0f172a",
              fontWeight: 900,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Refreshing…" : "Refresh Intelligence"}
          </button>
        </div>

        {loading ? (
          <EmptyState message="Loading canonical inventory intelligence…" />
        ) : error ? (
          <EmptyState message={`Inventory intelligence failed: ${error}`} />
        ) : !data ? (
          <EmptyState message="No inventory intelligence is available." />
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            <ErpPanel
              title="Inventory Health Control"
              subtitle="Deterministic metrics derived from canonical stock, reservations, transaction ledger and location allocations."
              tone={panelRiskTone(data.riskLevel)}
            >
              <ErpKpiGrid>
                <ErpKpiCard
                  label="Health Score"
                  value={`${data.healthScore ?? 100}/100`}
                  helper="Higher is healthier"
                  tone={kpiRiskTone(data.riskLevel)}
                />

                <ErpKpiCard
                  label="Risk Level"
                  value={humanize(data.riskLevel)}
                  helper={`${counts.highRisk} high-risk item(s)`}
                  tone={kpiRiskTone(data.riskLevel)}
                />

                <ErpKpiCard
                  label="Available to Sell"
                  value={formatNumber(totals.availableToSell)}
                  helper={`${formatNumber(totals.reserved)} reserved`}
                  tone="blue"
                />

                <ErpKpiCard
                  label="Stock Attention"
                  value={counts.lowStock}
                  helper={`${counts.outOfStock} out of stock`}
                  tone="red"
                />
              </ErpKpiGrid>

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <Badge>Source: {data.source || "canonical"}</Badge>
                <Badge>Items: {totals.itemCount}</Badge>
                <Badge>
                  Reservation coverage:{" "}
                  {formatNumber(totals.reservationCoverage)}%
                </Badge>
                <Badge>
                  Generated:{" "}
                  {data.generatedAt
                    ? new Date(data.generatedAt).toLocaleString("en-IN")
                    : "—"}
                </Badge>
              </div>

              {data.ai_error ? (
                <div
                  style={{
                    marginTop: 10,
                    color: "#92400e",
                    fontWeight: 850,
                    fontSize: 13,
                  }}
                >
                  AI explanation was unavailable. Canonical deterministic
                  intelligence remains active.
                </div>
              ) : null}
            </ErpPanel>

            <Card>
              <CardBody>
                <div style={{ fontSize: 18, fontWeight: 950 }}>
                  Stock Availability
                </div>

                <div
                  style={{
                    marginTop: 12,
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(170px, 1fr))",
                    gap: 10,
                  }}
                >
                  <MetricTile
                    label="On Hand"
                    value={formatNumber(totals.onHand)}
                    helper="Canonical physical stock"
                  />
                  <MetricTile
                    label="Reserved"
                    value={formatNumber(totals.reserved)}
                    helper="Active commitments"
                  />
                  <MetricTile
                    label="Available to Sell"
                    value={formatNumber(totals.availableToSell)}
                    helper="On hand minus reserved"
                  />
                  <MetricTile
                    label="Stock In — 30 Days"
                    value={formatNumber(totals.stockIn30d)}
                    helper="Canonical inward movement"
                  />
                  <MetricTile
                    label="Stock Out — 30 Days"
                    value={formatNumber(totals.stockOut30d)}
                    helper="Canonical outward movement"
                  />
                  <MetricTile
                    label="Location Drift"
                    value={counts.locationDrift}
                    helper="Items needing reconciliation"
                  />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div style={{ fontSize: 18, fontWeight: 950 }}>
                  Inventory Risk Signals
                </div>

                <div
                  style={{
                    marginTop: 12,
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(185px, 1fr))",
                    gap: 10,
                  }}
                >
                  <SignalTile
                    label="Healthy"
                    value={counts.healthy}
                    helper="No immediate stock risk"
                    tone="#047857"
                  />
                  <SignalTile
                    label="Low Stock"
                    value={counts.lowStock}
                    helper="Includes reserved and stock-out risks"
                    tone="#dc2626"
                  />
                  <SignalTile
                    label="Fully Reserved"
                    value={counts.fullyReserved}
                    helper="No free sellable quantity"
                    tone="#c2410c"
                  />
                  <SignalTile
                    label="Fast Moving"
                    value={counts.fastMoving}
                    helper="High 30-day outward movement"
                    tone="#0369a1"
                  />
                  <SignalTile
                    label="Slow Moving"
                    value={counts.slowMoving}
                    helper="No quantity movement for 30+ days"
                    tone="#a16207"
                  />
                  <SignalTile
                    label="Dead Stock"
                    value={counts.deadStock}
                    helper="No quantity movement for 90+ days"
                    tone="#9f1239"
                  />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div style={{ fontSize: 18, fontWeight: 950 }}>
                  Inventory Valuation
                </div>

                <div
                  style={{
                    marginTop: 12,
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 10,
                  }}
                >
                  <MetricTile
                    label="Estimated Cost Value"
                    value={formatCurrency(totals.inventoryCostValue)}
                    helper="On-hand quantity × purchase price"
                  />
                  <MetricTile
                    label="Estimated Sales Value"
                    value={formatCurrency(totals.inventorySalesValue)}
                    helper="On-hand quantity × selling price"
                  />
                  <MetricTile
                    label="Potential Gross Spread"
                    value={formatCurrency(
                      Math.max(
                        totals.inventorySalesValue -
                          totals.inventoryCostValue,
                        0,
                      ),
                    )}
                    helper="Before tax, expenses and losses"
                  />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div style={{ fontSize: 18, fontWeight: 950 }}>
                  Management Summary
                </div>

                <div
                  style={{
                    marginTop: 8,
                    color: "#475569",
                    fontSize: 14,
                    fontWeight: 800,
                    lineHeight: 1.65,
                  }}
                >
                  {data.managementSummary ||
                    data.summary ||
                    "Canonical inventory intelligence is ready."}
                </div>

                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid #dbeafe",
                    background: "#eff6ff",
                    color: "#1e3a8a",
                    fontSize: 12,
                    fontWeight: 850,
                    lineHeight: 1.55,
                  }}
                >
                  Counts, quantities, classifications, health scores and
                  reorder quantities are deterministic. AI is used only to
                  explain the verified metrics.
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div style={{ fontSize: 18, fontWeight: 950 }}>
                  Priority Inventory Items
                </div>

                {priorityItems.length === 0 ? (
                  <div
                    style={{
                      marginTop: 10,
                      color: "#64748b",
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    No canonical material inventory items were found.
                  </div>
                ) : (
                  <div
                    style={{
                      marginTop: 12,
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    {priorityItems.map((item) => (
                      <InventoryItemRow
                        key={itemKey(item)}
                        item={item}
                      />
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div style={{ fontSize: 18, fontWeight: 950 }}>
                  Reorder Recommendations
                </div>

                {reorderSuggestions.length === 0 ? (
                  <div
                    style={{
                      marginTop: 10,
                      color: "#64748b",
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    No canonical reorder recommendation is required.
                  </div>
                ) : (
                  <div
                    style={{
                      marginTop: 12,
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    {reorderSuggestions.slice(0, 20).map((item) => (
                      <div
                        key={itemKey(item)}
                        style={{
                          border: "1px solid #dbeafe",
                          borderRadius: 12,
                          padding: 12,
                          background: "#f8fbff",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            flexWrap: "wrap",
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 950,
                                color: "#0f172a",
                              }}
                            >
                              {item.item}
                            </div>
                            <div
                              style={{
                                marginTop: 4,
                                fontSize: 12,
                                fontWeight: 800,
                                color: "#64748b",
                              }}
                            >
                              Available:{" "}
                              {formatNumber(item.availableToSell)}{" "}
                              {item.unit} · Reorder level:{" "}
                              {formatNumber(item.reorderLevel)}{" "}
                              {item.unit}
                            </div>
                          </div>

                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 950,
                              color: "#1d4ed8",
                            }}
                          >
                            Reorder{" "}
                            {formatNumber(
                              item.suggestedReorderQuantity,
                            )}{" "}
                            {item.unit}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div style={{ fontSize: 18, fontWeight: 950 }}>
                  Location Integrity
                </div>

                {locationDrift.length === 0 ? (
                  <div
                    style={{
                      marginTop: 10,
                      color: "#047857",
                      fontSize: 13,
                      fontWeight: 850,
                    }}
                  >
                    All material location allocations are balanced with
                    canonical stock.
                  </div>
                ) : (
                  <div
                    style={{
                      marginTop: 12,
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    {locationDrift.slice(0, 20).map((item) => (
                      <div
                        key={itemKey(item)}
                        style={{
                          border: "1px solid #fed7aa",
                          borderRadius: 12,
                          padding: 12,
                          background: "#fff7ed",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 950,
                            color: "#9a3412",
                          }}
                        >
                          {item.item}
                        </div>
                        <div
                          style={{
                            marginTop: 5,
                            fontSize: 12,
                            fontWeight: 800,
                            color: "#7c2d12",
                          }}
                        >
                          Canonical stock:{" "}
                          {formatNumber(item.onHandStock)} {item.unit} ·
                          Allocated: {formatNumber(item.allocatedStock)}{" "}
                          {item.unit} · Drift:{" "}
                          {formatNumber(item.allocationDrift)} {item.unit}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div style={{ fontSize: 18, fontWeight: 950 }}>
                  Operational Context
                </div>

                <div
                  style={{
                    marginTop: 12,
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(230px, 1fr))",
                    gap: 10,
                  }}
                >
                  <InsightTile
                    title="Billing"
                    text={
                      data.billingInsight ||
                      "No billing insight is available."
                    }
                  />
                  <InsightTile
                    title="Dispatch"
                    text={
                      data.dispatchInsight ||
                      "No dispatch insight is available."
                    }
                  />
                  <InsightTile
                    title="Fleet"
                    text={
                      data.fleetInsight ||
                      "No fleet insight is available."
                    }
                  />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div style={{ fontSize: 18, fontWeight: 950 }}>
                  Next Best Actions
                </div>

                <div
                  style={{
                    marginTop: 12,
                    display: "grid",
                    gap: 8,
                  }}
                >
                  {nextActions.length === 0 ? (
                    <div
                      style={{
                        color: "#64748b",
                        fontSize: 13,
                        fontWeight: 800,
                      }}
                    >
                      No urgent inventory action is required.
                    </div>
                  ) : (
                    nextActions.map((action, index) => (
                      <div
                        key={`${action}-${index}`}
                        style={{
                          border: "1px solid #e2e8f0",
                          borderRadius: 12,
                          padding: 12,
                          background: "#ffffff",
                          color: "#334155",
                          fontSize: 13,
                          fontWeight: 850,
                          lineHeight: 1.5,
                        }}
                      >
                        {index + 1}. {action}
                      </div>
                    ))
                  )}
                </div>
              </CardBody>
            </Card>

            <div
              style={{
                display: "none",
              }}
              aria-hidden="true"
            >
              {lowStock.length}
              {fastMoving.length}
              {slowMoving.length}
              {deadStock.length}
            </div>
          </div>
        )}
      </Container>
    </main>
  );
}

function MetricTile({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: 12,
        background: "#ffffff",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 850,
          color: "#64748b",
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 5,
          fontSize: 20,
          fontWeight: 950,
          color: "#0f172a",
        }}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: 4,
          fontSize: 11,
          fontWeight: 750,
          color: "#94a3b8",
        }}
      >
        {helper}
      </div>
    </div>
  );
}

function SignalTile({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: number;
  helper: string;
  tone: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: 12,
        background: "#ffffff",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 850,
          color: "#64748b",
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 5,
          fontSize: 22,
          fontWeight: 950,
          color: tone,
        }}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: 4,
          fontSize: 11,
          fontWeight: 750,
          color: "#94a3b8",
        }}
      >
        {helper}
      </div>
    </div>
  );
}

function InventoryItemRow({ item }: { item: IntelligenceItem }) {
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: 12,
        background: "#ffffff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 950,
              color: "#0f172a",
            }}
          >
            {item.item}
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 12,
              fontWeight: 800,
              color: "#64748b",
            }}
          >
            {item.sku ? `SKU: ${item.sku} · ` : ""}
            {humanize(item.stockStatus)} ·{" "}
            {humanize(item.movementVelocity)} movement ·{" "}
            {humanize(item.ageingStatus)}
          </div>
        </div>

        <div
          style={{
            textAlign: "right",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 950,
              color:
                item.riskLevel === "high"
                  ? "#dc2626"
                  : item.riskLevel === "medium"
                    ? "#c2410c"
                    : "#047857",
            }}
          >
            Risk {item.riskScore}/100
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 11,
              fontWeight: 800,
              color: "#64748b",
            }}
          >
            Stock age: {item.stockAgeDays} day(s)
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 10,
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(125px, 1fr))",
          gap: 8,
        }}
      >
        <CompactMetric
          label="On Hand"
          value={`${formatNumber(item.onHandStock)} ${item.unit}`}
        />
        <CompactMetric
          label="Reserved"
          value={`${formatNumber(item.reservedStock)} ${item.unit}`}
        />
        <CompactMetric
          label="Available"
          value={`${formatNumber(item.availableToSell)} ${item.unit}`}
        />
        <CompactMetric
          label="Out — 30 Days"
          value={`${formatNumber(item.stockOut30d)} ${item.unit}`}
        />
      </div>
    </div>
  );
}

function CompactMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        borderRadius: 10,
        padding: 9,
        background: "#f8fafc",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 850,
          color: "#94a3b8",
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 3,
          fontSize: 12,
          fontWeight: 900,
          color: "#334155",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function InsightTile({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: 12,
        background: "#ffffff",
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 950,
          color: "#0f172a",
        }}
      >
        {title}
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: 13,
          fontWeight: 800,
          color: "#64748b",
          lineHeight: 1.55,
        }}
      >
        {text}
      </div>
    </div>
  );
}
