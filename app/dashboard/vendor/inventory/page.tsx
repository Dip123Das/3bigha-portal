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
  return row.title?.trim() || row.local_name?.trim() || row.sku?.trim() || "Inventory Item";
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
          title="Vendor Inventory"
          subtitle="Inventory foundation linked with your existing material listings."
        />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <ActionButton href="/dashboard/vendor" variant="secondary">
            ← Vendor Dashboard
          </ActionButton>

          <ActionButton href="/materials/add?inventory=1" variant="primary">
            Add Inventory Item →
          </ActionButton>

          <ActionButton href="/materials/my" variant="secondary">
            My Materials
          </ActionButton>

          <button
            type="button"
            onClick={() => load()}
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
            Refresh
          </button>
        </div>

        <div
          style={{
            marginBottom: 16,
            borderRadius: 22,
            padding: 16,
            border: "1px solid #bbf7d0",
            background: "linear-gradient(135deg, #ecfdf5, #ffffff)",
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 950, color: "#064e3b" }}>
            Inventory Operating Center
          </div>

          <div style={{ marginTop: 6, fontSize: 13, color: "#475569", fontWeight: 800, lineHeight: 1.6 }}>
            Materials added from the normal vendor material form now become inventory items.
            Shop owners can search by SKU, barcode, godown, room, rack or vehicle number.
          </div>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            <div style={{ border: "1px solid #bbf7d0", borderRadius: 16, padding: 12, background: "#fff" }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: "#047857" }}>Inventory Items</div>
              <div style={{ marginTop: 4, fontSize: 28, fontWeight: 950 }}>{stats.totalItems}</div>
            </div>

            <div style={{ border: "1px solid #dbeafe", borderRadius: 16, padding: 12, background: "#fff" }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: "#1d4ed8" }}>Total Stock</div>
              <div style={{ marginTop: 4, fontSize: 28, fontWeight: 950 }}>{stats.totalStock}</div>
            </div>

            <div style={{ border: "1px solid #e0e7ff", borderRadius: 16, padding: 12, background: "#fff" }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: "#4338ca" }}>Stock Value</div>
              <div style={{ marginTop: 4, fontSize: 24, fontWeight: 950 }}>{money(stats.stockValue)}</div>
            </div>

            <div style={{ border: "1px solid #fed7aa", borderRadius: 16, padding: 12, background: "#fff7ed" }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: "#9a3412" }}>Low Stock</div>
              <div style={{ marginTop: 4, fontSize: 28, fontWeight: 950 }}>{stats.lowStock}</div>
            </div>

            <div style={{ border: "1px solid #fecaca", borderRadius: 16, padding: 12, background: "#fef2f2" }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: "#991b1b" }}>Out of Stock</div>
              <div style={{ marginTop: 4, fontSize: 28, fontWeight: 950 }}>{stats.outOfStock}</div>
            </div>

            <div style={{ border: "1px solid #bae6fd", borderRadius: 16, padding: 12, background: "#f0f9ff" }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: "#0369a1" }}>Vehicle Linked</div>
              <div style={{ marginTop: 4, fontSize: 28, fontWeight: 950 }}>{stats.vehicleLinked}</div>
            </div>
          </div>
        </div>

        <Card>
          <CardBody>
            <div style={{ display: "flex", gap: 12, justifyContent: "space-between", flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 950 }}>Inventory Items</div>
                <div style={{ marginTop: 4, color: "#64748b", fontSize: 13, fontWeight: 800 }}>
                  Search products by name, SKU, barcode, godown, room, rack or vehicle number.
                </div>
              </div>

              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search inventory…"
                style={{
                  width: "min(360px, 100%)",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.15)",
                  outline: "none",
                  fontSize: 13,
                  background: "#fff",
                }}
              />
            </div>

            <div style={{ marginTop: 14 }}>
              {loading ? (
                <EmptyState message="Loading inventory…" />
              ) : err ? (
                <EmptyState message={`Inventory load failed: ${err}`} />
              ) : inventoryRows.length === 0 ? (
                <EmptyState message="No inventory-linked material found yet. Add a material and keep inventory enabled." />
              ) : filteredRows.length === 0 ? (
                <EmptyState message="No matching inventory item found." />
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {filteredRows.map((row) => {
                    const inv = getInventory(row);
                    const current = asNumber(inv?.current_stock);
                    const reorder = asNumber(inv?.reorder_level);
                    const selling = asNumber(inv?.selling_price);
                    const tone = stockTone(current, reorder);

                    return (
                      <div
                        key={row.id}
                        style={{
                          border: "1px solid #e5e7eb",
                          borderRadius: 16,
                          padding: 12,
                          background: "#fff",
                          display: "grid",
                          gap: 10,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 950, color: "#0f172a" }}>
                              {getTitle(row)}
                            </div>

                            <div style={{ marginTop: 5, display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <Badge>Status: {row.status || "draft"}</Badge>
                              {inv?.sku_code ? <Badge>SKU: {inv.sku_code}</Badge> : null}
                              {inv?.barcode ? <Badge>Barcode: {inv.barcode}</Badge> : null}
                              {row.packaging_unit ? <Badge>Unit: {row.packaging_unit}</Badge> : null}
                            </div>
                          </div>

                          <div
                            style={{
                              border: `1px solid ${tone.border}`,
                              background: tone.bg,
                              color: tone.color,
                              borderRadius: 999,
                              padding: "7px 11px",
                              fontSize: 12,
                              fontWeight: 950,
                              height: "fit-content",
                            }}
                          >
                            {tone.label}
                          </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
                          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 10 }}>
                            <div style={{ fontSize: 12, fontWeight: 900, color: "#64748b" }}>Current Stock</div>
                            <div style={{ marginTop: 4, fontSize: 20, fontWeight: 950 }}>
                              {current} {inv?.stock_unit || ""}
                            </div>
                          </div>

                          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 10 }}>
                            <div style={{ fontSize: 12, fontWeight: 900, color: "#64748b" }}>Selling Price</div>
                            <div style={{ marginTop: 4, fontSize: 20, fontWeight: 950 }}>
                              {selling > 0 ? money(selling) : "—"}
                            </div>
                          </div>

                          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 10 }}>
                            <div style={{ fontSize: 12, fontWeight: 900, color: "#64748b" }}>Rack / Room / Godown</div>
                            <div style={{ marginTop: 4, fontSize: 14, fontWeight: 950 }}>
                              {[inv?.rack_no && `Rack ${inv.rack_no}`, inv?.room_no && `Room ${inv.room_no}`, inv?.godown_no && `Godown ${inv.godown_no}`]
                                .filter(Boolean)
                                .join(" • ") || "—"}
                            </div>
                          </div>

                          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 10 }}>
                            <div style={{ fontSize: 12, fontWeight: 900, color: "#64748b" }}>Vehicle / Capacity</div>
                            <div style={{ marginTop: 4, fontSize: 14, fontWeight: 950 }}>
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
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
              <ActionButton href="/materials/add?inventory=1" variant="primary">
                Add New Inventory Item →
              </ActionButton>

              <Link href="/materials" style={{ fontWeight: 900, alignSelf: "center" }}>
                View public materials
              </Link>
            </div>
          </CardFooter>
        </Card>
      </Container>
    </main>
  );
}