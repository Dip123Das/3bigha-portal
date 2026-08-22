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

type DemandTrend = "increasing" | "stable" | "falling" | "no_demand";

type ProcurementPriority =
  | "immediate"
  | "within_7_days"
  | "within_15_days"
  | "within_30_days"
  | "monitor";

type ForecastConfidence = "low" | "medium" | "high";

type DemandIntelligenceItem = {
  materialListingId: string;
  item: string;
  sku: string | null;
  unit: string;
  onHandStock: number;
  reservedStock: number;
  availableToSell: number;
  reorderLevel: number;
  purchasePrice: number;
  sellingPrice: number;
  demand7d: number;
  demand30d: number;
  demand90d: number;
  weightedAverageDailyDemand: number;
  forecastDemand7d: number;
  forecastDemand30d: number;
  forecastDemand90d: number;
  demandTrend: DemandTrend;
  stockRunwayDays: number | null;
  predictedDepletionDate: string | null;
  reservationPressurePercent: number;
  forecastConfidenceScore: number;
  forecastConfidence: ForecastConfidence;
  procurementPriority: ProcurementPriority;
  suggestedReplenishmentQuantity: number;
  suggestedReorderDate: string | null;
  stockStatus:
    | "out_of_stock"
    | "fully_reserved"
    | "low_stock"
    | "healthy";
  riskScore: number;
  riskLevel: RiskLevel;
};

type DemandIntelligenceTotals = {
  forecastDemand7d: number;
  forecastDemand30d: number;
  forecastDemand90d: number;
  suggestedReplenishmentQuantity: number;
  estimatedReplenishmentCost: number;
  minimumStockRunwayDays: number | null;
  averageForecastConfidence: number;
};

type DemandIntelligenceCounts = {
  immediate: number;
  within7Days: number;
  within15Days: number;
  within30Days: number;
  monitor: number;
  increasingDemand: number;
  noDemandHistory: number;
};

