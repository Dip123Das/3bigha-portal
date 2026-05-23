// app/property/builder/projects/[projectId]/units/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";

type BuilderProfileRow = {
  id: string;
  owner_user_id: string;
  legal_name: string;
  brand_name: string;
  slug: string;
  status: string;
};

type BuilderProjectRow = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  address: string | null;
  description: string | null;
  is_active: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  investment_plan_master_id: string | null;
  investment_plan_master?: {
    id: string;
    title: string | null;
    category: string | null;
    status: string | null;
  } | null;
};

type InventoryRow = {
  id: string;
  project_id: string;
  unit_code: string | null;
  title: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  investment_plan_master_id: string | null;
};

function friendlyDbError(err: any): string {
  return String(err?.message ?? err?.hint ?? err?.details ?? err ?? "Unknown error");
}
function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

type Flash = { kind: "success" | "error"; message: string } | null;

type InvestmentPlanRow = {
  id: string;
  title: string;
  category: string | null;
  status: string | null;
};

async function withTimeout(promise: Promise<any>, ms: number, label: string): Promise<any> {
  let timer: any;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export default function BuilderProjectUnitsPage() {
  const router = useRouter();
  const params = useParams<{ projectId: string }>();
  const projectId = String(params?.projectId ?? "");

  /**
   * ✅ Fix TS2589 (deep instantiation)
   * Cast factory to any before calling.
   */
  const supabase: any = useMemo(() => {
    const factory: any = getSupabaseBrowser as any;
    return factory();
  }, []);

  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState("");

  const [flash, setFlash] = useState<Flash>(null);
  function flashSuccess(message: string) {
    setFlash({ kind: "success", message });
    if (typeof window !== "undefined") window.setTimeout(() => setFlash(null), 3500);
  }
  function flashError(message: string) {
    setFlash({ kind: "error", message });
    if (typeof window !== "undefined") window.setTimeout(() => setFlash(null), 6500);
  }

  const [userId, setUserId] = useState<string>("");
  const [builder, setBuilder] = useState<BuilderProfileRow | null>(null);
  const [project, setProject] = useState<BuilderProjectRow | null>(null);
  const [units, setUnits] = useState<InventoryRow[]>([]);
  const [projectInvestmentPlanId, setProjectInvestmentPlanId] = useState<string>("");
  const [investmentPlans, setInvestmentPlans] = useState<InvestmentPlanRow[]>([]);
  const [savingUnitId, setSavingUnitId] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setLoading(true);
      setGlobalError("");
      setBuilder(null);
      setProject(null);
      setUnits([]);

      try {
        // ✅ SAFETY: never let non-UUID hit Postgres
        if (!isUuid(projectId)) {
          if (!cancelled) {
            setLoading(false);
            setGlobalError("Invalid Project ID in URL. Please open this page from Builder Projects list.");
          }
          return;
        }

        if (!projectId) {
          if (!cancelled) {
            setLoading(false);
            setGlobalError("Missing projectId in URL.");
          }
          return;
        }

        // 1) must be logged in
        const uRes = await supabase.auth.getUser();
        const uid = String(uRes?.data?.user?.id ?? "");
        if (!uid) {
          if (!cancelled) {
            setUserId("");
            setLoading(false);
            setGlobalError("You are not logged in.");
          }
          return;
        }
        if (!cancelled) setUserId(uid);

        // 2) must have completed BUSINESS profile
        const bpRes = await supabase
          .from("business_profiles")
          .select("user_id,is_complete")
          .eq("user_id", uid)
          .maybeSingle();

        if (bpRes.error) {
          if (!cancelled) {
            setLoading(false);
            setGlobalError(friendlyDbError(bpRes.error));
          }
          return;
        }

        const isComplete = !!(bpRes.data as any)?.is_complete;
        if (!isComplete) {
          const returnTo = `/property/builder/projects/${encodeURIComponent(projectId)}/units`;
          router.replace(`/onboarding/business?returnTo=${encodeURIComponent(returnTo)}`);
          return;
        }

        // 3) ensure builder profile exists
        const ensureRes = await supabase.rpc("ensure_builder_profile");
        if (ensureRes.error) {
          if (!cancelled) {
            setLoading(false);
            setGlobalError(`Could not ensure builder profile — ${friendlyDbError(ensureRes.error)}`);
          }
          return;
        }

        // 4) fetch builder profile
        const bRes = await supabase
          .from("builder_profiles")
          .select("id,owner_user_id,brand_name,legal_name,slug,status")
          .eq("owner_user_id", uid)
          .maybeSingle();

        if (bRes.error) {
          if (!cancelled) {
            setLoading(false);
            setGlobalError(friendlyDbError(bRes.error));
          }
          return;
        }

        const builderRow = (bRes.data ?? null) as BuilderProfileRow | null;
        if (!builderRow?.id) {
          if (!cancelled) {
            setLoading(false);
            setGlobalError("Builder profile could not be loaded (unexpected). Please refresh once.");
          }
          return;
        }
        if (!cancelled) setBuilder(builderRow);

        // 5) fetch project by id (RLS protects ownership)
        const projRes = await supabase
          .from("builder_projects")
          .select(`
            id,
            name,
            slug,
            city,
            state,
            address,
            description,
            is_active,
            status,
            created_at,
            updated_at,
            investment_plan_master_id,
            investment_plan_master:investment_plan_master_id (
              id,
              title,
              category,
              status
            )
          `)
          .eq("id", projectId)
          .maybeSingle();

        if (projRes.error) {
          if (!cancelled) {
            setLoading(false);
            setGlobalError(friendlyDbError(projRes.error));
          }
          return;
        }

        const proj = (projRes.data ?? null) as BuilderProjectRow | null;
        if (!proj?.id) {
          if (!cancelled) {
            setLoading(false);
            setGlobalError("Project not found (or you do not have access).");
          }
          return;
        }

        if (!cancelled) {
          setProject(proj);
          setProjectInvestmentPlanId(String(proj.investment_plan_master_id ?? ""));
        }

        // 6) fetch units from base table + active plans
        const [uRes2, planRes] = await Promise.all([
          supabase
            .from("builder_inventory_units")
            .select(`
              id,
              project_id,
              unit_code,
              title,
              status,
              created_at,
              updated_at,
              investment_plan_master_id
            `)
            .eq("project_id", projectId)
            .order("updated_at", { ascending: false }),

          supabase
            .from("investment_plan_master")
            .select("id,title,category,status")
            .eq("status", "active")
            .order("title", { ascending: true }),
        ]);

        if (uRes2.error) {
          if (!cancelled) {
            setLoading(false);
            setGlobalError(friendlyDbError(uRes2.error));
          }
          return;
        }

        if (planRes.error) {
          if (!cancelled) {
            setLoading(false);
            setGlobalError(`Could not load investment plans — ${friendlyDbError(planRes.error)}`);
          }
          return;
        }

        if (!cancelled) {
          setUnits((uRes2.data ?? []) as InventoryRow[]);
          setInvestmentPlans((planRes.data ?? []) as InvestmentPlanRow[]);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setLoading(false);
          setGlobalError(`Could not load project units — ${friendlyDbError(e)}`);
        }
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, [supabase, router, projectId]);

  function openAdminInventory() {
  router.push(
    `/admin/property/inventory?projectId=${encodeURIComponent(projectId)}&source=builder_projects`
  );
}

  function openAddUnits() {
    router.push(`/property/builder/projects/${encodeURIComponent(projectId)}/units/add`);
  }

  async function updateUnitInvestmentPlan(unitId: string, planId: string) {
    setSavingUnitId(unitId);
    setGlobalError("");

    try {
      const updateRes = await withTimeout(
        supabase
          .from("builder_inventory_units")
          .update({
            investment_plan_master_id: planId || null,
          })
          .eq("id", unitId)
          .select("id, investment_plan_master_id")
          .maybeSingle(),
        12000,
        "Unit investment plan update"
      );

      if (updateRes.error) throw updateRes.error;

      const rereadRes = await withTimeout(
        supabase
          .from("builder_inventory_units")
          .select("id, investment_plan_master_id")
          .eq("id", unitId)
          .maybeSingle(),
        12000,
        "Unit investment plan reread"
      );

      if (rereadRes.error) throw rereadRes.error;

      const fresh = rereadRes.data as { id: string; investment_plan_master_id: string | null } | null;
      if (!fresh?.id) {
        throw new Error("Unit could not be reloaded after saving.");
      }

      setUnits((prev) =>
        prev.map((u) =>
          u.id === unitId
            ? {
                ...u,
                investment_plan_master_id: fresh.investment_plan_master_id ?? null,
              }
            : u
        )
      );

      flashSuccess(
        fresh.investment_plan_master_id
          ? "Unit investment plan override saved."
          : "Unit reverted to inherited project plan."
      );
    } catch (e: any) {
      const msg = `Could not update unit plan — ${friendlyDbError(e)}`;
      setGlobalError(msg);
      flashError(msg);
    } finally {
      setSavingUnitId("");
    }
  }

  const loc = project ? [project.city, project.state].filter(Boolean).join(", ") : "";

  return (
    <Container>
      <SectionHeader
        title="Builder • Project Units"
        subtitle="Add multiple properties inside this project (plot/flat/house)."
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <ActionButton onClick={openAddUnits} disabled={!projectId}>
              Add Units / Property
            </ActionButton>

            <ActionButton onClick={openAdminInventory} disabled={!projectId} variant="secondary">
              Admin Inventory
            </ActionButton>

            <Link href="/property/builder/projects">
              <ActionButton variant="secondary">Back to Projects</ActionButton>
            </Link>

            <Link href="/property/builder">
              <ActionButton variant="secondary">Builder Home</ActionButton>
            </Link>
          </div>
        }
      />

      {flash ? (
        <div
          style={{
            position: "sticky",
            top: 12,
            zIndex: 20,
            marginTop: 10,
            marginBottom: 12,
            border:
              flash.kind === "success"
                ? "1px solid rgba(46, 160, 67, 0.25)"
                : "1px solid rgba(220, 53, 69, 0.25)",
            background:
              flash.kind === "success" ? "rgba(46, 160, 67, 0.08)" : "rgba(220, 53, 69, 0.08)",
            padding: "10px 12px",
            borderRadius: 12,
            fontWeight: 700,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <span
            style={{
              width: 16,
              height: 16,
              borderRadius: 4,
              background:
                flash.kind === "success" ? "rgba(46, 160, 67, 0.9)" : "rgba(220, 53, 69, 0.9)",
              display: "inline-block",
            }}
          />
          {flash.message}
        </div>
      ) : null}

      {loading ? (
        <Card>
          <CardBody>Loading…</CardBody>
        </Card>
      ) : globalError ? (
        <Card>
          <CardBody>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Error</div>
            <div style={{ whiteSpace: "pre-wrap", opacity: 0.9 }}>{globalError}</div>

            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {!userId ? (
                <Link href="/login">
                  <ActionButton>Go to Login</ActionButton>
                </Link>
              ) : (
                <ActionButton onClick={() => router.refresh()}>Refresh</ActionButton>
              )}
              <Link href="/onboarding/business?returnTo=%2Fproperty%2Fbuilder%2Fprojects">
                <ActionButton variant="secondary">Business Profile</ActionButton>
              </Link>
            </div>
          </CardBody>
        </Card>
      ) : (
        <>
          <div style={{ marginBottom: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {builder ? (
              <>
                <Badge>Builder: {builder.brand_name || builder.legal_name}</Badge>
                <Badge>status: {builder.status}</Badge>
              </>
            ) : null}
            {project ? (
              <>
                <Badge>Project: {project.name}</Badge>
                <Badge>status: {project.status}</Badge>
                {projectInvestmentPlanId ? <Badge>Default Investment Plan Attached</Badge> : <Badge>No Investment Plan</Badge>}
                {loc ? <Badge>{loc}</Badge> : null}
              </>
            ) : null}
            <Badge>Units: {units.length}</Badge>
            <Badge>Plans loaded: {investmentPlans.length}</Badge>
          </div>

          {units.length === 0 ? (
            <Card>
              <CardBody>
                <div style={{ fontWeight: 900, fontSize: 16 }}>No units yet</div>
                <div style={{ opacity: 0.8, marginTop: 6 }}>
                  Click <b>Add Units / Property</b> to create Land Plots / Flats / Houses inside this project.
                </div>

                <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <ActionButton onClick={openAddUnits}>Add Units / Property</ActionButton>
                  <ActionButton onClick={openAdminInventory} variant="secondary">
                    Admin Inventory
                  </ActionButton>
                  <Link href="/property/builder/projects">
                    <ActionButton variant="secondary">Back to Projects</ActionButton>
                  </Link>
                </div>
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardBody>
                {projectInvestmentPlanId ? (
                  <div
                    style={{
                      marginBottom: 14,
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid #e5e7eb",
                      background: "#fafafa",
                      fontSize: 13,
                      lineHeight: 1.5,
                    }}
                  >
                    <div style={{ fontWeight: 900, marginBottom: 4 }}>Investment Plan Notice</div>
                    <div>
                      This project has a default investment plan. Units under this project inherit that plan by default.
                      If a unit has its own investment plan assigned later, that unit-level override should take priority.
                    </div>
                  </div>
                ) : null}

                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ textAlign: "left" }}>
                      <th style={{ padding: "10px 8px", borderBottom: "1px solid #eee" }}>Unit</th>
                      <th style={{ padding: "10px 8px", borderBottom: "1px solid #eee" }}>Status</th>
                      <th style={{ padding: "10px 8px", borderBottom: "1px solid #eee" }}>Investment Plan</th>
                      <th style={{ padding: "10px 8px", borderBottom: "1px solid #eee" }}>Price</th>
                      <th style={{ padding: "10px 8px", borderBottom: "1px solid #eee" }}>Listing</th>
                      <th style={{ padding: "10px 8px", borderBottom: "1px solid #eee" }}>Updated</th>
                      <th style={{ padding: "10px 8px", borderBottom: "1px solid #eee", width: 320 }}>Actions</th>
                    </tr>
                    </thead>

                    <tbody>
                      {units.map((u) => {
                        const title = u.title?.trim() || "Unit";
                        const code = u.unit_code?.trim() || u.id.slice(0, 8);
                        const updated = u.updated_at ? new Date(u.updated_at).toLocaleString() : "—";

                        return (
                          <tr key={u.id}>
                            <td style={{ padding: "10px 8px", borderBottom: "1px solid #f2f2f2", minWidth: 260 }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {u.investment_plan_master_id ? (
                                  <div>
                                    <div style={{ fontWeight: 800 }}>
                                      {investmentPlans.find((p) => p.id === u.investment_plan_master_id)?.title || "Unit Override Plan"}
                                    </div>
                                    <div style={{ fontSize: 12, opacity: 0.75 }}>
                                      {investmentPlans.find((p) => p.id === u.investment_plan_master_id)?.category || "—"}
                                      {investmentPlans.find((p) => p.id === u.investment_plan_master_id)?.status
                                        ? ` • ${investmentPlans.find((p) => p.id === u.investment_plan_master_id)?.status}`
                                        : ""}
                                      {" • override"}
                                    </div>
                                  </div>
                                ) : projectInvestmentPlanId ? (
                                  <div>
                                    <div style={{ fontWeight: 800 }}>
                                      {project?.investment_plan_master?.title?.trim() || "Inherited from project"}
                                    </div>
                                    <div style={{ fontSize: 12, opacity: 0.75 }}>
                                      {project?.investment_plan_master?.category?.trim() || "—"}
                                      {project?.investment_plan_master?.status?.trim()
                                        ? ` • ${project?.investment_plan_master?.status?.trim()}`
                                        : ""}
                                      {" • inherited"}
                                    </div>
                                  </div>
                                ) : (
                                  <span style={{ opacity: 0.7 }}>No plan</span>
                                )}

                                <select
                                  value={u.investment_plan_master_id ?? ""}
                                  onChange={(e) => updateUnitInvestmentPlan(u.id, e.target.value)}
                                  disabled={savingUnitId === u.id}
                                  style={{
                                    width: "100%",
                                    padding: "8px 10px",
                                    borderRadius: 10,
                                    border: "1px solid #ddd",
                                    background: savingUnitId === u.id ? "#f7f7f7" : "white",
                                  }}
                                >
                                  <option value="">Use inherited project plan</option>
                                  {investmentPlans.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.title} [{p.category || "—"}]
                                    </option>
                                  ))}
                                </select>

                                {savingUnitId === u.id ? (
                                  <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 700 }}>Saving…</div>
                                ) : null}
                              </div>
                            </td>

                            <td style={{ padding: "10px 8px", borderBottom: "1px solid #f2f2f2" }}>
                              <span style={{ opacity: 0.7 }}>—</span>
                            </td>

                            <td style={{ padding: "10px 8px", borderBottom: "1px solid #f2f2f2" }}>
                              <span style={{ opacity: 0.7 }}>—</span>
                            </td>

                            <td style={{ padding: "10px 8px", borderBottom: "1px solid #f2f2f2" }}>{updated}</td>

                            <td style={{ padding: "10px 8px", borderBottom: "1px solid #f2f2f2" }}>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <ActionButton
                                  onClick={() => {
                                    openAdminInventory();
                                    flashSuccess("Open Admin Inventory to edit unit pricing / availability / listing link.");
                                  }}
                                >
                                  Edit in Admin
                                </ActionButton>

                                <ActionButton variant="secondary" onClick={openAddUnits}>
                                  Add More
                                </ActionButton>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
                  Next step: Add more units via <b>Add Units / Property</b> (plot/flat/house wizard).
                </div>
              </CardBody>
            </Card>
          )}
        </>
      )}
    </Container>
  );
}
