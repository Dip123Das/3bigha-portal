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
import { VendorErpNav } from "@/components/vendor-erp/VendorErpNav";

type VehicleRow = {
  id: string;
  vehicle_type: string;
  vehicle_number: string;
  driver_name: string | null;
  driver_phone: string | null;
  load_capacity: string | null;
  current_status: string;
  gps_tracking_url: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
};

const statusOptions = ["available", "assigned", "in_transit", "maintenance", "inactive"];

export default function VendorFleetPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<VehicleRow[]>([]);

  const [vehicleType, setVehicleType] = useState("truck");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [loadCapacity, setLoadCapacity] = useState("");
  const [gpsTrackingUrl, setGpsTrackingUrl] = useState("");
  const [notes, setNotes] = useState("");

  async function getUserId() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) throw error;

    if (!session?.user?.id) {
      router.push(`/login?next=${encodeURIComponent("/dashboard/vendor/fleet")}`);
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

      const { data, error } = await supabase
        .from("vendor_vehicles")
        .select("*")
        .eq("vendor_user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRows((data || []) as VehicleRow[]);
    } catch (e: any) {
      setErr(e?.message || "Failed to load fleet.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function addVehicle() {
    if (!vehicleNumber.trim()) {
      setErr("Vehicle number is required.");
      return;
    }

    setSaving(true);
    setErr(null);

    try {
      const userId = await getUserId();
      if (!userId) return;

      const { error } = await supabase.from("vendor_vehicles").insert({
        vendor_user_id: userId,
        vehicle_type: vehicleType.trim() || "truck",
        vehicle_number: vehicleNumber.trim().toUpperCase(),
        driver_name: driverName.trim() || null,
        driver_phone: driverPhone.trim() || null,
        load_capacity: loadCapacity.trim() || null,
        gps_tracking_url: gpsTrackingUrl.trim() || null,
        notes: notes.trim() || null,
        current_status: "available",
        is_active: true,
      });

      if (error) throw error;

      setVehicleType("truck");
      setVehicleNumber("");
      setDriverName("");
      setDriverPhone("");
      setLoadCapacity("");
      setGpsTrackingUrl("");
      setNotes("");

      await load();
    } catch (e: any) {
      setErr(e?.message || "Failed to save vehicle.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    setErr(null);

    try {
      const { error } = await supabase
        .from("vendor_vehicles")
        .update({
          current_status: status,
          is_active: status !== "inactive",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      setRows((prev) =>
        prev.map((row) =>
          row.id === id
            ? { ...row, current_status: status, is_active: status !== "inactive" }
            : row
        )
      );
    } catch (e: any) {
      setErr(e?.message || "Failed to update vehicle status.");
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    return {
      total: rows.length,
      available: rows.filter((r) => r.current_status === "available").length,
      assigned: rows.filter((r) => r.current_status === "assigned").length,
      inTransit: rows.filter((r) => r.current_status === "in_transit").length,
      maintenance: rows.filter((r) => r.current_status === "maintenance").length,
    };
  }, [rows]);

  return (
    <main>
      <Container>
        <SectionHeader
          title="Vendor Fleet"
          subtitle="Manage truck, lorry, dumper and tractor details for delivery and dispatch."
        />

        <VendorErpNav />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <ActionButton href="/dashboard/vendor" variant="secondary">
            ← Vendor Dashboard
          </ActionButton>
          <ActionButton href="/dashboard/vendor/inventory" variant="secondary">
            Inventory
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

        <ErpPanel
          title="Fleet Operating Center"
          subtitle="This connects sand, brick, stone and aggregate orders with assigned vehicles, drivers, load capacity and future live tracking."
          tone="blue"
        >
          <ErpKpiGrid>
            <ErpKpiCard label="Total Vehicles" value={stats.total} helper="Registered delivery assets" tone="blue" />
            <ErpKpiCard label="Available" value={stats.available} helper="Ready for new dispatch" tone="green" />
            <ErpKpiCard label="Assigned" value={stats.assigned} helper="Linked with delivery work" tone="orange" />
            <ErpKpiCard label="In Transit" value={stats.inTransit} helper="Currently on route" tone="violet" />
            <ErpKpiCard label="Maintenance" value={stats.maintenance} helper="Not ready for dispatch" tone="red" />
          </ErpKpiGrid>
        </ErpPanel>

                <ErpPanel
          title="Fleet ERP Operations"
          subtitle="Vehicle assignment, dispatch linkage and delivery operations."
          tone="blue"
        >
          <ErpActionGrid>
            <ErpActionCard
              title="Add Vehicle"
              description="Register new trucks, pickups and delivery vehicles."
              href="/dashboard/vendor/fleet"
              tone="green"
            />

            <ErpActionCard
              title="Create Dispatch"
              description="Assign fleet for material delivery."
              href="/dashboard/vendor/dispatch"
              tone="blue"
            />

            <ErpActionCard
              title="Inventory Movement"
              description="Connect fleet with inventory stock movement."
              href="/dashboard/vendor/inventory"
              tone="orange"
            />

            <ErpActionCard
              title="AI Fleet Monitoring"
              description="Review operational risk and delivery efficiency."
              href="/dashboard/vendor/inventory-intelligence"
              tone="violet"
            />
          </ErpActionGrid>

          <ErpAlertList
            alerts={[
              {
                label: `${stats.inTransit} vehicles are currently in active delivery routes.`,
                tone: "blue",
              },
              {
                label: `${stats.maintenance} vehicles require maintenance attention.`,
                tone: "red",
              },
              {
                label: `${stats.available} vehicles are immediately available for dispatch assignment.`,
                tone: "green",
              },
            ]}
          />
                  <ErpActivityFeed
            title="Fleet Activity Timeline"
            items={[
              {
                label: "Fleet availability reviewed.",
                meta: `${stats.available} vehicles ready`,
                tone: "green",
              },
              {
                label: "Active delivery routes monitored.",
                meta: `${stats.inTransit} vehicles in transit`,
                tone: "blue",
              },
              {
                label: "Maintenance risk checked.",
                meta: `${stats.maintenance} vehicles require attention`,
                tone: "red",
              },
            ]}
          />
        </ErpPanel>

        <Card>
          <CardBody>
            <div style={{ fontSize: 18, fontWeight: 950 }}>Add Vehicle</div>
            <div style={{ marginTop: 4, fontSize: 13, color: "#64748b", fontWeight: 800 }}>
              Add truck, lorry, dumper, tractor or other delivery vehicle.
            </div>

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <input value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} placeholder="Vehicle type" style={inputStyle} />
              <input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder="Vehicle number *" style={inputStyle} />
              <input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Driver name" style={inputStyle} />
              <input value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} placeholder="Driver phone" style={inputStyle} />
              <input value={loadCapacity} onChange={(e) => setLoadCapacity(e.target.value)} placeholder="Load capacity e.g. 350 cft / 10 ton" style={inputStyle} />
              <input value={gpsTrackingUrl} onChange={(e) => setGpsTrackingUrl(e.target.value)} placeholder="GPS tracking URL optional" style={inputStyle} />
            </div>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes"
              rows={3}
              style={{ ...inputStyle, marginTop: 10, width: "100%", resize: "vertical" }}
            />

            {err ? (
              <div style={{ marginTop: 10, color: "#b91c1c", fontWeight: 900, fontSize: 13 }}>
                {err}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => void addVehicle()}
              disabled={saving}
              style={{
                marginTop: 12,
                border: "none",
                borderRadius: 12,
                padding: "10px 14px",
                background: saving ? "#94a3b8" : "#0284c7",
                color: "#fff",
                fontWeight: 950,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Saving..." : "Add Vehicle"}
            </button>
          </CardBody>
        </Card>

        <div style={{ marginTop: 14 }}>
          <Card>
            <CardBody>
              <div style={{ fontSize: 18, fontWeight: 950 }}>Vehicles</div>

              <div style={{ marginTop: 12 }}>
                {loading ? (
                  <EmptyState message="Loading fleet…" />
                ) : rows.length === 0 ? (
                  <EmptyState message="No vehicle added yet." />
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {rows.map((row) => (
                      <div
                        key={row.id}
                        style={{
                          border: "1px solid #e5e7eb",
                          borderRadius: 12,
                          padding: 12,
                          background: "#fff",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 950 }}>
                              {row.vehicle_number}
                            </div>
                            <div style={{ marginTop: 5, display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <Badge>{row.vehicle_type}</Badge>
                              <Badge>Status: {row.current_status.replace(/_/g, " ")}</Badge>
                              {row.load_capacity ? <Badge>Capacity: {row.load_capacity}</Badge> : null}
                              {row.driver_name ? <Badge>Driver: {row.driver_name}</Badge> : null}
                              {row.driver_phone ? <Badge>Phone: {row.driver_phone}</Badge> : null}
                            </div>
                          </div>

                          <select
                            value={row.current_status}
                            onChange={(e) => void updateStatus(row.id, e.target.value)}
                            style={inputStyle}
                          >
                            {statusOptions.map((s) => (
                              <option key={s} value={s}>
                                {s.replace(/_/g, " ")}
                              </option>
                            ))}
                          </select>
                        </div>

                        {row.gps_tracking_url ? (
                          <a
                            href={row.gps_tracking_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{ display: "inline-block", marginTop: 8, fontWeight: 900, color: "#0369a1" }}
                          >
                            Open GPS Tracking →
                          </a>
                        ) : null}

                        {row.notes ? (
                          <div style={{ marginTop: 8, fontSize: 13, color: "#64748b", fontWeight: 800 }}>
                            {row.notes}
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ border: "1px solid #bae6fd", borderRadius: 12, padding: 12, background: "#fff" }}>
      <div style={{ fontSize: 12, fontWeight: 900, color: "#0369a1" }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 18, fontWeight: 950 }}>{value}</div>
    </div>
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