type DemandIntelligence = {
  source: string;
  generatedAt: string;
  totals: DemandIntelligenceTotals;
  counts: DemandIntelligenceCounts;
  items: DemandIntelligenceItem[];
  replenishmentItems: DemandIntelligenceItem[];
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
  demandIntelligence?: DemandIntelligence;
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
  const demandIntelligence = data?.demandIntelligence;

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
            <InventoryOperationsControlCenter
              healthScore={data.healthScore ?? 100}
              riskLevel={data.riskLevel}
              totals={totals}
              counts={counts}
              nextActions={nextActions}
            />

            <ForecastReplenishmentControlCenter
              demandIntelligence={demandIntelligence}
            />

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


function ForecastReplenishmentControlCenter({
  demandIntelligence,
}: {
  demandIntelligence: DemandIntelligence | undefined;
}) {
  if (!demandIntelligence) {
    return (
      <Card>
        <CardBody>
          <div style={{ fontSize: 18, fontWeight: 950 }}>
            Forecast & Replenishment
          </div>
          <div
            style={{
              marginTop: 8,
              color: "#64748b",
              fontSize: 13,
              fontWeight: 800,
              lineHeight: 1.55,
            }}
          >
            Demand forecasting is not available yet. Continue posting
            canonical stock movements to build reliable demand history.
          </div>
        </CardBody>
      </Card>
    );
  }

  const { totals, counts, replenishmentItems, items } =
    demandIntelligence;

  const fallingDemand = items.filter(
    (item) => item.demandTrend === "falling",
  ).length;

  const stableDemand = items.filter(
    (item) => item.demandTrend === "stable",
  ).length;

  const estimatedItemCost = (item: DemandIntelligenceItem) =>
    item.suggestedReplenishmentQuantity * item.purchasePrice;

  return (
    <section
      aria-labelledby="forecast-replenishment-control-center"
      style={{
        borderRadius: 22,
        border: "1px solid rgba(5,150,105,0.2)",
        background:
          "linear-gradient(135deg, #ecfdf5 0%, #ffffff 52%, #eff6ff 100%)",
        boxShadow: "0 18px 42px rgba(15,23,42,0.07)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: 16,
          background:
            "linear-gradient(135deg, #064e3b 0%, #047857 52%, #0369a1 100%)",
          color: "#ffffff",
        }}
      >
        <div
          id="forecast-replenishment-control-center"
          style={{ fontSize: 20, fontWeight: 950 }}
        >
          Forecast & Replenishment Control Center
        </div>

        <div
          style={{
            marginTop: 5,
            color: "#d1fae5",
            fontSize: 12,
            fontWeight: 800,
            lineHeight: 1.5,
          }}
        >
          Deterministic demand forecasting, stock runway and procurement
          priorities calculated from canonical inventory history.
        </div>
      </div>

      <div style={{ padding: 16, display: "grid", gap: 14 }}>
        <ErpKpiGrid>
          <ErpKpiCard
            label="Forecast — 7 Days"
            value={formatNumber(totals.forecastDemand7d)}
            helper="Expected short-term demand"
            tone="blue"
          />

          <ErpKpiCard
            label="Forecast — 30 Days"
            value={formatNumber(totals.forecastDemand30d)}
            helper="Expected monthly demand"
            tone="green"
          />

          <ErpKpiCard
            label="Forecast — 90 Days"
            value={formatNumber(totals.forecastDemand90d)}
            helper="Expected quarterly demand"
            tone="blue"
          />

          <ErpKpiCard
            label="Replenishment Cost"
            value={formatCurrency(totals.estimatedReplenishmentCost)}
            helper={`${formatNumber(
              totals.suggestedReplenishmentQuantity,
            )} total suggested quantity`}
            tone="orange"
          />

          <ErpKpiCard
            label="Minimum Stock Runway"
            value={
              totals.minimumStockRunwayDays == null
                ? "No demand"
                : `${formatNumber(
                    totals.minimumStockRunwayDays,
                  )} days`
            }
            helper="Earliest predicted stock depletion"
            tone={
              totals.minimumStockRunwayDays != null &&
              totals.minimumStockRunwayDays <= 7
                ? "red"
                : "green"
            }
          />

          <ErpKpiCard
            label="Forecast Confidence"
            value={`${formatNumber(
              totals.averageForecastConfidence,
            )}%`}
            helper="Average deterministic confidence"
            tone={
              totals.averageForecastConfidence >= 70
                ? "green"
                : totals.averageForecastConfidence >= 40
                  ? "orange"
                  : "red"
            }
          />

          <ErpKpiCard
            label="Immediate Procurement"
            value={counts.immediate}
            helper={`${counts.within7Days} required within 7 days`}
            tone={counts.immediate > 0 ? "red" : "green"}
          />

          <ErpKpiCard
            label="Replenishment Items"
            value={replenishmentItems.length}
            helper={`${counts.within15Days} within 15 days · ${counts.within30Days} within 30 days`}
            tone={replenishmentItems.length > 0 ? "orange" : "green"}
          />
        </ErpKpiGrid>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 10,
          }}
        >
          <SignalTile
            label="Increasing Demand"
            value={counts.increasingDemand}
            helper="Recent demand is accelerating"
            tone="#047857"
          />

          <SignalTile
            label="Stable Demand"
            value={stableDemand}
            helper="Demand remains consistent"
            tone="#0369a1"
          />

          <SignalTile
            label="Falling Demand"
            value={fallingDemand}
            helper="Recent demand is reducing"
            tone="#a16207"
          />

          <SignalTile
            label="Insufficient History"
            value={counts.noDemandHistory}
            helper="More canonical transactions required"
            tone="#7c3aed"
          />
        </div>

        <div>
          <div style={{ fontSize: 17, fontWeight: 950 }}>
            Replenishment Priority
          </div>

          <div
            style={{
              marginTop: 5,
              color: "#64748b",
              fontSize: 12,
              fontWeight: 800,
              lineHeight: 1.5,
            }}
          >
            Highest-priority procurement requirements ordered by urgency
            and suggested quantity.
          </div>

          {replenishmentItems.length === 0 ? (
            <div
              style={{
                marginTop: 12,
                border: "1px solid #bbf7d0",
                borderRadius: 12,
                padding: 12,
                background: "#f0fdf4",
                color: "#047857",
                fontSize: 13,
                fontWeight: 850,
              }}
            >
              No forecast-driven replenishment is currently required.
            </div>
          ) : (
            <div
              style={{
                marginTop: 12,
                overflowX: "auto",
                border: "1px solid #dbeafe",
                borderRadius: 14,
                background: "#ffffff",
              }}
            >
              <table
                style={{
                  width: "100%",
                  minWidth: 1080,
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {[
                      "Material",
                      "Available",
                      "Forecast 30d",
                      "Runway",
                      "Suggested Qty",
                      "Estimated Cost",
                      "Reorder Date",
                      "Priority",
                      "Confidence",
                      "Risk",
                    ].map((heading) => (
                      <th
                        key={heading}
                        style={{
                          padding: "11px 10px",
                          textAlign: "left",
                          borderBottom: "1px solid #e2e8f0",
                          color: "#475569",
                          fontSize: 11,
                          fontWeight: 950,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {replenishmentItems.slice(0, 30).map((item) => (
                    <tr key={item.materialListingId}>
                      <td
                        style={{
                          padding: "12px 10px",
                          borderBottom: "1px solid #f1f5f9",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 950,
                            color: "#0f172a",
                          }}
                        >
                          {item.item}
                        </div>
                        <div
                          style={{
                            marginTop: 3,
                            fontSize: 11,
                            fontWeight: 800,
                            color: "#64748b",
                          }}
                        >
                          {item.sku || "No SKU"}
                        </div>
                      </td>

                      <td style={forecastCellStyle}>
                        {formatNumber(item.availableToSell)} {item.unit}
                      </td>

                      <td style={forecastCellStyle}>
                        {formatNumber(item.forecastDemand30d)}{" "}
                        {item.unit}
                      </td>

                      <td style={forecastCellStyle}>
                        {item.stockRunwayDays == null
                          ? "No demand"
                          : `${formatNumber(
                              item.stockRunwayDays,
                            )} days`}
                      </td>

                      <td style={forecastCellStyle}>
                        {formatNumber(
                          item.suggestedReplenishmentQuantity,
                        )}{" "}
                        {item.unit}
                      </td>

                      <td style={forecastCellStyle}>
                        {formatCurrency(estimatedItemCost(item))}
                      </td>

                      <td style={forecastCellStyle}>
                        {item.suggestedReorderDate
                          ? new Date(
                              item.suggestedReorderDate,
                            ).toLocaleDateString("en-IN")
                          : "Monitor"}
                      </td>

                      <td style={forecastCellStyle}>
                        <Badge>
                          {humanize(item.procurementPriority)}
                        </Badge>
                      </td>

                      <td style={forecastCellStyle}>
                        {humanize(item.forecastConfidence)} ·{" "}
                        {formatNumber(
                          item.forecastConfidenceScore,
                        )}
                        %
                      </td>

                      <td style={forecastCellStyle}>
                        <Badge>{humanize(item.riskLevel)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div
          style={{
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
          Forecast quantities, runway, confidence, priority and
          replenishment values are deterministic. AI may explain these
          results but cannot replace or recalculate them.
        </div>
      </div>
    </section>
  );
}

const forecastCellStyle = {
  padding: "12px 10px",
  borderBottom: "1px solid #f1f5f9",
  color: "#334155",
  fontSize: 12,
  fontWeight: 850,
  whiteSpace: "nowrap",
} as const;

function InventoryOperationsControlCenter({
  healthScore,
  riskLevel,
  totals,
  counts,
  nextActions,
}: {
  healthScore: number;
  riskLevel: RiskLevel | undefined;
  totals: IntelligenceTotals;
  counts: IntelligenceCounts;
  nextActions: string[];
}) {
  const criticalAlerts =
    counts.highRisk + counts.outOfStock + counts.locationDrift;

  const warehouseStatus =
    counts.locationDrift > 0 ? "Reconcile" : "Balanced";

  const topPriority =
    nextActions[0] ||
    "Continue canonical stock posting and monitor inventory health.";

  return (
    <section
      aria-labelledby="inventory-operations-control-center"
      style={{
        borderRadius: 22,
        border: "1px solid rgba(30,64,175,0.18)",
        background:
          "linear-gradient(135deg, #eff6ff 0%, #ffffff 48%, #eef2ff 100%)",
        boxShadow: "0 18px 42px rgba(15,23,42,0.08)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: 16,
          background:
            "linear-gradient(135deg, #0f172a 0%, #172554 55%, #1d4ed8 100%)",
          color: "#ffffff",
        }}
      >
        <div
          id="inventory-operations-control-center"
          style={{
            fontSize: 20,
            fontWeight: 950,
          }}
        >
          Inventory Operations Control Center
        </div>

        <div
          style={{
            marginTop: 5,
            color: "#dbeafe",
            fontSize: 12,
            fontWeight: 800,
            lineHeight: 1.5,
          }}
        >
          Current stock health, availability, replenishment priorities and
          warehouse integrity from canonical inventory records.
        </div>
      </div>

      <div style={{ padding: 14, display: "grid", gap: 14 }}>
        <div>
          <ControlCenterHeading
            title="Executive Status"
            subtitle="What requires attention now"
          />

          <div
            style={{
              marginTop: 10,
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 9,
            }}
          >
            <ControlCenterMetric
              label="Inventory Health"
              value={`${healthScore}/100`}
              helper={humanize(riskLevel || "low")}
              tone={
                riskLevel === "high"
                  ? "red"
                  : riskLevel === "medium"
                    ? "orange"
                    : "green"
              }
            />

            <ControlCenterMetric
              label="Available to Sell"
              value={formatNumber(totals.availableToSell)}
              helper={`${formatNumber(totals.reserved)} reserved`}
              tone="blue"
            />

            <ControlCenterMetric
              label="Critical Alerts"
              value={criticalAlerts}
              helper={`${counts.highRisk} high risk`}
              tone={criticalAlerts > 0 ? "red" : "green"}
            />

            <ControlCenterMetric
              label="Reorder Queue"
              value={counts.reorderSuggestions}
              helper={`${counts.outOfStock} out of stock`}
              tone={
                counts.reorderSuggestions > 0 ? "orange" : "green"
              }
            />

            <ControlCenterMetric
              label="Reservation Load"
              value={`${formatNumber(
                totals.reservationCoverage,
              )}%`}
              helper={`${counts.fullyReserved} fully reserved`}
              tone={
                totals.reservationCoverage >= 80
                  ? "red"
                  : totals.reservationCoverage >= 50
                    ? "orange"
                    : "blue"
              }
            />

            <ControlCenterMetric
              label="Warehouse Status"
              value={warehouseStatus}
              helper={`${counts.locationDrift} allocation drift`}
              tone={counts.locationDrift > 0 ? "orange" : "green"}
            />
          </div>
        </div>

        <div>
          <ControlCenterHeading
            title="Recent Stock Operations"
            subtitle="Canonical 30-day movement and availability position"
          />

          <div
            style={{
              marginTop: 10,
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 9,
            }}
          >
            <ControlCenterMetric
              label="Goods Received"
              value={formatNumber(totals.stockIn30d)}
              helper="Stock in · last 30 days"
              tone="green"
            />

            <ControlCenterMetric
              label="Goods Issued"
              value={formatNumber(totals.stockOut30d)}
              helper="Stock out · last 30 days"
              tone="blue"
            />

            <ControlCenterMetric
              label="Reserved Quantity"
              value={formatNumber(totals.reserved)}
              helper="Active commitments"
              tone="violet"
            />

            <ControlCenterMetric
              label="Physical Stock"
              value={formatNumber(totals.onHand)}
              helper={`${totals.itemCount} inventory item(s)`}
              tone="slate"
            />
          </div>
        </div>

        <div>
          <ControlCenterHeading
            title="Forecast & Replenishment"
            subtitle="Deterministic forecasting will activate in INV-INT-03B"
          />

          <div
            style={{
              marginTop: 10,
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 9,
            }}
          >
            <ForecastPlaceholder
              label="7-Day Demand"
              description="Short-term depletion forecast"
            />
            <ForecastPlaceholder
              label="30-Day Demand"
              description="Monthly demand projection"
            />
            <ForecastPlaceholder
              label="90-Day Demand"
              description="Planning-horizon forecast"
            />
            <ForecastPlaceholder
              label="Lead-Time Risk"
              description="Supplier and replenishment exposure"
            />
          </div>
        </div>

        <div
          style={{
            borderRadius: 16,
            border: "1px solid #c7d2fe",
            background: "#eef2ff",
            padding: 13,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 950,
              color: "#3730a3",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Supervisor Priority
          </div>

          <div
            style={{
              marginTop: 7,
              color: "#1e293b",
              fontSize: 14,
              fontWeight: 900,
              lineHeight: 1.55,
            }}
          >
            {topPriority}
          </div>

          <div
            style={{
              marginTop: 7,
              color: "#64748b",
              fontSize: 11,
              fontWeight: 800,
              lineHeight: 1.5,
            }}
          >
            The priority is derived from deterministic inventory conditions.
            AI may explain the verified result but cannot change quantities,
            classifications or replenishment calculations.
          </div>
        </div>
      </div>
    </section>
  );
}

function ControlCenterHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 950,
          color: "#0f172a",
        }}
      >
        {title}
      </div>
      <div
        style={{
          marginTop: 3,
          color: "#64748b",
          fontSize: 11,
          fontWeight: 800,
        }}
      >
        {subtitle}
      </div>
    </div>
  );
}

function ControlCenterMetric({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: string | number;
  helper: string;
  tone: "blue" | "green" | "orange" | "red" | "violet" | "slate";
}) {
  const tones = {
    blue: ["#eff6ff", "#bfdbfe", "#1d4ed8"],
    green: ["#ecfdf5", "#bbf7d0", "#047857"],
    orange: ["#fff7ed", "#fed7aa", "#c2410c"],
    red: ["#fef2f2", "#fecaca", "#b91c1c"],
    violet: ["#f5f3ff", "#ddd6fe", "#6d28d9"],
    slate: ["#f8fafc", "#e2e8f0", "#334155"],
  } as const;

  const [background, border, color] = tones[tone];

  return (
    <div
      style={{
        minHeight: 96,
        borderRadius: 14,
        border: `1px solid ${border}`,
        background,
        padding: 12,
      }}
    >
      <div
        style={{
          color,
          fontSize: 11,
          fontWeight: 950,
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 7,
          color: "#0f172a",
          fontSize: 20,
          fontWeight: 950,
          lineHeight: 1,
        }}
      >
        {value}
      </div>

      <div
        style={{
          marginTop: 7,
          color: "#64748b",
          fontSize: 10,
          fontWeight: 800,
        }}
      >
        {helper}
      </div>
    </div>
  );
}

function ForecastPlaceholder({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  return (
    <div
      style={{
        minHeight: 92,
        borderRadius: 14,
        border: "1px dashed #94a3b8",
        background: "#f8fafc",
        padding: 12,
      }}
    >
      <div
        style={{
          color: "#334155",
          fontSize: 12,
          fontWeight: 950,
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 6,
          color: "#64748b",
          fontSize: 11,
          fontWeight: 800,
          lineHeight: 1.4,
        }}
      >
        {description}
      </div>

      <div
        style={{
          marginTop: 7,
          color: "#1d4ed8",
          fontSize: 10,
          fontWeight: 950,
        }}
      >
        INV-INT-03B
      </div>
    </div>
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
