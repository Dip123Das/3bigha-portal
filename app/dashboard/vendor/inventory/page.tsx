"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody, CardFooter } from "@/components/ui/Card";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import VendorWorkMenu from "@/components/vendor-erp/VendorWorkMenu";
import InventoryTransactionPanel from "@/components/inventory/InventoryTransactionPanel";
import InventoryTransactionHistoryPanel from "@/components/inventory/InventoryTransactionHistoryPanel";
import InventoryReconciliationPanel from "@/components/inventory/InventoryReconciliationPanel";
import {
  ErpActionCard,
  ErpActionGrid,
  ErpActivityFeed,
  ErpAlertList,
  ErpKpiCard,
  ErpKpiGrid,
  ErpPanel,
} from "@/components/vendor-erp/VendorErpWidgets";

type MaterialListingRow = {
  id: string;
  vendor_user_id: string | null;
  title: string | null;
  local_name: string | null;
  sku: string | null;
  packaging_unit: string | null;
  attributes: any;
  status: string | null;
  is_active?: boolean | null;
  is_public?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function asNumber(v: unknown) {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function money(v: number) {
  return `₹ ${Math.round(v).toLocaleString("en-IN")}`;
}

function getInventory(row: MaterialListingRow) {
  return row.attributes?.inventory && typeof row.attributes.inventory === "object"
    ? row.attributes.inventory
    : null;
}

function getTitle(row: MaterialListingRow) {
  return row.title?.trim() || row.local_name?.trim() || row.sku?.trim() || "Stock Item";
}

function stockTone(current: number, reorder: number) {
  if (current <= 0) return { label: "Out of stock", bg: "#fef2f2", color: "#991b1b", border: "#fecaca" };
  if (reorder > 0 && current <= reorder) return { label: "Low stock", bg: "#fff7ed", color: "#9a3412", border: "#fed7aa" };
  return { label: "Available", bg: "#ecfdf5", color: "#047857", border: "#bbf7d0" };
}

export default function VendorInventoryPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<MaterialListingRow[]>([]);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const {
        data: { session },
        error: sessionErr,
      } = await supabase.auth.getSession();

      if (sessionErr) throw sessionErr;

      if (!session?.user?.id) {
        router.push(`/login?next=${encodeURIComponent("/dashboard/vendor/inventory")}`);
        return;
      }

      const { data, error } = await supabase
        .from("material_listings")
        .select("id,vendor_user_id,title,local_name,sku,packaging_unit,attributes,status,is_active,is_public,created_at,updated_at")
        .eq("vendor_user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(300);

      if (error) throw error;

      setRows((data || []) as MaterialListingRow[]);
    } catch (e: any) {
      setErr(e?.message || "Failed to load inventory.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inventoryRows = useMemo(() => {
    return rows.filter((row) => getInventory(row));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = q.trim().toLowerCase();

    if (!query) return inventoryRows;

    return inventoryRows.filter((row) => {
      const inv = getInventory(row);

      const text = [
        getTitle(row),
        row.local_name,
        row.sku,
        row.packaging_unit,
        row.status,
        inv?.sku_code,
        inv?.barcode,
        inv?.stock_unit,
        inv?.godown_no,
        inv?.room_no,
        inv?.rack_no,
        inv?.vehicle_type,
        inv?.vehicle_number,
        inv?.load_capacity,
      ]
        .map((x) => String(x ?? "").toLowerCase())
        .join(" ");

      return text.includes(query);
    });
  }, [inventoryRows, q]);

  const stats = useMemo(() => {
    let totalStock = 0;
    let stockValue = 0;
    let lowStock = 0;
    let outOfStock = 0;
    let vehicleLinked = 0;

    for (const row of inventoryRows) {
      const inv = getInventory(row);
      const current = asNumber(inv?.current_stock);
      const selling = asNumber(inv?.selling_price);
      const reorder = asNumber(inv?.reorder_level);

      totalStock += current;
      stockValue += current * selling;

      if (current <= 0) outOfStock += 1;
      else if (reorder > 0 && current <= reorder) lowStock += 1;

      if (inv?.vehicle_number || inv?.vehicle_type || inv?.load_capacity) vehicleLinked += 1;
    }

    return {
      totalItems: inventoryRows.length,
      totalStock,
      stockValue,
      lowStock,
      outOfStock,
      vehicleLinked,
    };
  }, [inventoryRows]);

  return (
    <main>
      <Container>
        <SectionHeader
          title="Inventory"
          subtitle="Manage stock first. Then create bills, assign fleet and send dispatch updates when needed."
        />

        <VendorWorkMenu />

        <div
          style={{ maxWidth: "100%", overflowX: "hidden", marginBottom: 16, borderRadius: 22, padding: 16, border: "1px solid #dbeafe", background: "linear-gradient(to bottom right, #eff6ff, #ffffff)" }}
        >
          <div style={{ maxWidth: "100%", overflowX: "hidden", fontSize: 11, fontWeight: 950, letterSpacing: "0.14em", textTransform: "uppercase", color: "#2563eb" }}>
            Daily Stock Work
          </div>

          <h1 style={{ maxWidth: "100%", overflowX: "hidden", marginTop: 8, marginBottom: 0, fontSize: 26, lineHeight: 1.15, fontWeight: 950, color: "#0f172a" }}>
            Start with your stock items
          </h1>

          <p style={{ maxWidth: "100%", overflowX: "hidden", marginTop: 8, fontSize: 14, lineHeight: 1.7, fontWeight: 700, color: "#475569" }}>
            Check available stock, add new stock, create bill, then move items to dispatch. This page is for shop owners, material suppliers and local vendors to manage daily inventory work easily.
          </p>

          <div style={{ maxWidth: "100%", overflowX: "hidden", marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
            {[
              ["1", "Stock Items", "See all stock records"],
              ["2", "Add Stock", "Add new material stock"],
              ["3", "Billing", "Create invoice or challan"],
              ["4", "Fleet", "Assign vehicle if needed"],
              ["5", "Dispatch", "Send material delivery update"],
            ].map(([step, title, detail]) => (
              <div
                key={title}
                style={{ maxWidth: "100%", overflowX: "hidden", border: "1px solid #bfdbfe", borderRadius: 16, padding: 12, background: "#ffffff" }}
              >
                <div style={{ maxWidth: "100%", overflowX: "hidden", fontSize: 12, fontWeight: 950, color: "#2563eb" }}>Step {step}</div>
                <div style={{ maxWidth: "100%", overflowX: "hidden", marginTop: 4, fontSize: 15, fontWeight: 950, color: "#0f172a" }}>{title}</div>
                <div style={{ maxWidth: "100%", overflowX: "hidden", marginTop: 4, fontSize: 12, fontWeight: 700, color: "#64748b" }}>{detail}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ maxWidth: "100%", overflowX: "hidden", display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
          <ActionButton href="/dashboard/vendor" variant="secondary">
            ← Vendor Dashboard
          </ActionButton>

          <ActionButton href="/materials/add?inventory=1" variant="primary">
            Add Stock Item →
          </ActionButton>

          <ActionButton href="/materials/my" variant="secondary">
            My Materials
          </ActionButton>

          <button
            type="button"
            onClick={() => load()}
            style={{ maxWidth: "100%", overflowX: "hidden", height: 40, padding: "0 14px", borderRadius: 12, border: "1px solid rgba(0, 0, 0.12)", background: "white", fontWeight: 900, cursor: "pointer" }}
          >
            Refresh
          </button>
        </div>

        <div
          style={{ maxWidth: "100%", overflowX: "hidden", marginBottom: 16, borderRadius: 22, padding: 12, border: "1px solid #c7d2fe", background: "#ffffff" }}
        >
          <div style={{ maxWidth: "100%", overflowX: "hidden", fontSize: 18, fontWeight: 950, color: "#3730a3" }}>
            Daily Inventory Steps
          </div>

          <div style={{ maxWidth: "100%", overflowX: "hidden", marginTop: 6, color: "#475569", fontSize: 13, fontWeight: 800, lineHeight: 1.6 }}>
            Use this area after checking your stock. Add inventory first, then create bill, assign vehicle and prepare dispatch only when required.
          </div>

          <div style={{ maxWidth: "100%", overflowX: "hidden", marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            <ActionButton href="/dashboard/vendor/inventory" variant="primary">
              📦 Stock Items
            </ActionButton>

            <ActionButton href="/materials/add?inventory=1" variant="secondary">
              ➕ Add Stock
            </ActionButton>

            <ActionButton href="/dashboard/vendor/billing" variant="secondary">
              🧾 Billing
            </ActionButton>

            <ActionButton href="/dashboard/vendor/fleet" variant="secondary">
              🚚 Fleet
            </ActionButton>

            <ActionButton href="/dashboard/vendor/dispatch" variant="secondary">
              📍 Dispatch
            </ActionButton>

            <ActionButton href="/dashboard/vendor/inventory-intelligence" variant="secondary">
              Stock Suggestions
            </ActionButton>

            <ActionButton href="/dashboard/vendor/inventory" variant="secondary">
              📊 Stock Updates
            </ActionButton>

            <ActionButton href="/dashboard/vendor/billing" variant="secondary">
              📄 PDF Invoice / Challan
            </ActionButton>
          </div>
        </div>

        <InventoryTransactionPanel
          materials={inventoryRows}
          onPosted={() => load()}
        />

        <InventoryReconciliationPanel
          materials={inventoryRows}
          onReconciled={() => load()}
        />

        <InventoryTransactionHistoryPanel
          materials={inventoryRows}
        />

        <ErpPanel
          title="Stock Overview"
          subtitle="Materials added from the normal vendor material form now become inventory items. Shop owners can search by SKU, barcode, godown, room, rack or vehicle number."
          tone="green"
        >
          <ErpKpiGrid>
            <ErpKpiCard label="Stock Items" value={stats.totalItems} helper="Available stock items" tone="green" />
            <ErpKpiCard label="Total Stock" value={stats.totalStock} helper="Available quantity" tone="blue" />
            <ErpKpiCard label="Stock Value" value={money(stats.stockValue)} helper="Current stock value" tone="violet" />
            <ErpKpiCard label="Low Stock" value={stats.lowStock} helper="May need refill" tone="orange" />
            <ErpKpiCard label="Out of Stock" value={stats.outOfStock} helper="Currently unavailable" tone="red" />
            <ErpKpiCard label="Ready for Delivery" value={stats.vehicleLinked} helper="Ready for delivery work" tone="slate" />
          </ErpKpiGrid>
        </ErpPanel>

                <ErpPanel
          title="Daily Inventory Actions"
          subtitle="Quick actions for stock, billing and delivery work."
          tone="blue"
        >
          <ErpActionGrid>
            <ErpActionCard
              title="Add Stock"
              description="Create new inventory records and stock entries."
              href="/dashboard/vendor/inventory"
              tone="green"
            />

            <ErpActionCard
              title="Generate Bill"
              description="Create billing directly from available inventory."
              href="/dashboard/vendor/billing"
              tone="orange"
            />

            <ErpActionCard
              title="Assign Dispatch"
              description="Move stock into delivery and logistics workflows."
              href="/dashboard/vendor/dispatch"
              tone="blue"
            />

            <ErpActionCard
              title="Link Vehicle"
              description="Assign inventory movement with transport vehicles."
              href="/dashboard/vendor/fleet"
              tone="violet"
            />

            <ErpActionCard
              title="Stock Suggestions"
              description="Review low stock, dead stock and reorder needs."
              href="/dashboard/vendor/inventory-intelligence"
              tone="blue"
            />
          </ErpActionGrid>

          <ErpAlertList
            alerts={[
              {
                label: `${stats.lowStock} inventory items are running low and may require reorder.`,
                tone: "orange",
              },
              {
                label: `${stats.outOfStock} inventory items are completely out of stock.`,
                tone: "red",
              },
              {
                label: `${stats.vehicleLinked} stock items are already connected with fleet operations.`,
                tone: "green",
              },
            ]}
          />
                  <ErpActivityFeed
            title="Recent Inventory Activity"
            items={[
              {
                label: "Inventory checked successfully.",
                meta: `${stats.totalItems} items scanned`,
                tone: "blue",
              },
              {
                label: "Low stock items reviewed.",
                meta: `${stats.lowStock} reorder signals found`,
                tone: "orange",
              },
              {
                label: "Delivery-ready stock reviewed.",
                meta: `${stats.vehicleLinked} stock records linked`,
                tone: "green",
              },
            ]}
          />
        </ErpPanel>

        <Card>
          <CardBody>
            <div style={{ maxWidth: "100%", overflowX: "hidden", display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ maxWidth: "100%", overflowX: "hidden", fontSize: 18, fontWeight: 950 }}>Stock Items</div>
                <div style={{ maxWidth: "100%", overflowX: "hidden", marginTop: 4, color: "#64748b", fontSize: 13, fontWeight: 800 }}>
                  Search products by name, SKU, barcode, godown, room, rack or vehicle number.
                </div>
              </div>

              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search inventory…"
                style={{ maxWidth: "100%", overflowX: "hidden", width: "min(360px, 100%)", padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0, 0, 0.15)", outline: "none", fontSize: 13, background: "#fff" }}
              />
            </div>

            <div style={{ maxWidth: "100%", overflowX: "hidden", marginTop: 14 }}>
              {loading ? (
                <EmptyState message="Loading inventory…" />
              ) : err ? (
                <EmptyState message={`Inventory load failed: ${err}`} />
              ) : inventoryRows.length === 0 ? (
                <EmptyState message="No inventory-linked material found yet. Add a material and keep inventory enabled." />
              ) : filteredRows.length === 0 ? (
                <EmptyState message="No matching inventory item found." />
              ) : (
                <div style={{ maxWidth: "100%", overflowX: "hidden", display: "grid", gap: 10 }}>
                  {filteredRows.map((row) => {
                    const inv = getInventory(row);
                    const current = asNumber(inv?.current_stock);
                    const reorder = asNumber(inv?.reorder_level);
                    const selling = asNumber(inv?.selling_price);
                    const tone = stockTone(current, reorder);

                    return (
                      <div
                        key={row.id}
                        style={{ maxWidth: "100%", overflowX: "hidden", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: "#fff", display: "grid", gap: 10 }}
                      >
                        <div style={{ maxWidth: "100%", overflowX: "hidden", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 10 }}>
                          <div>
                            <div style={{ maxWidth: "100%", overflowX: "hidden", fontSize: 16, fontWeight: 950, color: "#0f172a" }}>
                              {getTitle(row)}
                            </div>

                            <div style={{ maxWidth: "100%", overflowX: "hidden", marginTop: 5, display: "flex", flexWrap: "wrap", gap: 8 }}>
                              <Badge>Status: {row.status || "draft"}</Badge>
                              {inv?.sku_code ? <Badge>SKU: {inv.sku_code}</Badge> : null}
                              {inv?.barcode ? <Badge>Barcode: {inv.barcode}</Badge> : null}
                              {row.packaging_unit ? <Badge>Unit: {row.packaging_unit}</Badge> : null}
                            </div>
                          </div>

                          <div
                            style={{ maxWidth: "100%", overflowX: "hidden",
                              border: `1px solid ${tone.border}`,
                              background: tone.bg,
                              color: tone.color,
                              borderRadius: 12,
                              padding: "7px 11px",
                              fontSize: 12,
                              fontWeight: 950,
                              height: "fit-content",
                            }}
                          >
                            {tone.label}
                          </div>
                        </div>

                        <div style={{ maxWidth: "100%", overflowX: "hidden", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
                          <div style={{ maxWidth: "100%", overflowX: "hidden", border: "1px solid #e5e7eb", borderRadius: 12, padding: 10 }}>
                            <div style={{ maxWidth: "100%", overflowX: "hidden", fontSize: 12, fontWeight: 900, color: "#64748b" }}>Current Stock</div>
                            <div style={{ maxWidth: "100%", overflowX: "hidden", marginTop: 4, fontSize: 18, fontWeight: 950 }}>
                              {current} {inv?.stock_unit || ""}
                            </div>
                          </div>

                          <div style={{ maxWidth: "100%", overflowX: "hidden", border: "1px solid #e5e7eb", borderRadius: 12, padding: 10 }}>
                            <div style={{ maxWidth: "100%", overflowX: "hidden", fontSize: 12, fontWeight: 900, color: "#64748b" }}>Selling Price</div>
                            <div style={{ maxWidth: "100%", overflowX: "hidden", marginTop: 4, fontSize: 18, fontWeight: 950 }}>
                              {selling > 0 ? money(selling) : "—"}
                            </div>
                          </div>

                          <div style={{ maxWidth: "100%", overflowX: "hidden", border: "1px solid #e5e7eb", borderRadius: 12, padding: 10 }}>
                            <div style={{ maxWidth: "100%", overflowX: "hidden", fontSize: 12, fontWeight: 900, color: "#64748b" }}>Rack / Room / Godown</div>
                            <div style={{ maxWidth: "100%", overflowX: "hidden", marginTop: 4, fontSize: 14, fontWeight: 950 }}>
                              {[inv?.rack_no && `Rack ${inv.rack_no}`, inv?.room_no && `Room ${inv.room_no}`, inv?.godown_no && `Godown ${inv.godown_no}`]
                                .filter(Boolean)
                                .join(" • ") || "—"}
                            </div>
                          </div>

                          <div style={{ maxWidth: "100%", overflowX: "hidden", border: "1px solid #e5e7eb", borderRadius: 12, padding: 10 }}>
                            <div style={{ maxWidth: "100%", overflowX: "hidden", fontSize: 12, fontWeight: 900, color: "#64748b" }}>Vehicle / Capacity</div>
                            <div style={{ maxWidth: "100%", overflowX: "hidden", marginTop: 4, fontSize: 14, fontWeight: 950 }}>
                              {[inv?.vehicle_type, inv?.vehicle_number, inv?.load_capacity].filter(Boolean).join(" • ") || "—"}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardBody>

          <CardFooter>
            <div style={{ maxWidth: "100%", overflowX: "hidden", display: "flex", flexWrap: "wrap", gap: 10, width: "100%" }}>
              <ActionButton href="/materials/add?inventory=1" variant="primary">
                Add New Stock Item →
              </ActionButton>

              <Link href="/materials" style={{ maxWidth: "100%", overflowX: "hidden", fontWeight: 900, alignSelf: "center" }}>
                View public materials
              </Link>
            </div>
          </CardFooter>
        </Card>
      </Container>
    </main>
  );
}
