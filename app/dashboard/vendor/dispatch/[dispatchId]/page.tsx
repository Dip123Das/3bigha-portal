"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

type DispatchRow = {
  id: string;
  vendor_user_id: string;
  material_name: string | null;
  quantity: number | null;
  unit: string | null;
  buyer_name: string | null;
  buyer_phone: string | null;
  delivery_address: string | null;
  order_reference: string | null;
  dispatch_status: string;
  expected_delivery_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  tracking_url: string | null;
  proof_image_url: string | null;
  driver_note: string | null;
  buyer_note: string | null;
  vehicle_id: string | null;
  material_listing_id: string | null;
  created_at: string;
  updated_at: string | null;
};

type VehicleRow = {
  id: string;
  vehicle_type: string;
  vehicle_number: string;
  driver_name: string | null;
  driver_phone: string | null;
  load_capacity: string | null;
  current_status: string;
  gps_tracking_url: string | null;
};

const statuses = [
  "pending",
  "assigned",
  "loaded",
  "in_transit",
  "delivered",
  "cancelled",
  "failed",
];

const statusLabels: Record<string, string> = {
  pending: "Pending",
  assigned: "Vehicle Assigned",
  loaded: "Loaded",
  in_transit: "In Transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
  failed: "Failed",
};

function fmtDate(v: string | null) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString("en-IN");
  } catch {
    return v;
  }
}

function progress(status: string) {
  if (status === "pending") return 10;
  if (status === "assigned") return 30;
  if (status === "loaded") return 50;
  if (status === "in_transit") return 75;
  if (status === "delivered") return 100;
  if (status === "cancelled" || status === "failed") return 100;
  return 15;
}

function statusColor(status: string) {
  if (status === "delivered") return "#047857";
  if (status === "cancelled" || status === "failed") return "#b91c1c";
  if (status === "in_transit") return "#1d4ed8";
  if (status === "loaded") return "#7c3aed";
  return "#ea580c";
}

