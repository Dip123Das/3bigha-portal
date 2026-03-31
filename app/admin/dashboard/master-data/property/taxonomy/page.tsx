// app/admin/dashboard/master-data/property/taxonomy/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

type TypeRow = {
  id: string;
  name: string;
  slug: string | null;
  sort_order: number | null;
};

type SubtypeRow = {
  id: string;
  type_id: string;
  name: string;
  slug: string | null;
  sort_order: number | null;
};

function isMaster(role: string | null | undefined) {
  return role === "master_admin";
}

async function requireMasterAdmin(
  supabase: ReturnType<typeof getSupabaseBrowser>
) {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) return { ok: false };

  const { data: prof } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle();

  const role = (prof as any)?.role ?? null;
  return { ok: isMaster(role) };
}

function slugify(input: string) {
  return (input || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function safeNum(x: string) {
  const t = (x ?? "").trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export default function PropertyTaxonomyMasterPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const [types, setTypes] = useState<TypeRow[]>([]);
  const [subtypes, setSubtypes] = useState<SubtypeRow[]>([]);
  const [typeId, setTypeId] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [subLoading, setSubLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // TYPE form
  const [typeFormOpen, setTypeFormOpen] = useState(false);
  const [typeMode, setTypeMode] = useState<"add" | "edit">("add");
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [typeForm, setTypeForm] = useState({
    name: "",
    slug: "",
    slugTouched: false,
    sort_order: "",
  });

  // SUBTYPE form
  const [subFormOpen, setSubFormOpen] = useState(false);
  const [subMode, setSubMode] = useState<"add" | "edit">("add");
  const [editingSubtypeId, setEditingSubtypeId] = useState<string | null>(null);
  const [subForm, setSubForm] = useState({
    name: "",
    slug: "",
    slugTouched: false,
    sort_order: "",
  });

  /* ---------- AUTH ---------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      const a = await requireMasterAdmin(supabase);
      if (!alive) return;
      if (!a.ok) {
        router.replace("/admin/dashboard");
        return;
      }
      setAllowed(true);
      setChecking(false);
    })();
    return () => {
      alive = false;
    };
  }, [router, supabase]);

  /* ---------- LOAD ---------- */
  async function loadTypes() {
    const res = await supabase
      .from("property_types")
      .select("id,name,slug,sort_order")
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true });

    if (res.error) throw res.error;
    setTypes((res.data ?? []) as any);
  }

  async function loadSubtypes(tid: string) {
    if (!tid) {
      setSubtypes([]);
      return;
    }

    setSubLoading(true);
    const res = await supabase
      .from("property_subtypes")
      .select("id,type_id,name,slug,sort_order")
      .eq("type_id", tid)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true });
    setSubLoading(false);

    if (res.error) throw res.error;
    setSubtypes((res.data ?? []) as any);
  }

  async function boot() {
    setLoading(true);
    setErr(null);
    try {
      await loadTypes();
      setLoading(false);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load taxonomy");
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!checking && allowed) boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking, allowed]);

  useEffect(() => {
    setErr(null);
    loadSubtypes(typeId).catch((e: any) =>
      setErr(e?.message ?? "Failed to load subtypes")
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeId]);

  const selectedType = useMemo(
    () => types.find((t) => t.id === typeId) ?? null,
    [types, typeId]
  );

  /* ---------- TYPE FORM ---------- */
  function openAddType() {
    setErr(null);
    setTypeMode("add");
    setEditingTypeId(null);
    setTypeForm({
      name: "",
      slug: "",
      slugTouched: false,
      sort_order: "",
    });
    setTypeFormOpen(true);
  }

  function openEditType(t: TypeRow) {
    setErr(null);
    setTypeMode("edit");
    setEditingTypeId(t.id);
    setTypeForm({
      name: t.name ?? "",
      slug: t.slug ?? "",
      slugTouched: true,
      sort_order: t.sort_order == null ? "" : String(t.sort_order),
    });
    setTypeFormOpen(true);
  }

  // auto-slug for type
  useEffect(() => {
    if (!typeFormOpen) return;
    if (typeForm.slugTouched) return;
    setTypeForm((p) => ({ ...p, slug: slugify(p.name) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeForm.name]);

  async function saveType() {
    setErr(null);
    const name = typeForm.name.trim();
    const slug = slugify(typeForm.slug.trim() || name);
    if (!name) return setErr("Type name is required.");
    if (!slug) return setErr("Type slug is required.");
    const sort_order = safeNum(typeForm.sort_order);

    const payload = { name, slug, sort_order };

    if (typeMode === "add") {
      const { error } = await supabase.from("property_types").insert(payload);
      if (error) return setErr(error.message);
    } else {
      if (!editingTypeId) return setErr("Missing type id.");
      const { error } = await supabase
        .from("property_types")
        .update(payload)
        .eq("id", editingTypeId);
      if (error) return setErr(error.message);
    }

    setTypeFormOpen(false);
    await loadTypes();
  }

  async function removeType(t: TypeRow) {
    setErr(null);
    const yes = window.confirm(
      `Delete type "${t.name}"?\n(Subtypes may block deletion if FK exists.)`
    );
    if (!yes) return;

    const { error } = await supabase.from("property_types").delete().eq("id", t.id);
    if (error) return setErr(error.message);

    if (typeId === t.id) setTypeId("");
    await loadTypes();
  }

  /* ---------- SUBTYPE FORM ---------- */
  function openAddSubtype() {
    setErr(null);
    if (!typeId) return setErr("Select a type first.");

    setSubMode("add");
    setEditingSubtypeId(null);
    setSubForm({
      name: "",
      slug: "",
      slugTouched: false,
      sort_order: "",
    });
    setSubFormOpen(true);
  }

  function openEditSubtype(s: SubtypeRow) {
    setErr(null);
    setSubMode("edit");
    setEditingSubtypeId(s.id);
    setSubForm({
      name: s.name ?? "",
      slug: s.slug ?? "",
      slugTouched: true,
      sort_order: s.sort_order == null ? "" : String(s.sort_order),
    });
    setSubFormOpen(true);
  }

  // auto-slug for subtype
  useEffect(() => {
    if (!subFormOpen) return;
    if (subForm.slugTouched) return;
    setSubForm((p) => ({ ...p, slug: slugify(p.name) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subForm.name]);

  async function saveSubtype() {
    setErr(null);
    if (!typeId) return setErr("Select a type first.");

    const name = subForm.name.trim();
    const slug = slugify(subForm.slug.trim() || name);
    if (!name) return setErr("Subtype name is required.");
    if (!slug) return setErr("Subtype slug is required.");

    const sort_order = safeNum(subForm.sort_order);
    const payload = { type_id: typeId, name, slug, sort_order };

    if (subMode === "add") {
      const { error } = await supabase.from("property_subtypes").insert(payload);
      if (error) return setErr(error.message);
    } else {
      if (!editingSubtypeId) return setErr("Missing subtype id.");
      const { error } = await supabase
        .from("property_subtypes")
        .update({ name, slug, sort_order })
        .eq("id", editingSubtypeId);
      if (error) return setErr(error.message);
    }

    setSubFormOpen(false);
    await loadSubtypes(typeId);
  }

  async function removeSubtype(s: SubtypeRow) {
    setErr(null);
    const yes = window.confirm(`Delete subtype "${s.name}"?`);
    if (!yes) return;

    const { error } = await supabase.from("property_subtypes").delete().eq("id", s.id);
    if (error) return setErr(error.message);

    await loadSubtypes(typeId);
  }

  /* ---------- RENDER ---------- */
  if (checking) {
    return (
      <Container>
        <SectionHeader title="Property · Taxonomy" subtitle="Checking access…" />
      </Container>
    );
  }

  if (!allowed) {
    return (
      <Container>
        <SectionHeader title="Property · Taxonomy" subtitle="Access denied" />
        <EmptyState message="master_admin access required." />
      </Container>
    );
  }

  return (
    <Container>
      <SectionHeader
        title="Property · Taxonomy"
        subtitle="Manage Types and Subtypes (property_types, property_subtypes)"
      />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <ActionButton href="/admin/dashboard/master-data" variant="secondary">
          ← Back
        </ActionButton>

        <ActionButton href="/admin/dashboard/master-data/property/attributes" variant="secondary">
          Attributes →
        </ActionButton>

        <ActionButton href="/admin/dashboard/master-data/property/mapping" variant="secondary">
          Mapping →
        </ActionButton>

        <ActionButton href="/admin/dashboard/master-data/property/values" variant="secondary">
          Values →
        </ActionButton>

        <ActionButton variant="primary" onClick={openAddType}>
          + Add Type
        </ActionButton>
      </div>

      {err ? (
        <div style={{ color: "crimson", fontWeight: 900, marginBottom: 10 }}>{err}</div>
      ) : null}

      {loading ? (
        <EmptyState message="Loading taxonomy…" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, alignItems: "start" }}>
          {/* TYPES */}
          <div style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 14, padding: 12, background: "#fff" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 900 }}>Property Types</div>
              <Badge>{types.length}</Badge>
            </div>

            {types.length === 0 ? (
              <div style={{ opacity: 0.7, marginTop: 10 }}>No types yet.</div>
            ) : (
              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                {types.map((t) => {
                  const selected = typeId === t.id;
                  return (
                    <div
                      key={t.id}
                      style={{
                        border: "1px solid rgba(0,0,0,0.10)",
                        borderRadius: 12,
                        padding: 10,
                        background: selected ? "rgba(37,99,235,0.06)" : "rgba(0,0,0,0.02)",
                        cursor: "pointer",
                      }}
                      onClick={() => setTypeId(t.id)}
                    >
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
                        {selected ? <Badge>selected</Badge> : null}
                        {t.sort_order != null ? <Badge>sort: {t.sort_order}</Badge> : <Badge>sort: —</Badge>}
                        {t.slug ? <Badge>{t.slug}</Badge> : <Badge>slug: —</Badge>}
                      </div>

                      <div style={{ fontWeight: 900 }}>{t.name}</div>

                      <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <ActionButton
                          variant="secondary"
                          onClick={(e: any) => {
                            e.stopPropagation();
                            openEditType(t);
                          }}
                        >
                          Edit
                        </ActionButton>

                        <ActionButton
                          variant="secondary"
                          onClick={(e: any) => {
                            e.stopPropagation();
                            removeType(t);
                          }}
                        >
                          Delete
                        </ActionButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TYPE FORM */}
            {typeFormOpen ? (
              <div style={{ marginTop: 14, border: "2px solid #2563eb", borderRadius: 14, padding: 12 }}>
                <div style={{ fontWeight: 900, marginBottom: 10 }}>
                  {typeMode === "add" ? "Add Type" : "Edit Type"}
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  <input
                    placeholder='Type name (e.g. "Residential")'
                    value={typeForm.name}
                    onChange={(e) => setTypeForm((p) => ({ ...p, name: e.target.value }))}
                    style={{ height: 42, borderRadius: 10, border: "1px solid rgba(0,0,0,0.14)", padding: "0 12px" }}
                  />

                  <input
                    placeholder="Slug (auto-generated if empty)"
                    value={typeForm.slug}
                    onChange={(e) =>
                      setTypeForm((p) => ({ ...p, slugTouched: true, slug: e.target.value }))
                    }
                    style={{ height: 42, borderRadius: 10, border: "1px solid rgba(0,0,0,0.14)", padding: "0 12px" }}
                  />

                  <input
                    placeholder="Sort order (optional)"
                    value={typeForm.sort_order}
                    onChange={(e) => setTypeForm((p) => ({ ...p, sort_order: e.target.value }))}
                    inputMode="numeric"
                    style={{ height: 42, borderRadius: 10, border: "1px solid rgba(0,0,0,0.14)", padding: "0 12px" }}
                  />

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <ActionButton variant="secondary" onClick={() => setTypeFormOpen(false)}>
                      Cancel
                    </ActionButton>
                    <ActionButton variant="primary" onClick={saveType}>
                      Save
                    </ActionButton>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* SUBTYPES */}
          <div style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 14, padding: 12, background: "#fff" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 900 }}>Subtypes</div>
              <Badge>{subtypes.length}</Badge>
            </div>

            <div style={{ marginTop: 10 }}>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Selected type</div>
              <select
                value={typeId}
                onChange={(e) => {
                  setTypeId(e.target.value);
                  setSubFormOpen(false);
                }}
                style={{
                  width: "100%",
                  height: 42,
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.14)",
                  padding: "0 10px",
                }}
              >
                <option value="">— Select type —</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
                {selectedType ? (
                  <>
                    Managing subtypes for: <b>{selectedType.name}</b>
                  </>
                ) : (
                  "Choose a type to view/create subtypes."
                )}
              </div>
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <ActionButton variant="primary" onClick={openAddSubtype} disabled={!typeId}>
                + Add Subtype
              </ActionButton>
              {subLoading ? <Badge>loading…</Badge> : null}
            </div>

            {!typeId ? (
              <div style={{ opacity: 0.7, marginTop: 12 }}>Select a type to manage its subtypes.</div>
            ) : subtypes.length === 0 ? (
              <div style={{ opacity: 0.7, marginTop: 12 }}>No subtypes yet.</div>
            ) : (
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                {subtypes.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      border: "1px solid rgba(0,0,0,0.10)",
                      borderRadius: 12,
                      padding: 10,
                      background: "rgba(0,0,0,0.02)",
                    }}
                  >
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
                      {s.sort_order != null ? <Badge>sort: {s.sort_order}</Badge> : <Badge>sort: —</Badge>}
                      {s.slug ? <Badge>{s.slug}</Badge> : <Badge>slug: —</Badge>}
                    </div>

                    <div style={{ fontWeight: 900 }}>{s.name}</div>

                    <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <ActionButton variant="secondary" onClick={() => openEditSubtype(s)}>
                        Edit
                      </ActionButton>
                      <ActionButton variant="secondary" onClick={() => removeSubtype(s)}>
                        Delete
                      </ActionButton>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* SUBTYPE FORM */}
            {subFormOpen ? (
              <div style={{ marginTop: 14, border: "2px solid #2563eb", borderRadius: 14, padding: 12 }}>
                <div style={{ fontWeight: 900, marginBottom: 10 }}>
                  {subMode === "add" ? "Add Subtype" : "Edit Subtype"}
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  <input
                    placeholder='Subtype name (e.g. "Apartment")'
                    value={subForm.name}
                    onChange={(e) => setSubForm((p) => ({ ...p, name: e.target.value }))}
                    style={{ height: 42, borderRadius: 10, border: "1px solid rgba(0,0,0,0.14)", padding: "0 12px" }}
                  />

                  <input
                    placeholder="Slug (auto-generated if empty)"
                    value={subForm.slug}
                    onChange={(e) =>
                      setSubForm((p) => ({ ...p, slugTouched: true, slug: e.target.value }))
                    }
                    style={{ height: 42, borderRadius: 10, border: "1px solid rgba(0,0,0,0.14)", padding: "0 12px" }}
                  />

                  <input
                    placeholder="Sort order (optional)"
                    value={subForm.sort_order}
                    onChange={(e) => setSubForm((p) => ({ ...p, sort_order: e.target.value }))}
                    inputMode="numeric"
                    style={{ height: 42, borderRadius: 10, border: "1px solid rgba(0,0,0,0.14)", padding: "0 12px" }}
                  />

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <ActionButton variant="secondary" onClick={() => setSubFormOpen(false)}>
                      Cancel
                    </ActionButton>
                    <ActionButton variant="primary" onClick={saveSubtype}>
                      Save
                    </ActionButton>
                  </div>
                </div>

                <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
                  Type: <b>{selectedType?.name ?? "—"}</b>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </Container>
  );
}
