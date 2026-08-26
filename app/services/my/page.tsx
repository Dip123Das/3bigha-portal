// app/services/my/page.tsx
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
import { Grid } from "@/components/ui/Grid";
import { EmptyState } from "@/components/ui/EmptyState";

type RecordStatus = "draft" | "published" | "paused" | "archived";


type ServiceWorkOrderRow = {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  site_address: string | null;
  service_title: string;
  estimated_amount: number;
  advance_amount: number;
  assigned_team: string | null;
  work_status: string;
  expected_start: string | null;
  expected_completion: string | null;
};

type Row = {
  id: string;
  provider_id: string;

  // display
  custom_service: string | null;
  custom_category: string | null;
  custom_subcategory: string | null;

  description: string | null;

  pricing_kind: string | null;
  min_price: number | null;
  max_price: number | null;
  currency: string | null;

  record_status: RecordStatus;

  created_at: string | null;
  updated_at: string | null;
};

function fmt(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function canPublish(status: RecordStatus) {
  return status === "draft" || status === "paused";
}

function canPause(status: RecordStatus) {
  return status === "published";
}

function canArchive(status: RecordStatus) {
  return status !== "archived";
}

/**
 * Initial lifecycle state for a newly created service work order.
 *
 * This belongs to service_work_orders operational execution only.
 * It does not approve or publish provider_services or service_listings.
 */
const SERVICE_WORK_INITIAL_STATUS = "approved" as const;

export default function MyServicesPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [workOrders, setWorkOrders] = useState<ServiceWorkOrderRow[]>([]);
  const [actingId, setActingId] = useState<string | null>(null);

  const [workCustomer, setWorkCustomer] = useState("");
  const [workPhone, setWorkPhone] = useState("");
  const [workAddress, setWorkAddress] = useState("");
  const [workTitle, setWorkTitle] = useState("");
  const [workEstimate, setWorkEstimate] = useState("");
  const [workAdvance, setWorkAdvance] = useState("");
  const [workTeam, setWorkTeam] = useState("");
  const [workSaving, setWorkSaving] = useState(false);

  async function load() {
    setLoading(true);
    setErr(null);

    const { data: s } = await supabase.auth.getSession();
    const session = s.session;

    if (!session) {
      router.replace("/login");
      return;
    }

    // provider_services belongs to provider_id; providers belong to user
    // We'll fetch my provider_id from service_providers using user_id.
    const { data: prov, error: provErr } = await supabase
      .from("service_providers")
      .select("id")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (provErr) {
      setErr(provErr.message);
      setRows([]);
      setLoading(false);
      return;
    }

    const providerId = prov?.id as string | undefined;
    if (!providerId) {
      setRows([]);
      setLoading(false);
      return;
    }

    const [
      servicesRes,
      workOrdersRes,
    ] = await Promise.all([

      supabase
      .from("provider_services")
      .select(
        [
          "id",
          "provider_id",
          "custom_service",
          "custom_category",
          "custom_subcategory",
          "description",
          "pricing_kind",
          "min_price",
          "max_price",
          "currency",
          "record_status",
          "created_at",
          "updated_at",
        ].join(",")
      )
      .eq("provider_id", providerId)
      .order("updated_at", { ascending: false }),

      supabase
        .from("service_work_orders")
        .select("*")
        .eq("vendor_user_id", session.user.id)
        .order("created_at", { ascending: false })

    ]);

    const data = servicesRes.data as Row[] | null;
    const error = servicesRes.error;

    if (error) {
      setErr(error.message);
      setRows([]);
      setLoading(false);
      return;
    }

    if (workOrdersRes.error) {
      setErr(workOrdersRes.error.message);
      setLoading(false);
      return;
    }

    setRows((data ?? []) as Row[]);
    setWorkOrders(
      (workOrdersRes.data ?? []) as ServiceWorkOrderRow[]
    );

    setLoading(false);
  }


  async function createWorkOrder() {

    const { data: s } =
      await supabase.auth.getSession();

    const session = s.session;

    if (!session) return;

    if (!workCustomer.trim()) {
      setErr("Please enter customer name.");
      return;
    }

    if (!workTitle.trim()) {
      setErr("Please enter service title.");
      return;
    }

    setWorkSaving(true);
    setErr(null);

    try {

      const { error } = await supabase
        .from("service_work_orders")
        .insert({
          vendor_user_id: session.user.id,
          customer_name: workCustomer.trim(),
          customer_phone:
            workPhone.trim() || null,
          site_address:
            workAddress.trim() || null,
          service_title: workTitle.trim(),
          estimated_amount:
            Number(workEstimate || 0) || 0,
          advance_amount:
            Number(workAdvance || 0) || 0,
          assigned_team:
            workTeam.trim() || null,
          work_status:
            SERVICE_WORK_INITIAL_STATUS,
        });

      if (error) throw error;

      await supabase
        .from("operational_events")
        .insert({
          vendor_user_id: session.user.id,
          module: "services",
          event_type:
            "service_work_created",
          title:
            "Service Work Order Created",
          description:
            workTitle.trim() +
            " assigned to " +
            workCustomer.trim(),
        });

      setWorkCustomer("");
      setWorkPhone("");
      setWorkAddress("");
      setWorkTitle("");
      setWorkEstimate("");
      setWorkAdvance("");
      setWorkTeam("");

      await load();

    } catch (e: any) {
      setErr(
        e?.message ||
          "Failed to create work order."
      );
    } finally {
      setWorkSaving(false);
    }
  }


  async function updateWorkStatus(
    workId: string,
    nextStatus: string,
    title: string
  ) {

    const { data: s } =
      await supabase.auth.getSession();

    const session = s.session;

    if (!session) return;

    try {

      const { error } = await supabase
        .from("service_work_orders")
        .update({
          work_status: nextStatus,
        })
        .eq("id", workId);

      if (error) throw error;

      await supabase
        .from("operational_events")
        .insert({
          vendor_user_id: session.user.id,
          module: "services",
          event_type: nextStatus,
          title,
          description:
            "Service workflow moved to " +
            nextStatus,
        });

      await load();

    } catch (e: any) {
      setErr(
        e?.message ||
          "Failed to update work status."
      );
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setStatus(id: string, next: RecordStatus) {
    setActingId(id);
    setErr(null);

    try {
      if (next === "published") {
        const response = await fetch(
          "/api/services/submit-for-review",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "same-origin",
            body: JSON.stringify({
              serviceId: id,
            }),
          },
        );

        const result = await response
          .json()
          .catch(() => null);

        if (!response.ok || !result?.ok) {
          throw new Error(
            result?.error?.trustedPublication?.message ||
              result?.error?.message ||
              (typeof result?.error === "string"
                ? result.error
                : null) ||
              "Unable to submit service for review.",
          );
        }
      } else {
        /*
         * Pause and Archive are vendor lifecycle
         * controls, not publication approvals.
         */
        const { error } = await supabase
          .from("provider_services")
          .update({
            record_status: next,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);

        if (error) {
          throw error;
        }
      }

      await load();
    } catch (error: any) {
      setErr(
        error?.message ||
          "Unable to update service.",
      );
    } finally {
      setActingId(null);
    }
  }



  const lifeBtn = (
    bg: string
  ): React.CSSProperties => ({
    border: "none",
    borderRadius: 10,
    padding: "10px 14px",
    background: bg,
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  });

  const erpInput: React.CSSProperties = {
    height: 42,
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    padding: "0 12px",
  };

  return (
    <main>
      <Container>
        <SectionHeader
          title="My Services"
          subtitle="Manage your service listings — drafts, published, paused, archived."
        />

        <div style={{ maxWidth: "100%", overflowX: "hidden", display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
          <ActionButton href="/services/add" variant="primary">
            + Add Service
          </ActionButton>

          <ActionButton href="/services" variant="secondary">
            Browse Public Services
          </ActionButton>

          <Link href="/" style={{ maxWidth: "100%", overflowX: "hidden", fontWeight: 800, alignSelf: "center" }}>
            ← Home
          </Link>
        </div>


        <div
          style={{ maxWidth: "100%", overflowX: "hidden", border: "1px solid rgba(0, 0, 0.08)", borderRadius: 18, padding: 18, background: "#fff", marginBottom: 18 }}
        >
          <div
            style={{ maxWidth: "100%", overflowX: "hidden", fontSize: 20, fontWeight: 950, marginBottom: 14 }}
          >
            Service ERP Execution
          </div>

          <div
            style={{ maxWidth: "100%", overflowX: "hidden", display: "grid", gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}
          >
            <input
              value={workCustomer}
              onChange={(e) =>
                setWorkCustomer(e.target.value)
              }
              placeholder="Customer name"
              style={erpInput}
            />

            <input
              value={workPhone}
              onChange={(e) =>
                setWorkPhone(e.target.value)
              }
              placeholder="Customer phone"
              style={erpInput}
            />

            <input
              value={workAddress}
              onChange={(e) =>
                setWorkAddress(e.target.value)
              }
              placeholder="Site address"
              style={erpInput}
            />

            <input
              value={workTitle}
              onChange={(e) =>
                setWorkTitle(e.target.value)
              }
              placeholder="Service title"
              style={erpInput}
            />

            <input
              value={workEstimate}
              onChange={(e) =>
                setWorkEstimate(e.target.value)
              }
              placeholder="Estimate amount"
              style={erpInput}
            />

            <input
              value={workAdvance}
              onChange={(e) =>
                setWorkAdvance(e.target.value)
              }
              placeholder="Advance amount"
              style={erpInput}
            />

            <input
              value={workTeam}
              onChange={(e) =>
                setWorkTeam(e.target.value)
              }
              placeholder="Assigned team / labour"
              style={erpInput}
            />
          </div>

          <button
            type="button"
            onClick={createWorkOrder}
            disabled={workSaving}
            style={{ maxWidth: "100%", overflowX: "hidden", marginTop: 16, border: "none", borderRadius: 12, padding: "12px 18px", background: "#0f172a", color: "#fff", fontWeight: 900, cursor: "pointer", opacity: workSaving ? 0.7 : 1 }}
          >
            {workSaving
              ? "Creating..."
              : "Create Work Order"}
          </button>

          <div
            style={{ maxWidth: "100%", overflowX: "hidden", display: "grid", gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 18 }}
          >
            {[
              [
                "Work Orders",
                String(workOrders.length),
              ],
              [
                "Approved",
                String(
                  workOrders.filter(
                    (w) =>
                      w.work_status ===
                      "approved"
                  ).length
                ),
              ],
              [
                "In Progress",
                String(
                  workOrders.filter(
                    (w) =>
                      w.work_status ===
                      "work_started"
                  ).length
                ),
              ],
              [
                "Completed",
                String(
                  workOrders.filter(
                    (w) =>
                      w.work_status ===
                      "completed"
                  ).length
                ),
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{ maxWidth: "100%", overflowX: "hidden", border:
                    "1px solid rgba(0, 0, 0.08)", borderRadius: 14, padding: 14, background: "#f8fafc" }}
              >
                <div
                  style={{ maxWidth: "100%", overflowX: "hidden", fontSize: 12, fontWeight: 800, opacity: 0.7 }}
                >
                  {label}
                </div>

                <div
                  style={{ maxWidth: "100%", overflowX: "hidden", marginTop: 6, fontSize: 24, fontWeight: 950 }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>


        <div
          style={{ maxWidth: "100%", overflowX: "hidden", border: "1px solid rgba(0, 0, 0.08)", borderRadius: 18, padding: 18, background: "#fff", marginBottom: 18 }}
        >
          <div
            style={{ maxWidth: "100%", overflowX: "hidden", fontSize: 20, fontWeight: 950, marginBottom: 14 }}
          >
            Service Lifecycle Execution
          </div>

          <div
            style={{ maxWidth: "100%", overflowX: "hidden", display: "grid", gap: 12 }}
          >
            {workOrders.slice(0, 8).map((work) => (
              <div
                key={work.id}
                style={{ maxWidth: "100%", overflowX: "hidden", border:
                    "1px solid rgba(0, 0, 0.08)", borderRadius: 14, padding: 14, background: "#f8fafc" }}
              >
                <div
                  style={{ maxWidth: "100%", overflowX: "hidden", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12 }}
                >
                  <div>
                    <div
                      style={{ maxWidth: "100%", overflowX: "hidden", fontWeight: 950, fontSize: 16 }}
                    >
                      {work.service_title}
                    </div>

                    <div
                      style={{ maxWidth: "100%", overflowX: "hidden", marginTop: 4, fontSize: 13, opacity: 0.7 }}
                    >
                      Customer:
                      {" "}
                      {work.customer_name}
                    </div>

                    <div
                      style={{ maxWidth: "100%", overflowX: "hidden", marginTop: 4, fontSize: 13, opacity: 0.7 }}
                    >
                      Team:
                      {" "}
                      {work.assigned_team || "—"}
                    </div>

                    <div
                      style={{ maxWidth: "100%", overflowX: "hidden", marginTop: 4, fontSize: 13, opacity: 0.7, fontWeight: 800 }}
                    >
                      Status:
                      {" "}
                      {work.work_status}
                    </div>
                  </div>

                  <div
                    style={{ maxWidth: "100%", overflowX: "hidden", display: "flex", flexWrap: "wrap", gap: 10 }}
                  >
                    {work.work_status ===
                    "approved" ? (
                      <button
                        type="button"
                        onClick={() =>
                          updateWorkStatus(
                            work.id,
                            "work_started",
                            "Service Work Started"
                          )
                        }
                        style={lifeBtn("#2563eb")}
                      >
                        Start Work
                      </button>
                    ) : null}

                    {work.work_status ===
                    "work_started" ? (
                      <button
                        type="button"
                        onClick={() =>
                          updateWorkStatus(
                            work.id,
                            "milestone_completed",
                            "Service Milestone Completed"
                          )
                        }
                        style={lifeBtn("#7c3aed")}
                      >
                        Complete Milestone
                      </button>
                    ) : null}

                    {work.work_status ===
                    "milestone_completed" ? (
                      <button
                        type="button"
                        onClick={() =>
                          updateWorkStatus(
                            work.id,
                            "billed",
                            "Service Billing Completed"
                          )
                        }
                        style={lifeBtn("#ea580c")}
                      >
                        Mark Billed
                      </button>
                    ) : null}

                    {work.work_status ===
                    "billed" ? (
                      <button
                        type="button"
                        onClick={() =>
                          updateWorkStatus(
                            work.id,
                            "completed",
                            "Service Completed"
                          )
                        }
                        style={lifeBtn("#16a34a")}
                      >
                        Complete Service
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ maxWidth: "100%", overflowX: "hidden", opacity: 0.8 }}>Loading your services…</div>
        ) : err ? (
          <div style={{ maxWidth: "100%", overflowX: "hidden", color: "crimson", fontWeight: 800 }}>{err}</div>
        ) : rows.length === 0 ? (
          <EmptyState message="No service listings yet. Click “Add Service” to create your first listing." />
        ) : (
          <Grid min={280} gap={12}>
            {rows.map((r) => {
              const title = (r.custom_service ?? "").trim() || "Service";
              const catLine = [r.custom_category, r.custom_subcategory].filter(Boolean).join(" → ") || "—";



  const lifeBtn = (
    bg: string
  ): React.CSSProperties => ({
    border: "none",
    borderRadius: 10,
    padding: "10px 14px",
    background: bg,
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  });

  const erpInput: React.CSSProperties = {
    height: 42,
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    padding: "0 12px",
  };

  return (
                <Card key={r.id}>
                  <CardBody>
                    <div style={{ maxWidth: "100%", overflowX: "hidden", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ maxWidth: "100%", overflowX: "hidden", fontWeight: 900, fontSize: 16, lineHeight: 1.2 }}>{title}</div>
                      <Badge>{r.record_status}</Badge>
                    </div>

                    <div style={{ maxWidth: "100%", overflowX: "hidden", marginTop: 8, color: "#5b6472", fontSize: 13 }}>
                      Category: {catLine}
                    </div>

                    <div style={{ maxWidth: "100%", overflowX: "hidden", marginTop: 10, display: "grid", gap: 6, color: "#5b6472", fontSize: 13 }}>
                      <div>Created: {fmt(r.created_at)}</div>
                      <div>Updated: {fmt(r.updated_at)}</div>
                    </div>

                    <div style={{ maxWidth: "100%", overflowX: "hidden", marginTop: 10, opacity: 0.7, fontSize: 12 }}>
                      ID:{" "}
                      <span style={{ maxWidth: "100%", overflowX: "hidden", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                        {r.id}
                      </span>
                    </div>
                  </CardBody>

                  <CardFooter>
                    <div style={{ maxWidth: "100%", overflowX: "hidden", display: "flex", flexWrap: "wrap", gap: 10, width: "100%" }}>
                      <ActionButton href={`/services/${r.id}`} variant="secondary">
                        View →
                      </ActionButton>

                      {canPublish(r.record_status) ? (
                        <ActionButton
                          variant="primary"
                          onClick={() => setStatus(r.id, "published")}
                          disabled={actingId === r.id}
                        >
                          {actingId === r.id ? "Submitting..." : "Submit for Review"}
                        </ActionButton>
                      ) : null}

                      {canPause(r.record_status) ? (
                        <ActionButton
                          variant="secondary"
                          onClick={() => setStatus(r.id, "paused")}
                          disabled={actingId === r.id}
                        >
                          {actingId === r.id ? "Pausing..." : "Pause"}
                        </ActionButton>
                      ) : null}

                      {canArchive(r.record_status) ? (
                        <ActionButton
                          variant="secondary"
                          onClick={() => setStatus(r.id, "archived")}
                          disabled={actingId === r.id}
                        >
                          {actingId === r.id ? "Archiving..." : "Archive"}
                        </ActionButton>
                      ) : (
                        <div
                          style={{ maxWidth: "100%", overflowX: "hidden", border: "1px solid rgba(0, 0, 0.12)", borderRadius: 12, padding: "10px 12px", fontWeight: 800, opacity: 0.55 }}
                        >
                          Archived
                        </div>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </Grid>
        )}
      </Container>
    </main>
  );
}
