// app/admin/dashboard/master-data/property/mapping/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

type AttrInputType =
  | "single_select"
  | "multi_select"
  | "text"
  | "number"
  | "boolean"
  | string;

type AttrRow = {
  id: string;
  name: string;
  slug: string;
  input_type: AttrInputType;
  sort_order: number | null;
  is_active: boolean | null;
};

type TypeRow = { id: string; name: string };
type SubtypeRow = { id: string; type_id: string; name: string };

type MapRow = {
  subtype_id: string;
  attribute_id: string;
  sort_order: number | null;
  is_required: boolean | null;
  is_filterable: boolean | null;
  group_name: string | null;
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

function safeBool(x: any, fallback: boolean) {
  if (x == null) return fallback;
  return !!x;
}

function safeNum(x: any) {
  if (x == null || x === "") return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function normalize(s: string) {
  return (s || "").toLowerCase().trim();
}

export default function PropertyMappingMasterPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const [types, setTypes] = useState<TypeRow[]>([]);
  const [subtypes, setSubtypes] = useState<SubtypeRow[]>([]);
  const [attrs, setAttrs] = useState<AttrRow[]>([]);

  const [typeId, setTypeId] = useState<string>("");
  const [subtypeId, setSubtypeId] = useState<string>("");

  // mapped[attribute_id] => row
  const [mapped, setMapped] = useState<Record<string, MapRow>>({});

  const [loading, setLoading] = useState(true);
  const [mappingLoading, setMappingLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // search
  const [q, setQ] = useState("");

  // right-side panel for add/edit mapping (no prompts)
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<"add" | "edit">("add");
  const [panelAttrId, setPanelAttrId] = useState<string | null>(null);

  const [form, setForm] = useState({
    sort_order: "",
    group_name: "Basic",
    is_required: false,
    is_filterable: true,
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

  /* ---------- LOADERS ---------- */
  async function loadTypesSubtypesAttrs() {
    const t = await supabase
      .from("property_types")
      .select("id,name")
      .order("sort_order", { ascending: true, nullsFirst: false });
    if (t.error) throw t.error;
    setTypes((t.data ?? []) as any);

    const s = await supabase
      .from("property_subtypes")
      .select("id,type_id,name")
      .order("sort_order", { ascending: true, nullsFirst: false });
    if (s.error) throw s.error;
    setSubtypes((s.data ?? []) as any);

    const a = await supabase
      .from("property_attributes")
      .select("id,name,slug,input_type,sort_order,is_active")
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true });
    if (a.error) throw a.error;
    setAttrs((a.data ?? []) as any);
  }

  async function loadMapping(subId: string) {
    if (!subId) {
      setMapped({});
      return;
    }

    setMappingLoading(true);
    const res = await supabase
      .from("property_subtype_attributes")
      .select("subtype_id,attribute_id,sort_order,is_required,is_filterable,group_name")
      .eq("subtype_id", subId);

    setMappingLoading(false);
    if (res.error) throw res.error;

    const map: Record<string, MapRow> = {};
    (res.data ?? []).forEach((r: any) => {
      const aid = String(r.attribute_id ?? "");
      if (!aid) return;
      map[aid] = {
        subtype_id: String(r.subtype_id),
        attribute_id: aid,
        sort_order: r.sort_order == null ? null : Number(r.sort_order),
        is_required: safeBool(r.is_required, false),
        is_filterable: safeBool(r.is_filterable, true),
        group_name: (r.group_name ?? null) as any,
      };
    });
    setMapped(map);
  }

  async function boot() {
    setLoading(true);
    setErr(null);
    try {
      await loadTypesSubtypesAttrs();
      setLoading(false);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load");
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!checking && allowed) boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking, allowed]);

  useEffect(() => {
    setErr(null);
    setPanelOpen(false);
    setPanelAttrId(null);
    loadMapping(subtypeId).catch((e: any) =>
      setErr(e?.message ?? "Failed to load mapping")
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtypeId]);

  const subtypesForType = typeId
    ? subtypes.filter((s) => s.type_id === typeId)
    : subtypes;

  const selectedSubtypeName =
    subtypes.find((s) => s.id === subtypeId)?.name ?? "";

  const attrsFiltered = useMemo(() => {
    const nq = normalize(q);
    const base = attrs;
    if (!nq) return base;
    return base.filter((a) => {
      const hay = `${a.name} ${a.slug} ${a.input_type}`.toLowerCase();
      return hay.includes(nq);
    });
  }, [attrs, q]);

  const mappedList = useMemo(() => {
    const list = attrsFiltered
      .filter((a) => !!mapped[a.id])
      .map((a) => ({ a, m: mapped[a.id] }))
      .sort((x, y) => {
        const sx = x.m?.sort_order ?? 999999;
        const sy = y.m?.sort_order ?? 999999;
        if (sx !== sy) return sx - sy;
        return x.a.name.localeCompare(y.a.name);
      });
    return list;
  }, [attrsFiltered, mapped]);

  const availableList = useMemo(() => {
    const list = attrsFiltered
      .filter((a) => !mapped[a.id])
      .sort((x, y) => x.name.localeCompare(y.name));
    return list;
  }, [attrsFiltered, mapped]);

  /* ---------- PANEL ---------- */
  function openAdd(attrId: string) {
    setErr(null);
    if (!subtypeId) {
      setErr("Select a subtype first.");
      return;
    }
    const a = attrs.find((x) => x.id === attrId);
    setPanelMode("add");
    setPanelAttrId(attrId);
    setForm({
      sort_order: a?.sort_order == null ? "" : String(a.sort_order),
      group_name: "Basic",
      is_required: false,
      is_filterable: true,
    });
    setPanelOpen(true);
  }

  function openEdit(attrId: string) {
    setErr(null);
    if (!subtypeId) {
      setErr("Select a subtype first.");
      return;
    }
    const row = mapped[attrId];
    if (!row) return;

    setPanelMode("edit");
    setPanelAttrId(attrId);
    setForm({
      sort_order: row.sort_order == null ? "" : String(row.sort_order),
      group_name: row.group_name ?? "",
      is_required: !!row.is_required,
      is_filterable: row.is_filterable !== false,
    });
    setPanelOpen(true);
  }

  async function savePanel() {
    setErr(null);
    if (!subtypeId) return setErr("Select a subtype first.");
    if (!panelAttrId) return setErr("Missing attribute id.");

    const payload = {
      subtype_id: subtypeId,
      attribute_id: panelAttrId,
      sort_order: safeNum(form.sort_order),
      group_name: (form.group_name || "").trim() ? (form.group_name || "").trim() : null,
      is_required: !!form.is_required,
      is_filterable: !!form.is_filterable,
    };

    if (payload.sort_order != null && !Number.isFinite(payload.sort_order as any)) {
      return setErr("Sort order must be a valid number or blank.");
    }

    // Upsert by (subtype_id, attribute_id) if unique exists; else fallback to update/insert.
    // We'll attempt upsert first (best UX); if it errors due to missing constraint, we fallback.
    const tryUpsert = await supabase
      .from("property_subtype_attributes")
      .upsert(payload as any, { onConflict: "subtype_id,attribute_id" });

    if (tryUpsert.error) {
      // fallback path
      if (panelMode === "edit") {
        const { error } = await supabase
          .from("property_subtype_attributes")
          .update({
            sort_order: payload.sort_order,
            group_name: payload.group_name,
            is_required: payload.is_required,
            is_filterable: payload.is_filterable,
          })
          .eq("subtype_id", subtypeId)
          .eq("attribute_id", panelAttrId);

        if (error) return setErr(error.message);
      } else {
        const { error } = await supabase
          .from("property_subtype_attributes")
          .insert(payload as any);

        if (error) return setErr(error.message);
      }
    }

    setPanelOpen(false);
    await loadMapping(subtypeId);
  }

  async function removeFromSubtype(attrId: string) {
    setErr(null);
    if (!subtypeId) return setErr("Select a subtype first.");
    const yes = confirm("Remove this attribute from subtype?");
    if (!yes) return;

    const { error } = await supabase
      .from("property_subtype_attributes")
      .delete()
      .eq("subtype_id", subtypeId)
      .eq("attribute_id", attrId);

    if (error) return setErr(error.message);
    await loadMapping(subtypeId);
  }

  /* ---------- RENDER ---------- */
  if (checking) {
    return (
      <Container>
        <SectionHeader title="Property · Mapping" subtitle="Checking access…" />
      </Container>
    );
  }

  if (!allowed) {
    return (
      <Container>
        <SectionHeader title="Property · Mapping" subtitle="Access denied" />
        <EmptyState message="master_admin access required." />
      </Container>
    );
  }

  const panelAttr = panelAttrId ? attrs.find((x) => x.id === panelAttrId) : null;

  return (
    <Container>
      <SectionHeader
        title="Property · Mapping"
        subtitle="Map attributes to subtypes (property_subtype_attributes)"
      />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <ActionButton href="/admin/dashboard/master-data" variant="secondary">
          ← Back
        </ActionButton>

        <ActionButton href="/admin/dashboard/master-data/property/taxonomy" variant="secondary">
          Taxonomy →
        </ActionButton>

        <ActionButton href="/admin/dashboard/master-data/property/attributes" variant="secondary">
          Attributes →
        </ActionButton>

        <ActionButton href="/admin/dashboard/master-data/property/values" variant="secondary">
          Values →
        </ActionButton>
      </div>

      {err ? <div style={{ color: "crimson", fontWeight: 900, marginBottom: 10 }}>{err}</div> : null}

      {loading ? (
        <EmptyState message="Loading…" />
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {/* SELECT SUBTYPE */}
          <div style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 14, padding: 12, background: "#fff" }}>
            <div style={{ fontWeight: 900, marginBottom: 10 }}>Select Subtype</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Type</div>
                <select
                  value={typeId}
                  onChange={(e) => {
                    setTypeId(e.target.value);
                    setSubtypeId("");
                    setMapped({});
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
              </div>

              <div>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Subtype</div>
                <select
                  value={subtypeId}
                  onChange={(e) => setSubtypeId(e.target.value)}
                  style={{
                    width: "100%",
                    height: 42,
                    borderRadius: 10,
                    border: "1px solid rgba(0,0,0,0.14)",
                    padding: "0 10px",
                  }}
                >
                  <option value="">— Select subtype —</option>
                  {subtypesForType.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75, lineHeight: 1.5 }}>
              Select a subtype to configure which attributes appear in the Add Property form for that subtype.
            </div>
          </div>

          {/* ATTR SEARCH */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search attributes by name / slug / type…"
              style={{
                flex: 1,
                minWidth: 260,
                height: 42,
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.14)",
                padding: "0 12px",
              }}
            />
            <Badge>{attrsFiltered.length} shown</Badge>
            {mappingLoading ? <Badge>loading mapping…</Badge> : null}
          </div>

          {/* MAPPED + AVAILABLE */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start" }}>
            {/* MAPPED */}
            <div style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 14, padding: 12, background: "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div style={{ fontWeight: 900 }}>Mapped Attributes</div>
                <Badge>{mappedList.length}</Badge>
              </div>

              {!subtypeId ? (
                <div style={{ opacity: 0.7, marginTop: 10 }}>Select a subtype to see mapped attributes.</div>
              ) : mappedList.length === 0 ? (
                <div style={{ opacity: 0.7, marginTop: 10 }}>
                  No attributes mapped yet for <b>{selectedSubtypeName || "this subtype"}</b>.
                </div>
              ) : (
                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  {mappedList.map(({ a, m }) => (
                    <div
                      key={a.id}
                      style={{
                        border: "1px solid rgba(0,0,0,0.10)",
                        borderRadius: 12,
                        padding: 10,
                        background: "rgba(37,99,235,0.06)",
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
                          <Badge>{String(a.input_type)}</Badge>
                          {a.slug ? <Badge>{a.slug}</Badge> : null}
                          {a.is_active === false ? <Badge>inactive</Badge> : <Badge>active</Badge>}
                          {m.sort_order != null ? <Badge>sort: {m.sort_order}</Badge> : <Badge>sort: —</Badge>}
                          {m.group_name ? <Badge>group: {m.group_name}</Badge> : <Badge>group: —</Badge>}
                          {m.is_required ? <Badge>required</Badge> : <Badge>optional</Badge>}
                          {m.is_filterable === false ? <Badge>not filterable</Badge> : <Badge>filterable</Badge>}
                        </div>
                        <div style={{ fontWeight: 900 }}>{a.name}</div>
                      </div>

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                        <ActionButton variant="secondary" onClick={() => openEdit(a.id)}>
                          Edit
                        </ActionButton>
                        <ActionButton variant="secondary" onClick={() => removeFromSubtype(a.id)}>
                          Remove
                        </ActionButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AVAILABLE */}
            <div style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 14, padding: 12, background: "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div style={{ fontWeight: 900 }}>Available Attributes</div>
                <Badge>{availableList.length}</Badge>
              </div>

              {!subtypeId ? (
                <div style={{ opacity: 0.7, marginTop: 10 }}>Select a subtype to add attributes.</div>
              ) : availableList.length === 0 ? (
                <div style={{ opacity: 0.7, marginTop: 10 }}>All attributes are already mapped.</div>
              ) : (
                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  {availableList.map((a) => (
                    <div
                      key={a.id}
                      style={{
                        border: "1px solid rgba(0,0,0,0.10)",
                        borderRadius: 12,
                        padding: 10,
                        background: "rgba(0,0,0,0.02)",
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
                          <Badge>{String(a.input_type)}</Badge>
                          {a.slug ? <Badge>{a.slug}</Badge> : null}
                          {a.is_active === false ? <Badge>inactive</Badge> : <Badge>active</Badge>}
                        </div>
                        <div style={{ fontWeight: 900 }}>{a.name}</div>
                      </div>

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                        <ActionButton variant="primary" onClick={() => openAdd(a.id)} disabled={!subtypeId}>
                          + Add
                        </ActionButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* PANEL */}
          {panelOpen ? (
            <div style={{ border: "2px solid #2563eb", borderRadius: 14, padding: 12, background: "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontWeight: 900 }}>
                  {panelMode === "add" ? "Add Attribute to Subtype" : "Edit Mapping"}{" "}
                  {panelAttr ? <span style={{ opacity: 0.8 }}>— {panelAttr.name}</span> : null}
                </div>
                <ActionButton variant="secondary" onClick={() => setPanelOpen(false)}>
                  Close
                </ActionButton>
              </div>

              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>Sort order (optional)</div>
                  <input
                    value={form.sort_order}
                    onChange={(e) => setForm((p) => ({ ...p, sort_order: e.target.value }))}
                    placeholder="e.g. 10"
                    inputMode="numeric"
                    style={{
                      width: "100%",
                      height: 42,
                      borderRadius: 10,
                      border: "1px solid rgba(0,0,0,0.14)",
                      padding: "0 12px",
                    }}
                  />
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                    Lower comes first in the listing form.
                  </div>
                </div>

                <div>
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>Group name (optional)</div>
                  <input
                    value={form.group_name}
                    onChange={(e) => setForm((p) => ({ ...p, group_name: e.target.value }))}
                    placeholder="e.g. Basic, Amenities, Legal"
                    style={{
                      width: "100%",
                      height: 42,
                      borderRadius: 10,
                      border: "1px solid rgba(0,0,0,0.14)",
                      padding: "0 12px",
                    }}
                  />
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                    Use groups to visually separate attributes in the Add Property page later.
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
                <label style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.is_required}
                    onChange={(e) => setForm((p) => ({ ...p, is_required: e.target.checked }))}
                  />
                  Required
                </label>

                <label style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.is_filterable}
                    onChange={(e) => setForm((p) => ({ ...p, is_filterable: e.target.checked }))}
                  />
                  Filterable
                </label>

                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  Required controls validation; Filterable controls whether you show it in search filters later.
                </div>
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <ActionButton variant="secondary" onClick={() => setPanelOpen(false)}>
                  Cancel
                </ActionButton>
                <ActionButton variant="primary" onClick={savePanel}>
                  Save Mapping
                </ActionButton>
              </div>

              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
                Subtype: <b>{selectedSubtypeName || "—"}</b>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </Container>
  );
}
