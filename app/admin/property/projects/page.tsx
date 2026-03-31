// app/admin/property/projects/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody, CardFooter } from "@/components/ui/Card";
import { Grid } from "@/components/ui/Grid";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

type CatalogKind = "plot" | "apartment" | "villa" | "commercial" | string;

type ProjectRow = {
  id: string;
  owner_user_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  country: string | null;
  is_active: boolean;
  updated_at: string;
};

type CatalogRow = {
  id: string;
  project_id: string;
  kind: CatalogKind;
  name: string;
  slug: string;
  sort_order: number | null;
  is_active: boolean;
  updated_at: string;
};

function slugify(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function numOrNull(v: string) {
  const t = (v ?? "").trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function MessageBox(props: { title: string; description?: string }) {
  return (
    <div style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: 16 }}>
      <div style={{ fontWeight: 900, marginBottom: 6 }}>{props.title}</div>
      {props.description ? <div style={{ opacity: 0.8, lineHeight: 1.5 }}>{props.description}</div> : null}
    </div>
  );
}

async function requirePropertyOrMasterAdmin(supabase: ReturnType<typeof getSupabaseBrowser>) {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) return { ok: false, email: null as string | null };

  const email = session.user.email ?? null;

  const { data: ok, error } = await supabase.rpc("is_current_user_property_or_master_admin");
  if (error) return { ok: false, email };

  return { ok: !!ok, email };
}

export default function AdminBuilderProjectsMasterPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [guardLoading, setGuardLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);

  const [err, setErr] = useState<string | null>(null);

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const [catalogs, setCatalogs] = useState<CatalogRow[]>([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      const a = await requirePropertyOrMasterAdmin(supabase);
      if (!alive) return;

      if (!a.ok) {
        // If not logged in, send to login; else send to dashboard
        const { data } = await supabase.auth.getSession();
        if (!data.session?.user) {
          router.replace(`/login?next=${encodeURIComponent("/admin/property/projects")}`);
        } else {
          router.replace("/admin/dashboard");
        }
        return;
      }

      setEmail(a.email);
      setAllowed(true);
      setGuardLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [router, supabase]);

  async function loadProjects() {
    setErr(null);
    setLoadingProjects(true);

    const res = await supabase
      .from("builder_projects")
      .select("id,owner_user_id,name,slug,description,city,district,state,country,is_active,updated_at")
      .order("name", { ascending: true });

    if (res.error) setErr(res.error.message);
    setProjects((res.data ?? []) as any);

    // auto-select first project if none selected
    const firstId = (res.data ?? [])[0]?.id ? String((res.data ?? [])[0].id) : "";
    setSelectedProjectId((prev) => prev || firstId);

    setLoadingProjects(false);
  }

  async function loadCatalogs(projectId: string) {
    if (!projectId) {
      setCatalogs([]);
      return;
    }

    setErr(null);
    setLoadingCatalogs(true);

    const res = await supabase
      .from("builder_project_catalogs")
      .select("id,project_id,kind,name,slug,sort_order,is_active,updated_at")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true });

    if (res.error) setErr(res.error.message);
    setCatalogs((res.data ?? []) as any);

    setLoadingCatalogs(false);
  }

  useEffect(() => {
    if (!allowed) return;
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  useEffect(() => {
    if (!allowed) return;
    loadCatalogs(selectedProjectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId]);

  async function createProject() {
    setErr(null);

    const name = (window.prompt("Project name:", "") ?? "").trim();
    if (!name) return;

    const slugDefault = slugify(name);
    const slug = (window.prompt("Project slug:", slugDefault) ?? "").trim();
    if (!slug) return;

    const city = (window.prompt("City (optional):", "") ?? "").trim() || null;
    const district = (window.prompt("District (optional):", "") ?? "").trim() || null;
    const state = (window.prompt("State (optional):", "") ?? "").trim() || null;
    const country = (window.prompt("Country (optional):", "India") ?? "").trim() || null;
    const description = (window.prompt("Description (optional):", "") ?? "").trim() || null;

    const is_active = window.confirm("Set project as ACTIVE?\n\nOK = active, Cancel = inactive");

    const { data: sess } = await supabase.auth.getSession();
    const owner_user_id = sess.session?.user?.id ?? null;

    const { error } = await supabase.from("builder_projects").insert({
      owner_user_id,
      name,
      slug,
      city,
      district,
      state,
      country,
      description,
      is_active,
    });

    if (error) return setErr(error.message);

    await loadProjects();
  }

  async function editProject(p: ProjectRow) {
    setErr(null);

    const name = (window.prompt("Project name:", p.name) ?? "").trim();
    if (!name) return;

    const slug = (window.prompt("Project slug:", p.slug) ?? "").trim();
    if (!slug) return;

    const city = (window.prompt("City (optional):", p.city ?? "") ?? "").trim() || null;
    const district = (window.prompt("District (optional):", p.district ?? "") ?? "").trim() || null;
    const state = (window.prompt("State (optional):", p.state ?? "") ?? "").trim() || null;
    const country = (window.prompt("Country (optional):", p.country ?? "India") ?? "").trim() || null;
    const description = (window.prompt("Description (optional):", p.description ?? "") ?? "").trim() || null;

    const is_active = window.confirm("Set project as ACTIVE?\n\nOK = active, Cancel = inactive");

    const { error } = await supabase
      .from("builder_projects")
      .update({ name, slug, city, district, state, country, description, is_active })
      .eq("id", p.id);

    if (error) return setErr(error.message);

    await loadProjects();
    await loadCatalogs(selectedProjectId);
  }

  async function deleteProject(p: ProjectRow) {
    setErr(null);

    const yes = window.confirm(`Delete project "${p.name}"?\n\nWARNING: This will delete all its catalogs (cascade).`);
    if (!yes) return;

    const { error } = await supabase.from("builder_projects").delete().eq("id", p.id);
    if (error) return setErr(error.message);

    if (selectedProjectId === p.id) setSelectedProjectId("");
    await loadProjects();
    await loadCatalogs("");
  }

  async function createCatalog() {
    setErr(null);
    if (!selectedProjectId) {
      setErr("Select a project first.");
      return;
    }

    const kind = ((window.prompt("Catalog kind: plot | apartment | villa | commercial", "plot") ?? "") as CatalogKind).trim();

    if (!["plot", "apartment", "villa", "commercial"].includes(kind)) {
      setErr("Invalid kind. Use: plot | apartment | villa | commercial");
      return;
    }

    const name = (window.prompt("Catalog name (e.g. Phase 1 Plots / Tower A Flats / Shops):", "") ?? "").trim();
    if (!name) return;

    const slugDefault = slugify(name);
    const slug = (window.prompt("Catalog slug:", slugDefault) ?? "").trim();
    if (!slug) return;

    const sort_order = numOrNull(window.prompt("Sort order (optional integer):", "") ?? "");
    const is_active = window.confirm("Set catalog as ACTIVE?\n\nOK = active, Cancel = inactive");

    const { error } = await supabase.from("builder_project_catalogs").insert({
      project_id: selectedProjectId,
      kind,
      name,
      slug,
      sort_order,
      is_active,
    });

    if (error) return setErr(error.message);

    await loadCatalogs(selectedProjectId);
  }

  async function editCatalog(c: CatalogRow) {
    setErr(null);

    const kind = ((window.prompt("Catalog kind: plot | apartment | villa | commercial", c.kind) ?? "") as CatalogKind).trim();

    if (!["plot", "apartment", "villa", "commercial"].includes(kind)) {
      setErr("Invalid kind. Use: plot | apartment | villa | commercial");
      return;
    }

    const name = (window.prompt("Catalog name:", c.name) ?? "").trim();
    if (!name) return;

    const slug = (window.prompt("Catalog slug:", c.slug) ?? "").trim();
    if (!slug) return;

    const sort_order = numOrNull(
      window.prompt("Sort order (optional integer):", c.sort_order == null ? "" : String(c.sort_order)) ?? ""
    );

    const is_active = window.confirm("Set catalog as ACTIVE?\n\nOK = active, Cancel = inactive");

    const { error } = await supabase
      .from("builder_project_catalogs")
      .update({ kind, name, slug, sort_order, is_active })
      .eq("id", c.id);

    if (error) return setErr(error.message);

    await loadCatalogs(selectedProjectId);
  }

  async function deleteCatalog(c: CatalogRow) {
    setErr(null);

    const yes = window.confirm(`Delete catalog "${c.name}"?`);
    if (!yes) return;

    const { error } = await supabase.from("builder_project_catalogs").delete().eq("id", c.id);
    if (error) return setErr(error.message);

    await loadCatalogs(selectedProjectId);
  }

  if (guardLoading) {
    return (
      <Container>
        <SectionHeader title="Builder Projects" subtitle="Loading…" />
      </Container>
    );
  }

  if (!allowed) {
    return (
      <Container>
        <SectionHeader title="Builder Projects" subtitle="Access denied" />
        <EmptyState message="master_admin OR property_admin access required." />
      </Container>
    );
  }

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  return (
    <Container>
      <SectionHeader
        title="Builder Projects · Master Data"
        subtitle="Create projects and add multiple catalogs (plots, flats, villas, commercial) inside each project."
      />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        <ActionButton href="/admin/property" variant="secondary">
          ← Back to Property Admin
        </ActionButton>

        <ActionButton variant="secondary" onClick={() => loadProjects()}>
          Refresh
        </ActionButton>

        <ActionButton variant="primary" onClick={() => createProject()}>
          + Add Project
        </ActionButton>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Badge>{email ?? "—"}</Badge>
          <Badge>access: master_admin / property_admin</Badge>
        </div>
      </div>

      {err ? <div style={{ marginBottom: 12, color: "crimson", fontWeight: 900 }}>{err}</div> : null}

      <Grid>
        {/* LEFT: Projects */}
        <Card>
          <CardBody>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>Projects</div>
              {loadingProjects ? <Badge>Loading…</Badge> : <Badge>{projects.length} total</Badge>}
            </div>

            {projects.length === 0 ? (
              <MessageBox title="No builder projects yet" description="Click “Add Project” to create the first project." />
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {projects.map((p) => {
                  const active = p.id === selectedProjectId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProjectId(p.id)}
                      style={{
                        textAlign: "left",
                        width: "100%",
                        borderRadius: 12,
                        border: active ? "2px solid rgba(11,94,215,0.45)" : "1px solid rgba(0,0,0,0.10)",
                        background: active ? "rgba(11,94,215,0.06)" : "#fff",
                        padding: 12,
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontWeight: 900 }}>
                            {p.name} {!p.is_active ? <span style={{ opacity: 0.6 }}>(inactive)</span> : null}
                          </div>
                          <div style={{ opacity: 0.75, fontSize: 13 }}>
                            slug: <b>{p.slug}</b> • updated: {fmt(p.updated_at)}
                          </div>
                          <div style={{ opacity: 0.75, fontSize: 13 }}>
                            {(p.city ?? "—")}
                            {p.district ? `, ${p.district}` : ""}
                            {p.state ? `, ${p.state}` : ""}
                            {p.country ? `, ${p.country}` : ""}
                          </div>
                        </div>

                        <div
                          style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => editProject(p)}
                            style={{
                              height: 34,
                              padding: "0 12px",
                              borderRadius: 10,
                              border: "1px solid rgba(0,0,0,0.14)",
                              background: "#fff",
                              fontWeight: 900,
                              cursor: "pointer",
                            }}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteProject(p)}
                            style={{
                              height: 34,
                              padding: "0 12px",
                              borderRadius: 10,
                              border: "1px solid rgba(220,20,60,0.35)",
                              background: "#fff",
                              color: "crimson",
                              fontWeight: 900,
                              cursor: "pointer",
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        {/* RIGHT: Catalogs for selected project */}
        <Card>
          <CardBody>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>Catalogs (inside project)</div>
              {loadingCatalogs ? <Badge>Loading…</Badge> : <Badge>{catalogs.length} total</Badge>}
            </div>

            {!selectedProject ? (
              <MessageBox title="Select a project" description="Choose a project on the left to manage its catalogs." />
            ) : (
              <>
                <div style={{ marginBottom: 10, opacity: 0.85 }}>
                  <b>Project:</b> {selectedProject.name} <span style={{ opacity: 0.7 }}>({selectedProject.slug})</span>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                  <ActionButton variant="primary" onClick={() => createCatalog()}>
                    + Add Catalog
                  </ActionButton>
                  <ActionButton variant="secondary" onClick={() => loadCatalogs(selectedProjectId)}>
                    Refresh Catalogs
                  </ActionButton>
                </div>

                {catalogs.length === 0 ? (
                  <MessageBox
                    title="No catalogs yet"
                    description="Add catalogs like: “Phase 1 Plots”, “Tower A Flats”, “Commercial Shops”, “Duplex Villas”."
                  />
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {catalogs.map((c) => (
                      <div
                        key={c.id}
                        style={{
                          border: "1px solid rgba(0,0,0,0.10)",
                          borderRadius: 12,
                          padding: 12,
                          background: "rgba(0,0,0,0.02)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                          <div>
                            <div style={{ fontWeight: 900 }}>
                              {c.name} {!c.is_active ? <span style={{ opacity: 0.6 }}>(inactive)</span> : null}
                            </div>

                            <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <Badge>{String(c.kind).toUpperCase()}</Badge>
                              <Badge>slug: {c.slug}</Badge>
                              <Badge>sort: {c.sort_order ?? "—"}</Badge>
                              <Badge>updated: {fmt(c.updated_at)}</Badge>
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                            <ActionButton variant="secondary" onClick={() => editCatalog(c)}>
                              Edit
                            </ActionButton>
                            <ActionButton variant="secondary" onClick={() => deleteCatalog(c)}>
                              Delete
                            </ActionButton>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardBody>

          <CardFooter>
            <div style={{ width: "100%", fontSize: 12, opacity: 0.8, lineHeight: 1.5 }}>
              <b>What is a catalog?</b> A catalog is a “product line” inside a project. Example: one project can have{" "}
              <b>plots</b> + <b>apartments</b> + <b>villas</b> + <b>commercial shops</b>.
            </div>
          </CardFooter>
        </Card>
      </Grid>
    </Container>
  );
}
