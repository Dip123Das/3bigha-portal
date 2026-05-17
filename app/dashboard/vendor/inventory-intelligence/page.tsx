"use client";

import { useEffect, useState } from "react";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErpKpiCard, ErpKpiGrid, ErpPanel } from "@/components/vendor-erp/VendorErpWidgets";
import { VendorErpNav } from "@/components/vendor-erp/VendorErpNav";

type Intelligence = {
  ok?: boolean;
  source?: string;
  summary?: string;
  riskLevel?: string;
  lowStock?: any[];
  fastMoving?: any[];
  deadStock?: any[];
  reorderSuggestions?: any[];
  billingInsight?: string;
  dispatchInsight?: string;
  fleetInsight?: string;
  nextActions?: string[];
  ai_error?: string;
  error?: string;
};

function itemName(row: any) {
  return row?.item || row?.name || row?.material_name || "Inventory item";
}

export default function InventoryIntelligencePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Intelligence | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const res = await fetch("/api/ai/inventory-intelligence", {
        cache: "no-store",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to load inventory intelligence.");
      }

      setData(json);
    } catch (e: any) {
      setErr(e?.message || "Failed to load inventory intelligence.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const lowStock = data?.lowStock || [];
  const fastMoving = data?.fastMoving || [];
  const deadStock = data?.deadStock || [];
  const reorderSuggestions = data?.reorderSuggestions || [];
  const nextActions = data?.nextActions || [];

  return (
    <main>
      <Container>
        <SectionHeader
          title="AI Inventory Intelligence"
          subtitle="Low stock alerts, fast-moving products, dead stock detection and reorder suggestions."
        />

        <VendorErpNav />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <ActionButton href="/dashboard/vendor" variant="secondary">
            ← Vendor Dashboard
          </ActionButton>

          <ActionButton href="/dashboard/vendor/inventory" variant="secondary">
            Inventory
          </ActionButton>

          <ActionButton href="/dashboard/vendor/billing" variant="secondary">
            Billing
          </ActionButton>

          <ActionButton href="/dashboard/vendor/dispatch" variant="secondary">
            Dispatch
          </ActionButton>

          <button
            type="button"
            onClick={() => void load()}
            style={{
              height: 40,
              padding: "0 14px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "white",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Refresh AI
          </button>
        </div>

        <ErpPanel
          title="AI ERP Supervisor"
          subtitle="AI reviews material stock, billing records, stock movement, dispatches and vehicle data to recommend business actions."
          tone="violet"
        >
          <ErpKpiGrid>
            <ErpKpiCard label="Risk Level" value={data?.riskLevel || "Auto"} helper="Operational risk signal" tone="violet" />
            <ErpKpiCard label="Low Stock" value={lowStock.length} helper="Reorder attention" tone="red" />
            <ErpKpiCard label="Fast Moving" value={fastMoving.length} helper="Demand signal" tone="green" />
            <ErpKpiCard label="Dead Stock" value={deadStock.length} helper="Slow inventory" tone="orange" />
            <ErpKpiCard label="Reorder Suggestions" value={reorderSuggestions.length} helper="AI action items" tone="blue" />
          </ErpKpiGrid>

          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Badge>Source: {data?.source || "—"}</Badge>
            <Badge>Risk: {data?.riskLevel || "auto"}</Badge>
          </div>

          {data?.ai_error ? (
            <div style={{ marginTop: 10, color: "#92400e", fontWeight: 900, fontSize: 13 }}>
              AI fallback used: {data.ai_error}
            </div>
          ) : null}
        </ErpPanel>

        {loading ? (
          <EmptyState message="Loading AI inventory intelligence…" />
        ) : err ? (
          <EmptyState message={`AI inventory intelligence failed: ${err}`} />
        ) : !data ? (
          <EmptyState message="No intelligence data available." />
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            <Card>
              <CardBody>
                <div style={{ fontSize: 18, fontWeight: 950 }}>AI Summary</div>
                <div style={{ marginTop: 8, color: "#475569", fontSize: 14, fontWeight: 800, lineHeight: 1.6 }}>
                  {data.summary || "Inventory intelligence is ready. Keep stock, bills and dispatches updated for better AI signals."}
                </div>
              </CardBody>
            </Card>

            <InsightSection
              title="Low Stock Alerts"
              tone="#dc2626"
              items={lowStock}
              empty="No low-stock alert detected."
              render={(row) => (
                <>
                  <div style={{ fontWeight: 950 }}>{itemName(row)}</div>
                  <div style={{ marginTop: 6, fontSize: 13, color: "#64748b", fontWeight: 800 }}>
                    Current: {row.current_stock ?? "—"} {row.unit || ""} • Reorder Level: {row.reorder_level ?? "—"}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13, color: "#7f1d1d", fontWeight: 800 }}>
                    {row.reason || "Stock is below safe level."}
                  </div>
                </>
              )}
            />

            <InsightSection
              title="Fast Moving Products"
              tone="#047857"
              items={fastMoving}
              empty="No fast-moving product signal yet."
              render={(row) => (
                <>
                  <div style={{ fontWeight: 950 }}>{itemName(row)}</div>
                  <div style={{ marginTop: 6, fontSize: 13, color: "#64748b", fontWeight: 800 }}>
                    Movement: {row.movement_quantity ?? row.quantity ?? "—"} {row.unit || ""}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13, color: "#065f46", fontWeight: 800 }}>
                    {row.reason || "Recent sales or stock-out movement is high."}
                  </div>
                </>
              )}
            />

            <InsightSection
              title="Dead / Slow Stock Detection"
              tone="#9a3412"
              items={deadStock}
              empty="No dead-stock risk detected."
              render={(row) => (
                <>
                  <div style={{ fontWeight: 950 }}>{itemName(row)}</div>
                  <div style={{ marginTop: 6, fontSize: 13, color: "#64748b", fontWeight: 800 }}>
                    Age: {row.age_days ?? "—"} days • Stock: {row.current_stock ?? "—"} {row.unit || ""}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13, color: "#7c2d12", fontWeight: 800 }}>
                    {row.reason || "No recent movement detected."}
                  </div>
                </>
              )}
            />

            <InsightSection
              title="AI Reorder Suggestions"
              tone="#1d4ed8"
              items={reorderSuggestions}
              empty="No reorder suggestion generated."
              render={(row) => (
                <>
                  <div style={{ fontWeight: 950 }}>{itemName(row)}</div>
                  <div style={{ marginTop: 6, fontSize: 13, color: "#64748b", fontWeight: 800 }}>
                    Suggested Qty: {row.suggested_quantity ?? row.quantity ?? "—"} {row.unit || ""}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13, color: "#1e40af", fontWeight: 800 }}>
                    {row.reason || "Suggested based on current stock and movement pattern."}
                  </div>
                </>
              )}
            />

            <Card>
              <CardBody>
                <div style={{ fontSize: 18, fontWeight: 950 }}>Operational Insights</div>

                <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                  <InsightMini title="Billing Insight" text={data.billingInsight || "Create bills regularly so stock movement remains accurate."} />
                  <InsightMini title="Dispatch Insight" text={data.dispatchInsight || "Assign vehicles to dispatches for better delivery visibility."} />
                  <InsightMini title="Fleet Insight" text={data.fleetInsight || "Keep vehicle status updated for better utilization intelligence."} />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div style={{ fontSize: 18, fontWeight: 950 }}>Next Best Actions</div>

                {nextActions.length === 0 ? (
                  <div style={{ marginTop: 10, color: "#64748b", fontSize: 13, fontWeight: 800 }}>
                    No action required now.
                  </div>
                ) : (
                  <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                    {nextActions.map((action, index) => (
                      <div
                        key={`${action}-${index}`}
                        style={{
                          border: "1px solid #e5e7eb",
                          borderRadius: 14,
                          padding: 12,
                          background: "#ffffff",
                          fontSize: 13,
                          fontWeight: 850,
                          color: "#334155",
                        }}
                      >
                        {index + 1}. {action}
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        )}
      </Container>
    </main>
  );
}

function InsightSection({
  title,
  tone,
  items,
  empty,
  render,
}: {
  title: string;
  tone: string;
  items: any[];
  empty: string;
  render: (row: any) => React.ReactNode;
}) {
  return (
    <Card>
      <CardBody>
        <div style={{ fontSize: 18, fontWeight: 950, color: tone }}>{title}</div>

        {items.length === 0 ? (
          <div style={{ marginTop: 10, color: "#64748b", fontSize: 13, fontWeight: 800 }}>
            {empty}
          </div>
        ) : (
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10 }}>
            {items.map((row, index) => (
              <div
                key={`${itemName(row)}-${index}`}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 16,
                  padding: 12,
                  background: "#ffffff",
                }}
              >
                {render(row)}
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function InsightMini({ title, text }: { title: string; text: string }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 12,
        background: "#ffffff",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 950, color: "#0f172a" }}>{title}</div>
      <div style={{ marginTop: 6, fontSize: 13, fontWeight: 800, color: "#64748b", lineHeight: 1.5 }}>
        {text}
      </div>
    </div>
  );
}