export default function DispatchTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const dispatchId = String(params?.dispatchId || "");
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [dispatch, setDispatch] = useState<DispatchRow | null>(null);
  const [vehicle, setVehicle] = useState<VehicleRow | null>(null);
  const [driverNote, setDriverNote] = useState("");
  const [proofUrl, setProofUrl] = useState("");

  async function getUserId() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) throw error;

    if (!session?.user?.id) {
      router.push(`/login?next=${encodeURIComponent(`/dashboard/vendor/dispatch/${dispatchId}`)}`);
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
        .from("inventory_dispatches")
        .select("*")
        .eq("id", dispatchId)
        .eq("vendor_user_id", userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Dispatch not found.");

      const row = data as DispatchRow;
      setDispatch(row);
      setDriverNote(row.driver_note || "");
      setProofUrl(row.proof_image_url || "");

      if (row.vehicle_id) {
        const vehicleRes = await supabase
          .from("vendor_vehicles")
          .select("*")
          .eq("id", row.vehicle_id)
          .maybeSingle();

        if (vehicleRes.error) throw vehicleRes.error;
        setVehicle((vehicleRes.data || null) as VehicleRow | null);
      } else {
        setVehicle(null);
      }
    } catch (e: any) {
      setErr(e?.message || "Failed to load dispatch tracking.");
      setDispatch(null);
      setVehicle(null);
    } finally {
      setLoading(false);
    }
  }

    async function sendWhatsAppUpdate() {
    if (!dispatch) return;

    setSaving(true);
    setErr(null);

    try {
      const res = await fetch("/api/vendor/dispatch/send-whatsapp-update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dispatchId: dispatch.id,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to send WhatsApp update.");
      }

      alert("WhatsApp delivery update sent / attempted successfully.");
      await load();
    } catch (e: any) {
      setErr(e?.message || "Failed to send WhatsApp update.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(nextStatus: string) {
    if (!dispatch) return;

    setSaving(true);
    setErr(null);

    try {
      const patch: any = {
        dispatch_status: nextStatus,
        updated_at: new Date().toISOString(),
      };

      if (nextStatus === "in_transit") {
        patch.dispatched_at = dispatch.dispatched_at || new Date().toISOString();
      }

      if (nextStatus === "delivered") {
        patch.delivered_at = dispatch.delivered_at || new Date().toISOString();
        patch.proof_image_url = proofUrl.trim() || dispatch.proof_image_url || null;
      }

      patch.driver_note = driverNote.trim() || null;

      const { error } = await supabase
        .from("inventory_dispatches")
        .update(patch)
        .eq("id", dispatch.id);

      if (error) throw error;

      if (vehicle?.id) {
        let vehicleStatus = vehicle.current_status;

        if (nextStatus === "in_transit") vehicleStatus = "in_transit";
        if (nextStatus === "delivered" || nextStatus === "cancelled" || nextStatus === "failed") {
          vehicleStatus = "available";
        }

        await supabase
          .from("vendor_vehicles")
          .update({
            current_status: vehicleStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", vehicle.id);
      }

      await load();
    } catch (e: any) {
      setErr(e?.message || "Failed to update dispatch status.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (dispatchId) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatchId]);

  const currentProgress = progress(dispatch?.dispatch_status || "pending");
  const currentColor = statusColor(dispatch?.dispatch_status || "pending");

  return (
    <main>
      <Container>
        <SectionHeader
          title="Delivery Tracking"
          subtitle="Track dispatch status, vehicle details, driver updates and delivery progress."
        />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <ActionButton href="/dashboard/vendor/dispatch" variant="secondary">
            ← Dispatch Center
          </ActionButton>

          <ActionButton href="/dashboard/vendor/fleet" variant="secondary">
            Fleet
          </ActionButton>

          <ActionButton href="/dashboard/vendor/billing" variant="secondary">
            Billing
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
            Refresh
          </button>
        </div>

        {loading ? (
          <EmptyState message="Loading delivery tracking…" />
        ) : err ? (
          <EmptyState message={`Tracking failed: ${err}`} />
        ) : !dispatch ? (
          <EmptyState message="Dispatch not found." />
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            <div
              style={{
                borderRadius: 12,
                padding: 14,
                border: "1px solid #bfdbfe",
                background: "#ffffff",
                boxShadow: "0 16px 38px rgba(37,99,235,0.10)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 950, color: "#0f172a" }}>
                    {dispatch.material_name || "Material Delivery"}
                  </div>

                  <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Badge>Status: {statusLabels[dispatch.dispatch_status] || dispatch.dispatch_status}</Badge>
                    <Badge>
                      Qty: {dispatch.quantity || 0} {dispatch.unit || ""}
                    </Badge>
                    {dispatch.order_reference ? <Badge>Ref: {dispatch.order_reference}</Badge> : null}
                  </div>
                </div>

                <div
                  style={{
                    borderRadius: 12,
                    padding: "9px 13px",
                    background: currentColor,
                    color: "#111827",
                    fontWeight: 950,
                    fontSize: 13,
                    height: "fit-content",
                  }}
                >
                  {statusLabels[dispatch.dispatch_status] || dispatch.dispatch_status}
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 900, color: "#1e40af" }}>
                  <span>Delivery Progress</span>
                  <span>{currentProgress}%</span>
                </div>

                <div
                  style={{
                    marginTop: 7,
                    height: 12,
                    borderRadius: 12,
                    background: "#dbeafe",
                    overflow: "hidden",
                    border: "1px solid #bfdbfe",
                  }}
                >
                  <div
                    style={{
                      width: `${currentProgress}%`,
                      height: "100%",
                      background: currentColor,
                      borderRadius: 12,
                    }}
                  />
                </div>
              </div>
            </div>

            <Card>
              <CardBody>
                <div style={{ fontSize: 18, fontWeight: 950 }}>Delivery Details</div>

                <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                  <Info title="Buyer" value={dispatch.buyer_name || "—"} />
                  <Info title="Buyer Phone" value={dispatch.buyer_phone || "—"} />
                  <Info title="Expected Delivery" value={fmtDate(dispatch.expected_delivery_at)} />
                  <Info title="Created" value={fmtDate(dispatch.created_at)} />
                  <Info title="Dispatched" value={fmtDate(dispatch.dispatched_at)} />
                  <Info title="Delivered" value={fmtDate(dispatch.delivered_at)} />
                </div>

                <div style={{ marginTop: 12 }}>
                  <Info title="Delivery Address" value={dispatch.delivery_address || "—"} />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div style={{ fontSize: 18, fontWeight: 950 }}>Vehicle & Driver</div>

                {vehicle ? (
                  <>
                    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                      <Info title="Vehicle Number" value={vehicle.vehicle_number} />
                      <Info title="Vehicle Type" value={vehicle.vehicle_type} />
                      <Info title="Load Capacity" value={vehicle.load_capacity || "—"} />
                      <Info title="Vehicle Status" value={vehicle.current_status.replace(/_/g, " ")} />
                      <Info title="Driver" value={vehicle.driver_name || "—"} />
                      <Info title="Driver Phone" value={vehicle.driver_phone || "—"} />
                    </div>

                    {vehicle.gps_tracking_url ? (
                      <a
                        href={vehicle.gps_tracking_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "inline-block",
                          marginTop: 12,
                          borderRadius: 12,
                          background: "#ffffff",
                          color: "#111827",
                          padding: "10px 13px",
                          fontWeight: 950,
                          fontSize: 13,
                          textDecoration: "none",
                        }}
                      >
                        Open GPS Tracking →
                      </a>
                    ) : null}
                  </>
                ) : (
                  <div style={{ marginTop: 10, color: "#64748b", fontSize: 13, fontWeight: 800 }}>
                    No vehicle assigned.
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div style={{ fontSize: 18, fontWeight: 950 }}>Update Dispatch</div>

                <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                  <select
                    value={dispatch.dispatch_status}
                    onChange={(e) => void updateStatus(e.target.value)}
                    disabled={saving}
                    style={inputStyle}
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {statusLabels[s] || s}
                      </option>
                    ))}
                  </select>

                  <input
                    value={proofUrl}
                    onChange={(e) => setProofUrl(e.target.value)}
                    placeholder="Proof image URL optional"
                    style={inputStyle}
                  />
                </div>

                <textarea
                  value={driverNote}
                  onChange={(e) => setDriverNote(e.target.value)}
                  placeholder="Driver / delivery note"
                  rows={3}
                  style={{
                    ...inputStyle,
                    width: "100%",
                    marginTop: 10,
                    resize: "vertical",
                  }}
                />

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void sendWhatsAppUpdate()}
                  style={{
                    marginTop: 12,
                    marginRight: 10,
                    border: "none",
                    borderRadius: 12,
                    padding: "10px 14px",
                    background: saving ? "#94a3b8" : "#16a34a",
                    color: "#111827",
                    fontWeight: 950,
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  Send WhatsApp Update
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void updateStatus(dispatch.dispatch_status)}
                  style={{
                    marginTop: 12,
                    border: "none",
                    borderRadius: 12,
                    padding: "10px 14px",
                    background: saving ? "#94a3b8" : "#2563eb",
                    color: "#111827",
                    fontWeight: 950,
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  {saving ? "Saving..." : "Save Tracking Update"}
                </button>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div style={{ fontSize: 18, fontWeight: 950 }}>Dispatch Timeline</div>

                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  <TimelineItem title="Dispatch Created" value={fmtDate(dispatch.created_at)} active />
                  <TimelineItem title="Vehicle Assigned" value={vehicle ? vehicle.vehicle_number : "Not assigned"} active={!!vehicle} />
                  <TimelineItem title="Loaded" value={dispatch.dispatch_status === "loaded" || dispatch.dispatch_status === "in_transit" || dispatch.dispatch_status === "delivered" ? "Completed" : "Pending"} active={["loaded", "in_transit", "delivered"].includes(dispatch.dispatch_status)} />
                  <TimelineItem title="In Transit" value={fmtDate(dispatch.dispatched_at)} active={["in_transit", "delivered"].includes(dispatch.dispatch_status)} />
                  <TimelineItem title="Delivered" value={fmtDate(dispatch.delivered_at)} active={dispatch.dispatch_status === "delivered"} />
                </div>
              </CardBody>
            </Card>
          </div>
        )}
      </Container>
    </main>
  );
}

function Info({ title, value }: { title: string; value: string }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 12,
        background: "#ffffff",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 950, color: "#64748b" }}>{title}</div>
      <div style={{ marginTop: 5, fontSize: 14, fontWeight: 900, color: "#0f172a", lineHeight: 1.45 }}>
        {value}
      </div>
    </div>
  );
}

function TimelineItem({ title, value, active }: { title: string; value: string; active: boolean }) {
  return (
    <div
      style={{
        border: active ? "1px solid #bfdbfe" : "1px solid #e5e7eb",
        background: active ? "#eff6ff" : "#ffffff",
        borderRadius: 12,
        padding: 12,
        display: "flex",
        justifyContent: "space-between",
        gap: 10,
        flexWrap: "wrap",
      }}
    >
      <div style={{ fontWeight: 950, color: active ? "#1d4ed8" : "#64748b" }}>
        {active ? "✅ " : "○ "}
        {title}
      </div>
      <div style={{ fontSize: 13, fontWeight: 850, color: "#475569" }}>{value}</div>
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