import { cookies } from "next/headers";

import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { Container } from "@/components/layout/Container";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    dispatchId: string;
  };
};

const statusLabels: Record<string, string> = {
  pending: "Order Received",
  assigned: "Vehicle Assigned",
  loaded: "Material Loaded",
  in_transit: "On the Way",
  delivered: "Delivered",
  cancelled: "Cancelled",
  failed: "Delivery Failed",
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
  if (status === "loaded") return 55;
  if (status === "in_transit") return 78;
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

export default async function BuyerDeliveryTrackPage({ params }: PageProps) {
  const supabase = getSupabaseServerClient(cookies());

  const { data: dispatch } = await supabase
    .from("inventory_dispatches")
    .select("*")
    .eq("id", params.dispatchId)
    .maybeSingle();

  const vehicleId = dispatch?.vehicle_id || null;

  const { data: vehicle } = vehicleId
    ? await supabase
        .from("vendor_vehicles")
        .select("vehicle_type,vehicle_number,driver_name,driver_phone,load_capacity,current_status,gps_tracking_url")
        .eq("id", vehicleId)
        .maybeSingle()
    : { data: null };

  const status = dispatch?.dispatch_status || "pending";
  const pct = progress(status);
  const color = statusColor(status);

  return (
    <main>
      <Container>
        <div
          style={{
            maxWidth: 920,
            margin: "0 auto",
            padding: "18px 0 28px",
          }}
        >
          <div
            style={{
              borderRadius: 28,
              padding: 22,
              border: "1px solid #bfdbfe",
              background: "linear-gradient(135deg, #eff6ff, #ffffff)",
              boxShadow: "0 18px 44px rgba(37,99,235,0.10)",
              marginBottom: 14,
            }}
          >
            <div
              style={{
                display: "inline-flex",
                borderRadius: 999,
                background: "#dbeafe",
                color: "#1d4ed8",
                padding: "7px 12px",
                fontSize: 12,
                fontWeight: 1000,
              }}
            >
              3Bigha Delivery Tracking
            </div>

            <h1
              style={{
                margin: "12px 0 0",
                fontSize: "clamp(26px, 5vw, 46px)",
                lineHeight: 1,
                letterSpacing: "-0.05em",
                color: "#0f172a",
              }}
            >
              Track your material delivery
            </h1>

            <p
              style={{
                margin: "10px 0 0",
                color: "#475569",
                fontSize: 15,
                lineHeight: 1.6,
                fontWeight: 800,
              }}
            >
              Check vehicle status, delivery progress, expected timing and driver information.
            </p>
          </div>

          {!dispatch ? (
            <Card>
              <CardBody>
                <div style={{ fontSize: 20, fontWeight: 950, color: "#b91c1c" }}>
                  Delivery not found
                </div>
                <div style={{ marginTop: 8, color: "#64748b", fontWeight: 800 }}>
                  Please check the tracking link or contact the vendor.
                </div>
              </CardBody>
            </Card>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              <Card>
                <CardBody>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 950, color: "#0f172a" }}>
                        {dispatch.material_name || "Material Delivery"}
                      </div>

                      <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <Badge>{statusLabels[status] || status}</Badge>
                        <Badge>
                          Qty: {dispatch.quantity || 0} {dispatch.unit || ""}
                        </Badge>
                        {dispatch.order_reference ? <Badge>Ref: {dispatch.order_reference}</Badge> : null}
                      </div>
                    </div>

                    <div
                      style={{
                        borderRadius: 999,
                        padding: "9px 13px",
                        background: color,
                        color: "#ffffff",
                        fontWeight: 950,
                        fontSize: 13,
                        height: "fit-content",
                      }}
                    >
                      {statusLabels[status] || status}
                    </div>
                  </div>

                  <div style={{ marginTop: 18 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        fontWeight: 900,
                        color: "#1e40af",
                      }}
                    >
                      <span>Delivery Progress</span>
                      <span>{pct}%</span>
                    </div>

                    <div
                      style={{
                        marginTop: 7,
                        height: 13,
                        borderRadius: 999,
                        background: "#dbeafe",
                        overflow: "hidden",
                        border: "1px solid #bfdbfe",
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          background: color,
                          borderRadius: 999,
                        }}
                      />
                    </div>
                  </div>
                </CardBody>
              </Card>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
                  gap: 12,
                }}
              >
                <InfoCard title="Expected Delivery" value={fmtDate(dispatch.expected_delivery_at)} />
                <InfoCard title="Dispatched At" value={fmtDate(dispatch.dispatched_at)} />
                <InfoCard title="Delivered At" value={fmtDate(dispatch.delivered_at)} />
                <InfoCard title="Buyer Name" value={dispatch.buyer_name || "—"} />
              </div>

              <Card>
                <CardBody>
                  <div style={{ fontSize: 18, fontWeight: 950 }}>Delivery Address</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#475569",
                      fontSize: 14,
                      lineHeight: 1.6,
                      fontWeight: 800,
                    }}
                  >
                    {dispatch.delivery_address || "Address not available"}
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <div style={{ fontSize: 18, fontWeight: 950 }}>Vehicle & Driver</div>

                  {vehicle ? (
                    <>
                      <div
                        style={{
                          marginTop: 12,
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                          gap: 10,
                        }}
                      >
                        <InfoCard title="Vehicle Number" value={vehicle.vehicle_number || "—"} />
                        <InfoCard title="Vehicle Type" value={vehicle.vehicle_type || "—"} />
                        <InfoCard title="Load Capacity" value={vehicle.load_capacity || "—"} />
                        <InfoCard title="Driver Name" value={vehicle.driver_name || "—"} />
                        <InfoCard title="Driver Phone" value={vehicle.driver_phone || "—"} />
                        <InfoCard title="Vehicle Status" value={(vehicle.current_status || "—").replace(/_/g, " ")} />
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
                            background: "#0f172a",
                            color: "#ffffff",
                            padding: "10px 13px",
                            fontWeight: 950,
                            fontSize: 13,
                            textDecoration: "none",
                          }}
                        >
                          Open Live GPS →
                        </a>
                      ) : null}
                    </>
                  ) : (
                    <div style={{ marginTop: 10, color: "#64748b", fontSize: 13, fontWeight: 800 }}>
                      Vehicle details are not available yet.
                    </div>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <div style={{ fontSize: 18, fontWeight: 950 }}>Delivery Timeline</div>

                  <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                    <TimelineItem title="Order Received" active value={fmtDate(dispatch.created_at)} />
                    <TimelineItem title="Vehicle Assigned" active={!!vehicle} value={vehicle?.vehicle_number || "Pending"} />
                    <TimelineItem
                      title="Material Loaded"
                      active={["loaded", "in_transit", "delivered"].includes(status)}
                      value={["loaded", "in_transit", "delivered"].includes(status) ? "Completed" : "Pending"}
                    />
                    <TimelineItem
                      title="On The Way"
                      active={["in_transit", "delivered"].includes(status)}
                      value={fmtDate(dispatch.dispatched_at)}
                    />
                    <TimelineItem
                      title="Delivered"
                      active={status === "delivered"}
                      value={fmtDate(dispatch.delivered_at)}
                    />
                  </div>
                </CardBody>
              </Card>

              {dispatch.proof_image_url ? (
                <Card>
                  <CardBody>
                    <div style={{ fontSize: 18, fontWeight: 950 }}>Proof of Delivery</div>
                    <a
                      href={dispatch.proof_image_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "inline-block",
                        marginTop: 10,
                        color: "#1d4ed8",
                        fontWeight: 950,
                      }}
                    >
                      View delivery proof →
                    </a>
                  </CardBody>
                </Card>
              ) : null}

              {dispatch.driver_note ? (
                <Card>
                  <CardBody>
                    <div style={{ fontSize: 18, fontWeight: 950 }}>Driver Note</div>
                    <div style={{ marginTop: 8, color: "#64748b", fontWeight: 800, lineHeight: 1.6 }}>
                      {dispatch.driver_note}
                    </div>
                  </CardBody>
                </Card>
              ) : null}
            </div>
          )}
        </div>
      </Container>
    </main>
  );
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 13,
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
        borderRadius: 14,
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