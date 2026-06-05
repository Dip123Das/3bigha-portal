"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  ErpActionCard,
  ErpActionGrid,
  ErpActivityFeed,
  ErpAlertList,
  ErpKpiCard,
  ErpKpiGrid,
  ErpPanel,
} from "@/components/vendor-erp/VendorErpWidgets";
import VendorWorkMenu from "@/components/vendor-erp/VendorWorkMenu";

type VehicleRow = {
  id: string;
  vehicle_number: string;
  vehicle_type: string;
  load_capacity: string | null;
  current_status: string;
};

type MaterialRow = {
  id: string;
  title: string | null;
  local_name: string | null;
  attributes: any;
};

type DispatchRow = {
  id: string;
  material_name: string | null;
  quantity: number | null;
  unit: string | null;
  buyer_name: string | null;
  buyer_phone: string | null;
  delivery_address: string | null;
  order_reference: string | null;
  dispatch_status: string;
  expected_delivery_at: string | null;
  created_at: string;
  vehicle_id: string | null;
  material_listing_id: string | null;
};

const dispatchStatuses = [
  "pending",
  "assigned",
  "loaded",
  "in_transit",
  "delivered",
  "cancelled",
  "failed",
];

function getInventory(material: MaterialRow) {
  return material.attributes?.inventory && typeof material.attributes.inventory === "object"
    ? material.attributes.inventory
    : null;
}

function getMaterialName(material: MaterialRow) {
  return material.title || material.local_name || "Material";
}

