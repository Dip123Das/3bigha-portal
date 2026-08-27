// app/property/builder/projects/page.tsx
"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";

type BuilderProfileRow = {
  id: string;
  owner_user_id: string;
  brand_name: string;
  legal_name: string;
  slug: string;
  status: string;
};

type BuilderProjectRow = {
  id: string;
  builder_profile_id: string | null;
  name: string;
  slug: string;
  project_kind: string | null;
  status: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  created_at: string | null;
  updated_at: string | null;
  investment_plan_master_id: string | null;
  investment_plan_master?: {
    id: string;
    title: string | null;
    category: string | null;
    status: string | null;
  } | null;
};

function friendlyDbError(err: any): string {
  return String(err?.message ?? err?.hint ?? err?.details ?? err ?? "Unknown error");
}

type Flash = { kind: "success" | "error"; message: string } | null;

type InvestmentPlanRow = {
  id: string;
  title: string;
  category: string | null;
  status: string | null;
};

function BuilderProjectsPageInner() {
  const router = useRouter();
  const sp = useSearchParams();

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
  const [rows, setRows] = useState<BuilderProjectRow[]>([]);
  const [investmentPlans, setInvestmentPlans] = useState<InvestmentPlanRow[]>([]);
  const [savingProjectId, setSavingProjectId] = useState<string>("");

  // show toast when coming from create
  useEffect(() => {
    const created = sp.get("created");
    if (created) flashSuccess("✅ Project created.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setLoading(true);
      setGlobalError("");
      setRows([]);
      setBuilder(null);

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
        const returnTo = "/property/builder/projects";
        router.replace(`/onboarding/business?returnTo=${encodeURIComponent(returnTo)}`);
        return;
      }

      // 3) ensure builder profile exists (DB function handles required fields + permissions)
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

           const [pRes, planRes] = await Promise.all([
        supabase
          .from("builder_projects")
          .select(`
            id,
            builder_profile_id,
            name,
            slug,
            project_kind,
            status,
            city,
            district,
            state,
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
          .eq("builder_profile_id", builderRow.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("investment_plan_master")
          .select("id,title,category,status")
          .eq("status", "active")
          .order("title", { ascending: true }),
      ]);

      if (pRes.error) {
        if (!cancelled) {
          setLoading(false);
          setGlobalError(friendlyDbError(pRes.error));
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
        setRows((pRes.data ?? []) as BuilderProjectRow[]);
        setInvestmentPlans((planRes.data ?? []) as InvestmentPlanRow[]);
        setLoading(false);
      }
    }

    boot();

    return () => {
      cancelled = true;
    };
  }, [supabase, router]);

  /**
   * ✅ Correct Units route (dynamic segment)
   */
  function openUnits(projectId: string) {
    router.push(`/property/builder/projects/${encodeURIComponent(projectId)}/units`);
  }
  

  /**
   * ✅ NEW: Add Units / Property page
   */
  function openAddUnits(projectId: string) {
    router.push(`/property/builder/projects/${encodeURIComponent(projectId)}/units/add`);
  }

  /**
   * ✅ IMPORTANT: fix param name to project_id (not project)
   */
  function openAdminInventory(projectId: string) {
    router.push(`/admin/property/inventory?project=${encodeURIComponent(projectId)}`);
  }

  async function refreshSingleProjectRow(projectId: string) {
    const res = await supabase
      .from("builder_projects")
      .select(`
        id,
        builder_profile_id,
        name,
        slug,
        project_kind,
        status,
        city,
        district,
        state,
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

    if (res.error) throw res.error;
    return (res.data ?? null) as BuilderProjectRow | null;
  }

  async function activateProject(projectId: string) {
    setSavingProjectId(projectId);
    setGlobalError("");

    try {
      const res = await fetch(
        "/api/property/builder/projects/activate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            projectId,
          }),
        },
      );

      const json = await res
        .json()
        .catch(() => null);

      if (!res.ok || !json?.ok) {
        const message =
          json?.error?.message ||
          "Project activation failed.";

        throw new Error(message);
      }

      const freshRow =
        await refreshSingleProjectRow(
          projectId,
        );

      if (!freshRow?.id) {
        throw new Error(
          "Project activated but could not be reloaded.",
        );
      }

      setRows((prev) =>
        prev.map((row) =>
          row.id === projectId
            ? freshRow
            : row,
        ),
      );

      flashSuccess(
        "Project activated. Trusted media was verified by the server.",
      );
    } catch (e: any) {
      const msg =
        `Could not activate project — ${friendlyDbError(e)}`;

      setGlobalError(msg);
      flashError(msg);
    } finally {
      setSavingProjectId("");
    }
  }

  async function attachInvestmentPlan(projectId: string, planId: string) {
  setSavingProjectId(projectId);
  setGlobalError("");

  try {
    const { error } = await supabase
      .from("builder_projects")
      .update({
        investment_plan_master_id: planId || null,
      })
      .eq("id", projectId)
      .select("id")
      .maybeSingle();

    if (error) throw error;

    const reread = await supabase
      .from("builder_projects")
      .select(`
        id,
        builder_profile_id,
        name,
        slug,
        project_kind,
        status,
        city,
        district,
        state,
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

    if (reread.error) throw reread.error;

    const freshRow = (reread.data ?? null) as BuilderProjectRow | null;
    if (!freshRow?.id) {
      throw new Error("Project could not be reloaded after plan update.");
    }

    setRows((prev) => prev.map((r) => (r.id === projectId ? freshRow : r)));

    flashSuccess(planId ? "Investment plan attached." : "Investment plan removed.");
  } catch (e: any) {
    const msg = `Could not update project plan — ${friendlyDbError(e)}`;
    setGlobalError(msg);
    flashError(msg);
  } finally {
    setSavingProjectId("");
  }
}

  return (
    <Container>
      <SectionHeader
        title="Builder • Projects"
        subtitle="Manage your builder projects. Next step: open Units for a project → then Inventory wizard."
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Link href="/property/builder/projects/add">
              <ActionButton>Add Project</ActionButton>
            </Link>
            <Link href="/property/builder">
              <ActionButton variant="secondary">Builder Home</ActionButton>
            </Link>
            <Link href="/property">
              <ActionButton variant="secondary">Public Property</ActionButton>
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
            <Badge>Projects: {rows.length}</Badge>
            <Badge>Plans loaded: {investmentPlans.length}</Badge>
          </div>

          {rows.length === 0 ? (
            <Card>
              <CardBody>
                <div style={{ fontWeight: 900, fontSize: 16 }}>No projects yet</div>
                <div style={{ opacity: 0.8, marginTop: 6 }}>
                  Create your first builder project. Then you can generate units and connect inventory/listings.
                </div>

                <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Link href="/property/builder/projects/add">
                    <ActionButton>Add Project</ActionButton>
                  </Link>
                  <Link href="/property/builder">
                    <ActionButton variant="secondary">Builder Home</ActionButton>
                  </Link>
                </div>
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardBody>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ textAlign: "left" }}>
                        <th style={{ padding: "10px 8px", borderBottom: "1px solid #eee" }}>Project</th>
                        <th style={{ padding: "10px 8px", borderBottom: "1px solid #eee" }}>Kind</th>
                        <th style={{ padding: "10px 8px", borderBottom: "1px solid #eee" }}>Status</th>
                        <th style={{ padding: "10px 8px", borderBottom: "1px solid #eee" }}>Investment Plan</th>
                        <th style={{ padding: "10px 8px", borderBottom: "1px solid #eee" }}>Location</th>
                        <th style={{ padding: "10px 8px", borderBottom: "1px solid #eee" }}>Created</th>
                        <th style={{ padding: "10px 8px", borderBottom: "1px solid #eee", width: 420 }}>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {rows.map((r) => {
                        const loc = [r.city, r.district, r.state].filter(Boolean).join(", ");
                        const created = r.created_at ? new Date(r.created_at).toLocaleString() : "—";
                        const planTitle = r.investment_plan_master?.title?.trim() || "";
                        const planCategory = r.investment_plan_master?.category?.trim() || "";
                        const planStatus = r.investment_plan_master?.status?.trim() || "";

                        return (
                          <tr key={r.id}>
                            <td style={{ padding: "10px 8px", borderBottom: "1px solid #f2f2f2" }}>
                              <div style={{ fontWeight: 900 }}>{r.name}</div>
                              <div style={{ fontSize: 12, opacity: 0.75 }}>{r.slug}</div>
                            </td>

                            <td style={{ padding: "10px 8px", borderBottom: "1px solid #f2f2f2" }}>
                              <Badge>{r.project_kind ?? "—"}</Badge>
                            </td>

                            <td style={{ padding: "10px 8px", borderBottom: "1px solid #f2f2f2" }}>
                              <Badge>{r.status ?? "draft"}</Badge>
                            </td>

                            <td style={{ padding: "10px 8px", borderBottom: "1px solid #f2f2f2", minWidth: 260 }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {planTitle ? (
                                  <div>
                                    <div style={{ fontWeight: 800 }}>{planTitle}</div>
                                    <div style={{ fontSize: 12, opacity: 0.75 }}>
                                      {planCategory || "—"}{planStatus ? ` • ${planStatus}` : ""}
                                    </div>
                                  </div>
                                ) : (
                                  <span style={{ opacity: 0.7 }}>No plan</span>
                                )}

                                <select
                                  value={r.investment_plan_master_id ?? ""}
                                  onChange={(e) => attachInvestmentPlan(r.id, e.target.value)}
                                  disabled={savingProjectId === r.id}
                                  style={{
                                    width: "100%",
                                    padding: "8px 10px",
                                    borderRadius: 10,
                                    border: "1px solid #ddd",
                                    background: savingProjectId === r.id ? "#f7f7f7" : "white",
                                  }}
                                >
                                <option value="">Select investment plan</option>
                                  {investmentPlans.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.title} [{p.category || "—"}]
                                    </option>
                                  ))}
                                </select>

                                {savingProjectId === r.id ? (
                                  <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 700 }}>Saving…</div>
                                ) : null}
                              </div>
                            </td>

                            <td style={{ padding: "10px 8px", borderBottom: "1px solid #f2f2f2" }}>
                              <div style={{ fontSize: 13 }}>{loc || "—"}</div>
                            </td>

                            <td style={{ padding: "10px 8px", borderBottom: "1px solid #f2f2f2" }}>{created}</td>

                            <td style={{ padding: "10px 8px", borderBottom: "1px solid #f2f2f2" }}>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {String(r.status || "draft").toLowerCase() !== "active" ? (
                                  <ActionButton
                                    onClick={() => activateProject(r.id)}
                                    disabled={savingProjectId === r.id}
                                  >
                                    {savingProjectId === r.id
                                      ? "Verifying…"
                                      : "Activate Project"}
                                  </ActionButton>
                                ) : (
                                  <Badge>Trusted • Active</Badge>
                                )}

                                <ActionButton onClick={() => openUnits(r.id)}>Units</ActionButton>

                                {/* ✅ NEW BUTTON (as you wanted in screenshot) */}
                                <ActionButton variant="secondary" onClick={() => openAddUnits(r.id)}>
                                  Add Units / Property
                                </ActionButton>

                                <ActionButton variant="secondary" onClick={() => openAdminInventory(r.id)}>
                                  Admin Inventory
                                </ActionButton>

                                <ActionButton
                                  variant="secondary"
                                  onClick={() => flashError("Edit page not built yet. We will add it later.")}
                                >
                                  Edit (later)
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
                  Next step: click <b>Add Units / Property</b> → then we create multiple properties inside the project.
                </div>
              </CardBody>
            </Card>
          )}
        </>
      )}
    </Container>
  );
}
export default function BuilderProjectsPageClient() {
  return (
    <Suspense fallback={<div>Loading projects…</div>}>
      <BuilderProjectsPageInner />
    </Suspense>
  );
}