export default function VendorDispatchPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [dispatches, setDispatches] = useState<DispatchRow[]>([]);

  const [selectedMaterial, setSelectedMaterial] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [orderReference, setOrderReference] = useState("");
  const [expectedDelivery, setExpectedDelivery] = useState("");

  async function getUserId() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) throw error;

    if (!session?.user?.id) {
      router.push(`/login?next=${encodeURIComponent("/dashboard/vendor/dispatch")}`);
      return null;
    }

    return session.user.id;
  }

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const userId = await getUserId();
      if (!userId) return;

      const [vehicleRes, materialRes, dispatchRes] = await Promise.all([
        supabase
          .from("vendor_vehicles")
          .select("id,vehicle_number,vehicle_type,load_capacity,current_status")
          .eq("vendor_user_id", userId)
          .order("created_at", { ascending: false }),

        supabase
          .from("material_listings")
          .select("id,title,local_name,attributes")
          .eq("vendor_user_id", userId)
          .order("created_at", { ascending: false }),

        supabase
          .from("inventory_dispatches")
          .select("*")
          .eq("vendor_user_id", userId)
          .order("created_at", { ascending: false }),
      ]);

      if (vehicleRes.error) throw vehicleRes.error;
      if (materialRes.error) throw materialRes.error;
      if (dispatchRes.error) throw dispatchRes.error;

      setVehicles((vehicleRes.data || []) as VehicleRow[]);
      setMaterials((materialRes.data || []) as MaterialRow[]);
      setDispatches((dispatchRes.data || []) as DispatchRow[]);
    } catch (e: any) {
      setErr(e?.message || "Failed to load dispatch center.");
    } finally {
      setLoading(false);
    }
  }

  async function createDispatch() {
    if (!selectedMaterial) {
      setErr("Please select a material.");
      return;
    }

    if (!selectedVehicle) {
      setErr("Please assign a vehicle.");
      return;
    }

    setSaving(true);
    setErr(null);

    try {
      const userId = await getUserId();
      if (!userId) return;

      const material = materials.find((m) => m.id === selectedMaterial);
      const inventory = material ? getInventory(material) : null;

      const { error } = await supabase.from("inventory_dispatches").insert({
        vendor_user_id: userId,
        material_listing_id: selectedMaterial,
        vehicle_id: selectedVehicle,
        material_name: material ? getMaterialName(material) : "Material",
        quantity: quantity ? Number(quantity) : null,
        unit: unit || inventory?.stock_unit || null,
        buyer_name: buyerName.trim() || null,
        buyer_phone: buyerPhone.trim() || null,
        delivery_address: deliveryAddress.trim() || null,
        order_reference: orderReference.trim() || null,
        dispatch_status: "assigned",
        expected_delivery_at: expectedDelivery || null,
        created_by: userId,
      });

      if (error) throw error;

      await supabase
        .from("vendor_vehicles")
        .update({
          current_status: "assigned",
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedVehicle);

      setSelectedMaterial("");
      setSelectedVehicle("");
      setBuyerName("");
      setBuyerPhone("");
      setDeliveryAddress("");
      setQuantity("");
      setUnit("");
      setOrderReference("");
      setExpectedDelivery("");

      await load();
    } catch (e: any) {
      setErr(e?.message || "Failed to create dispatch.");
    } finally {
      setSaving(false);
    }
  }

  async function updateDispatchStatus(id: string, status: string) {
    try {
      const { error } = await supabase
        .from("inventory_dispatches")
        .update({
          dispatch_status: status,
          updated_at: new Date().toISOString(),
          dispatched_at:
            status === "in_transit" ? new Date().toISOString() : undefined,
          delivered_at:
            status === "delivered" ? new Date().toISOString() : undefined,
        })
        .eq("id", id);

      if (error) throw error;

      setDispatches((prev) =>
        prev.map((d) =>
          d.id === id
            ? {
                ...d,
                dispatch_status: status,
              }
            : d
        )
      );
    } catch (e: any) {
      setErr(e?.message || "Failed to update dispatch.");
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dispatchStats = useMemo(() => {
    return {
      total: dispatches.length,
      pending: dispatches.filter((d) => ["pending", "assigned", "loaded"].includes(d.dispatch_status)).length,
      inTransit: dispatches.filter((d) => d.dispatch_status === "in_transit").length,
      delivered: dispatches.filter((d) => d.dispatch_status === "delivered").length,
      failed: dispatches.filter((d) => ["failed", "cancelled"].includes(d.dispatch_status)).length,
    };
  }, [dispatches]);

  return (
    <main>
      <Container>
        <SectionHeader
          title="Delivery & Dispatch"
          subtitle="Assign vehicles and manage material deliveries easily."
        />

        <VendorWorkMenu />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <ActionButton href="/dashboard/vendor" variant="secondary">
            ← Vendor Dashboard
          </ActionButton>

          <ActionButton href="/dashboard/vendor/inventory" variant="secondary">
            Inventory
          </ActionButton>

          <ActionButton href="/dashboard/vendor/fleet" variant="secondary">
            Fleet
          </ActionButton>
        </div>

        <ErpPanel
          title="Delivery Overview"
          subtitle="Manage material delivery, vehicle assignment and buyer delivery updates."
          tone="blue"
        >
          <ErpKpiGrid>
            <ErpKpiCard label="Total Dispatches" value={dispatchStats.total} helper="All delivery records" tone="blue" />
            <ErpKpiCard label="Pending" value={dispatchStats.pending} helper="Needs delivery update" tone="orange" />
            <ErpKpiCard label="In Transit" value={dispatchStats.inTransit} helper="Currently moving" tone="violet" />
            <ErpKpiCard label="Delivered" value={dispatchStats.delivered} helper="Completed deliveries" tone="green" />
            <ErpKpiCard label="Failed / Cancelled" value={dispatchStats.failed} helper="Needs review" tone="red" />
          </ErpKpiGrid>
        </ErpPanel>

                <ErpPanel
          title="Dispatch Pending Actions"
          subtitle="Manage deliveries, buyer updates and vehicle movement."
          tone="blue"
        >
          <ErpActionGrid>
            <ErpActionCard
              title="Create Delivery"
              description="Create new delivery entry."
              href="/dashboard/vendor/dispatch"
              tone="blue"
            />

            <ErpActionCard
              title="Select Vehicle"
              description="Assign vehicle for delivery."
              href="/dashboard/vendor/fleet"
              tone="green"
            />

            <ErpActionCard
              title="Select Stock Item"
              description="Select delivery items from stock."
              href="/dashboard/vendor/inventory"
              tone="orange"
            />

            <ErpActionCard
              title="Dispatch Suggestions"
              description="Review pending and delayed deliveries."
              href="/dashboard/vendor/inventory-intelligence"
              tone="violet"
            />
          </ErpActionGrid>

          <ErpAlertList
            alerts={[
              {
                label: `${dispatchStats.pending} deliveries still need updates.`,
                tone: "orange",
              },
              {
                label: `${dispatchStats.failed} dispatches failed or were cancelled.`,
                tone: "red",
              },
              {
                label: `${dispatchStats.delivered} dispatches have already been completed successfully.`,
                tone: "green",
              },
            ]}
          />
                  <ErpActivityFeed
            title="Dispatch Activity Timeline"
            items={[
              {
                label: "Delivery queue reviewed.",
                meta: `${dispatchStats.pending} pending deliveries`,
                tone: "orange",
              },
              {
                label: "Delivery movement reviewed.",
                meta: `${dispatchStats.inTransit} deliveries in transit`,
                tone: "blue",
              },
              {
                label: "Completed delivery records updated.",
                meta: `${dispatchStats.delivered} deliveries completed`,
                tone: "green",
              },
            ]}
          />
        </ErpPanel>

        <Card>
          <CardBody>
            <div style={{ fontSize: 18, fontWeight: 950 }}>
              Create Delivery
            </div>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 10,
              }}
            >
              <select
                value={selectedMaterial}
                onChange={(e) => setSelectedMaterial(e.target.value)}
                style={inputStyle}
              >
                <option value="">Select Material</option>

                {materials.map((m) => {
                  const inv = getInventory(m);

                  return (
                    <option key={m.id} value={m.id}>
                      {getMaterialName(m)}
                      {inv?.current_stock
                        ? ` (${inv.current_stock} ${inv.stock_unit || ""})`
                        : ""}
                    </option>
                  );
                })}
              </select>

              <select
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                style={inputStyle}
              >
                <option value="">Select Vehicle</option>

                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.vehicle_number} • {v.vehicle_type}
                    {v.load_capacity ? ` • ${v.load_capacity}` : ""}
                  </option>
                ))}
              </select>

              <input
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Buyer name"
                style={inputStyle}
              />

              <input
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                placeholder="Buyer phone"
                style={inputStyle}
              />

              <input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Quantity"
                style={inputStyle}
              />

              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Unit"
                style={inputStyle}
              />

              <input
                value={orderReference}
                onChange={(e) => setOrderReference(e.target.value)}
                placeholder="Order / Challan Reference"
                style={inputStyle}
              />

              <input
                type="datetime-local"
                value={expectedDelivery}
                onChange={(e) => setExpectedDelivery(e.target.value)}
                style={inputStyle}
              />
            </div>

            <textarea
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Delivery address"
              rows={3}
              style={{
                ...inputStyle,
                width: "100%",
                resize: "vertical",
                marginTop: 10,
              }}
            />

            {err ? (
              <div
                style={{
                  marginTop: 10,
                  color: "#b91c1c",
                  fontWeight: 900,
                  fontSize: 13,
                }}
              >
                {err}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => void createDispatch()}
              disabled={saving}
              style={{
                marginTop: 12,
                border: "none",
                borderRadius: 12,
                padding: "10px 14px",
                background: saving ? "#94a3b8" : "#4338ca",
                color: "#fff",
                fontWeight: 950,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Creating..." : "Create Delivery"}
            </button>
          </CardBody>
        </Card>

        <div style={{ marginTop: 14 }}>
          <Card>
            <CardBody>
              <div style={{ fontSize: 18, fontWeight: 950 }}>
                Active Dispatches
              </div>

              <div style={{ marginTop: 12 }}>
                {loading ? (
                  <EmptyState message="Loading dispatches…" />
                ) : dispatches.length === 0 ? (
                  <EmptyState message="No dispatch created yet." />
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {dispatches.map((d) => (
                      <div
                        key={d.id}
                        style={{
                          border: "1px solid #e5e7eb",
                          borderRadius: 12,
                          padding: 12,
                          background: "#fff",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 10,
                            flexWrap: "wrap",
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 950 }}>
                              {d.material_name || "Material"}
                            </div>

                            <div
                              style={{
                                marginTop: 5,
                                display: "flex",
                                gap: 8,
                                flexWrap: "wrap",
                              }}
                            >
                              <Badge>
                                Qty: {d.quantity || 0} {d.unit || ""}
                              </Badge>

                              {d.buyer_name ? (
                                <Badge>Buyer: {d.buyer_name}</Badge>
                              ) : null}

                              {d.order_reference ? (
                                <Badge>Ref: {d.order_reference}</Badge>
                              ) : null}
                            </div>
                          </div>

                          <select
                            value={d.dispatch_status}
                            onChange={(e) =>
                              void updateDispatchStatus(
                                d.id,
                                e.target.value
                              )
                            }
                            style={inputStyle}
                          >
                            {dispatchStatuses.map((s) => (
                              <option key={s} value={s}>
                                {s.replace(/_/g, " ")}
                              </option>
                            ))}
                          </select>
                        </div>

                        {d.delivery_address ? (
                          <div
                            style={{
                              marginTop: 8,
                              fontSize: 13,
                              color: "#475569",
                              fontWeight: 800,
                            }}
                          >
                            {d.delivery_address}
                          </div>
                        ) : null}

                        {d.expected_delivery_at ? (
                          <div
                            style={{
                              marginTop: 8,
                              fontSize: 12,
                              color: "#6366f1",
                              fontWeight: 900,
                            }}
                          >
                            Expected Delivery:{" "}
                            {new Date(
                              d.expected_delivery_at
                            ).toLocaleString()}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      </Container>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.14)",
  background: "#fff",
  fontSize: 13,
  fontWeight: 800,
};