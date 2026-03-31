// app/admin/dashboard/master-data/rentals/mapping/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

type Kind = "type" | "category" | "subcategory" | "product_group";

type TaxonRow = {
  id: string;
  parent_id: string | null;
  kind: Kind;
  name: string;
  slug: string;
  sort_order: number | null;
  is_active: boolean;
  source: string | null;
};

type AttrInputType = "single_select" | "multi_select" | "text" | "number" | "boolean";

type AttrRow = {
  id: string;
  name: string;
  slug: string;
  input_type: AttrInputType | string;
  unit: string | null;
  sort_order: number | null;
  is_active?: boolean | null;
};

type PgAttrMapRow = {
  id: string;
  product_group_id: string;
  attribute_id: string;
  sort_order: number | null;
  is_required: boolean | null;
  is_active?: boolean | null;
};

const TAXON_TABLE = "rental_taxons" as const;
const ATTR_TABLE = "rental_attributes" as const;
const MAP_TABLE = "rental_product_group_attributes" as const;

const ADMIN_ROLE = "rentals_admin" as const;

function isMaster(role: string | null | undefined) {
  return role === "master_admin";
}
function isModuleAdmin(role: string | null | undefined) {
  return role === ADMIN_ROLE;
}

function looksLikeMissingColumn(err: any, col: string) {
  const msg = String(err?.message || "");
  return msg.toLowerCase().includes("does not exist") && msg.toLowerCase().includes(col.toLowerCase());
}

function looksLikeMissingRelation(err: any, rel: string) {
  const msg = String(err?.message || "");
  return msg.toLowerCase().includes("does not exist") && msg.toLowerCase().includes(rel.toLowerCase());
}

async function requireModuleAdmin(supabase: ReturnType<typeof getSupabaseBrowser>) {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return { ok: false, role: null as string | null, email: null as string | null };

  const { data: prof, error: profErr } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profErr) throw profErr;

  const role = ((prof as any)?.role ?? null) as string | null;
  const ok = isMaster(role) || isModuleAdmin(role);
  return { ok, role, email: user.email ?? null };
}

async function fetchTaxons(supabase: ReturnType<typeof getSupabaseBrowser>, kind: Kind, parentId: string | null) {
  let q = supabase
    .from(TAXON_TABLE)
    .select("id,parent_id,kind,name,slug,sort_order,is_active,source")
    .eq("kind", kind)
    .eq("is_active", true)
    .order("sort_order", { ascending: true, nullsFirst: true })
    .order("name", { ascending: true });

  if (parentId === null) q = q.is("parent_id", null);
  else q = q.eq("parent_id", parentId);

  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as TaxonRow[];
}

async function fetchAttributes(supabase: ReturnType<typeof getSupabaseBrowser>) {
  const withActive = await supabase
    .from(ATTR_TABLE)
    .select("id,name,slug,input_type,unit,sort_order,is_active")
    .order("sort_order", { ascending: true, nullsFirst: true })
    .order("name", { ascending: true });

  if (!withActive.error) return (withActive.data || []) as AttrRow[];

  if (looksLikeMissingRelation(withActive.error, ATTR_TABLE)) throw withActive.error;

  if (looksLikeMissingColumn(withActive.error, "is_active")) {
    const noActive = await supabase
      .from(ATTR_TABLE)
      .select("id,name,slug,input_type,unit,sort_order")
      .order("sort_order", { ascending: true, nullsFirst: true })
      .order("name", { ascending: true });

    if (noActive.error) throw noActive.error;
    return (noActive.data || []) as AttrRow[];
  }

  throw withActive.error;
}

async function tryFetchPgAttributeMap(supabase: ReturnType<typeof getSupabaseBrowser>, productGroupId: string) {
  const withActive = await supabase
    .from(MAP_TABLE)
    .select("id,product_group_id,attribute_id,sort_order,is_required,is_active")
    .eq("product_group_id", productGroupId)
    .order("sort_order", { ascending: true, nullsFirst: true });

  if (!withActive.error) return (withActive.data || []) as PgAttrMapRow[];

  if (looksLikeMissingRelation(withActive.error, MAP_TABLE)) throw withActive.error;

  if (looksLikeMissingColumn(withActive.error, "is_active")) {
    const noActive = await supabase
      .from(MAP_TABLE)
      .select("id,product_group_id,attribute_id,sort_order,is_required")
      .eq("product_group_id", productGroupId)
      .order("sort_order", { ascending: true, nullsFirst: true });

    if (noActive.error) throw noActive.error;
    return (noActive.data || []) as PgAttrMapRow[];
  }

  throw withActive.error;
}

function CardBox(props: { title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mtx-card">
      <div className="mtx-cardHead">
        <div>
          <div className="mtx-title">{props.title}</div>
          {props.subtitle ? <div className="mtx-subtitle">{props.subtitle}</div> : null}
        </div>
        {props.right ? <div className="mtx-right">{props.right}</div> : null}
      </div>
      <div className="mtx-cardBody">{props.children}</div>
    </section>
  );
}

export default function RentalsMappingAdmin() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // taxonomy select
  const [types, setTypes] = useState<TaxonRow[]>([]);
  const [categories, setCategories] = useState<TaxonRow[]>([]);
  const [subcategories, setSubcategories] = useState<TaxonRow[]>([]);
  const [productGroups, setProductGroups] = useState<TaxonRow[]>([]);

  const [typeId, setTypeId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [productGroupId, setProductGroupId] = useState("");

  // attributes + mapping
  const [attributes, setAttributes] = useState<AttrRow[]>([]);
  const [mappingSupported, setMappingSupported] = useState<boolean | null>(null);
  const [pgAttrMap, setPgAttrMap] = useState<PgAttrMapRow[]>([]);

  // mapping form
  const [mapAttrId, setMapAttrId] = useState<string>("");
  const [mapSort, setMapSort] = useState<number>(1);
  const [mapRequired, setMapRequired] = useState<boolean>(false);

  const selectedType = types.find((t) => t.id === typeId) || null;
  const selectedCategory = categories.find((c) => c.id === categoryId) || null;
  const selectedSubcategory = subcategories.find((s) => s.id === subcategoryId) || null;
  const selectedPG = productGroups.find((p) => p.id === productGroupId) || null;

  const mappedAttrIds = useMemo(() => new Set(pgAttrMap.map((m) => m.attribute_id)), [pgAttrMap]);

  // boot
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setMsg(null);

        const a = await requireModuleAdmin(supabase);
        if (!alive) return;

        setAllowed(a.ok);
        setRole(a.role);
        setEmail(a.email);

        if (!a.ok) {
          setLoading(false);
          router.replace("/admin/dashboard");
          return;
        }

        const t = await fetchTaxons(supabase, "type", null);
        const attrs = await fetchAttributes(supabase);

        if (!alive) return;
        setTypes(t);
        setAttributes(attrs);

        setLoading(false);
      } catch (e: any) {
        console.error(e);
        if (!alive) return;

        const m =
          e?.message ||
          (looksLikeMissingRelation(e, ATTR_TABLE) || looksLikeMissingRelation(e, MAP_TABLE) || looksLikeMissingRelation(e, TAXON_TABLE)
            ? "Rentals master tables not found in DB yet. Create the Rentals tables first."
            : "Failed to load.");

        setMsg(m);
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [router, supabase]);

  // cascade taxonomy
  useEffect(() => {
    let alive = true;
    (async () => {
      setCategories([]);
      setSubcategories([]);
      setProductGroups([]);
      setCategoryId("");
      setSubcategoryId("");
      setProductGroupId("");

      setPgAttrMap([]);
      setMappingSupported(null);

      if (!typeId) return;

      try {
        const c = await fetchTaxons(supabase, "category", typeId);
        if (!alive) return;
        setCategories(c);
      } catch (e: any) {
        if (!alive) return;
        setMsg(e?.message || "Failed to load categories.");
      }
    })();
    return () => void (alive = false);
  }, [typeId, supabase]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setSubcategories([]);
      setProductGroups([]);
      setSubcategoryId("");
      setProductGroupId("");

      setPgAttrMap([]);
      setMappingSupported(null);

      if (!categoryId) return;

      try {
        const s = await fetchTaxons(supabase, "subcategory", categoryId);
        if (!alive) return;
        setSubcategories(s);
      } catch (e: any) {
        if (!alive) return;
        setMsg(e?.message || "Failed to load subcategories.");
      }
    })();
    return () => void (alive = false);
  }, [categoryId, supabase]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setProductGroups([]);
      setProductGroupId("");

      setPgAttrMap([]);
      setMappingSupported(null);

      if (!subcategoryId) return;

      try {
        const p = await fetchTaxons(supabase, "product_group", subcategoryId);
        if (!alive) return;
        setProductGroups(p);
      } catch (e: any) {
        if (!alive) return;
        setMsg(e?.message || "Failed to load product groups.");
      }
    })();
    return () => void (alive = false);
  }, [subcategoryId, supabase]);

  // load mapping when PG selected
  useEffect(() => {
    let alive = true;
    (async () => {
      setPgAttrMap([]);
      setMappingSupported(null);

      if (!productGroupId) return;

      try {
        const m = await tryFetchPgAttributeMap(supabase, productGroupId);
        if (!alive) return;
        setPgAttrMap(m);
        setMappingSupported(true);
      } catch (e: any) {
        // table missing / no access / RLS
        if (!alive) return;
        setMappingSupported(false);
        // keep it quiet unless it’s a real error
        if (!looksLikeMissingRelation(e, MAP_TABLE)) setMsg(e?.message || "Mapping not available.");
      }
    })();
    return () => void (alive = false);
  }, [productGroupId, supabase]);

  async function refreshMap() {
    if (!productGroupId) return;
    const m = await tryFetchPgAttributeMap(supabase, productGroupId);
    setPgAttrMap(m);
  }

  async function onMap() {
    setMsg(null);
    if (!productGroupId) return setMsg("Select a Product Group first.");
    if (!mappingSupported) return setMsg(`Mapping table not found / not accessible: ${MAP_TABLE}`);
    if (!mapAttrId) return setMsg("Select an attribute to map.");

    if (mappedAttrIds.has(mapAttrId)) {
      return setMsg("Already mapped. Choose another attribute.");
    }

    setBusy(true);
    try {
      const payload1: any = {
        product_group_id: productGroupId,
        attribute_id: mapAttrId,
        sort_order: mapSort,
        is_required: mapRequired,
        is_active: true,
      };

      let { error } = await supabase.from(MAP_TABLE).insert(payload1);

      if (error && looksLikeMissingColumn(error, "is_active")) {
        const payload2: any = {
          product_group_id: productGroupId,
          attribute_id: mapAttrId,
          sort_order: mapSort,
          is_required: mapRequired,
        };
        const retry = await supabase.from(MAP_TABLE).insert(payload2);
        error = retry.error;
      }

      if (error) throw error;

      setMapAttrId("");
      setMapSort(1);
      setMapRequired(false);

      await refreshMap();
      setMsg("Mapped ✅");
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message || "Mapping failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onUnmap(row: PgAttrMapRow) {
    setMsg(null);
    if (!mappingSupported) return;

    setBusy(true);
    try {
      let { error } = await supabase.from(MAP_TABLE).update({ is_active: false }).eq("id", row.id);
      if (error && looksLikeMissingColumn(error, "is_active")) {
        const del = await supabase.from(MAP_TABLE).delete().eq("id", row.id);
        error = del.error;
      }
      if (error) throw error;

      await refreshMap();
      setMsg("Unmapped ✅");
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message || "Unmap failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Container>
        <SectionHeader title="Rentals → Mapping" subtitle="Loading..." />
      </Container>
    );
  }

  if (!allowed) {
    return (
      <Container>
        <SectionHeader title="Rentals → Mapping" subtitle="Admin access required" />
        <EmptyState message="Access denied." />
      </Container>
    );
  }

  return (
    <Container>
      <div className="mtx-page">
        <SectionHeader
          title="Rentals → Mapping"
          subtitle={`Map Attributes to Product Groups (role: ${role ?? "—"})`}
        />

        <div className="mtx-topbar">
          <div className="mtx-actions">
            <ActionButton href="/admin/dashboard/master-data" variant="secondary">
              ← Back to Master Data
            </ActionButton>

            <ActionButton href="/admin/dashboard/master-data/rentals/taxonomy" variant="secondary">
              Taxonomy
            </ActionButton>
            <ActionButton href="/admin/dashboard/master-data/rentals/mapping" variant="secondary">
              Mapping
            </ActionButton>
            <ActionButton href="/admin/dashboard/master-data/rentals/attributes" variant="secondary">
              Attributes
            </ActionButton>
            <ActionButton href="/admin/dashboard/master-data/rentals/values" variant="secondary">
              Values
            </ActionButton>
          </div>

          <div className="mtx-status">{msg ? <Badge>{msg}</Badge> : null}</div>
        </div>

        <div className="mtx-grid2">
          <CardBox
            title="Select Product Group"
            subtitle="Pick Type → Category → Subcategory → Product Group"
            right={
              <div className="mtx-chipCol">
                <span className="mtx-chip">{email ?? "—"}</span>
                <span className="mtx-chip subtle">role: {role ?? "—"}</span>
              </div>
            }
          >
            <div className="mtx-form">
              <label className="mtx-field">
                <span>Type</span>
                <select value={typeId} onChange={(e) => setTypeId(e.target.value)}>
                  <option value="">— Select Type —</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.slug})
                    </option>
                  ))}
                </select>
              </label>

              <label className="mtx-field">
                <span>Category</span>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} disabled={!typeId}>
                  <option value="">{typeId ? "— Select Category —" : "Select a Type first"}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.slug})
                    </option>
                  ))}
                </select>
              </label>

              <label className="mtx-field">
                <span>Subcategory</span>
                <select value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)} disabled={!categoryId}>
                  <option value="">{categoryId ? "— Select Subcategory —" : "Select a Category first"}</option>
                  {subcategories.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.slug})
                    </option>
                  ))}
                </select>
              </label>

              <label className="mtx-field">
                <span>Product Group</span>
                <select value={productGroupId} onChange={(e) => setProductGroupId(e.target.value)} disabled={!subcategoryId}>
                  <option value="">{subcategoryId ? "— Select Product Group —" : "Select a Subcategory first"}</option>
                  {productGroups.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.slug})
                    </option>
                  ))}
                </select>
              </label>

              <div className="mtx-selection">
                <div className="mtx-selectionHead">Current selection</div>
                <div className="mtx-pillRow">
                  <span className="mtx-pill">{selectedType ? `Type: ${selectedType.slug}` : "Type: —"}</span>
                  <span className="mtx-pill">{selectedCategory ? `Category: ${selectedCategory.slug}` : "Category: —"}</span>
                  <span className="mtx-pill">
                    {selectedSubcategory ? `Subcategory: ${selectedSubcategory.slug}` : "Subcategory: —"}
                  </span>
                  <span className="mtx-pill">{selectedPG ? `PG: ${selectedPG.slug}` : "PG: —"}</span>
                </div>
              </div>

              <div className="mtx-footnote" style={{ textAlign: "left" }}>
                Mapping table:{" "}
                <b>{mappingSupported === null ? "Select PG to check…" : mappingSupported ? "Detected ✅" : "Not found ⚠️"}</b>
              </div>
            </div>
          </CardBox>

          <CardBox title="Map Attribute → Product Group" subtitle={`Create rows in ${MAP_TABLE}`} right={<Badge>{MAP_TABLE}</Badge>}>
            {!productGroupId ? (
              <div className="mtx-empty">Select a Product Group first.</div>
            ) : !mappingSupported ? (
              <div className="mtx-empty">
                Mapping is disabled. Create/allow access to <b>{MAP_TABLE}</b> (and RLS) then refresh.
              </div>
            ) : (
              <div className="mtx-form">
                <label className="mtx-field">
                  <span>Attribute</span>
                  <select value={mapAttrId} onChange={(e) => setMapAttrId(e.target.value)} disabled={!productGroupId}>
                    <option value="">— Select Attribute —</option>
                    {attributes.map((a) => (
                      <option key={a.id} value={a.id} disabled={mappedAttrIds.has(a.id)}>
                        {a.name} ({a.input_type}){mappedAttrIds.has(a.id) ? " — mapped" : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="mtx-twoCol">
                  <label className="mtx-field">
                    <span>Sort</span>
                    <input
                      type="number"
                      value={mapSort}
                      onChange={(e) => setMapSort(parseInt(e.target.value || "1", 10))}
                      disabled={!productGroupId}
                    />
                  </label>

                  <label className="mtx-checkRow">
                    <input
                      type="checkbox"
                      checked={mapRequired}
                      onChange={(e) => setMapRequired(e.target.checked)}
                      disabled={!productGroupId}
                    />
                    <span>Required</span>
                  </label>
                </div>

                <button className="mtx-primaryBtn" type="button" onClick={onMap} disabled={busy || !mapAttrId || !productGroupId}>
                  {busy ? "Saving..." : "Map"}
                </button>

                <div className="mtx-divider" />

                <div className="mtx-title" style={{ fontSize: 14 }}>
                  Mapped attributes (selected PG)
                </div>

                {pgAttrMap.length === 0 ? (
                  <div className="mtx-empty">No attributes mapped yet.</div>
                ) : (
                  <div className="mtx-list">
                    {pgAttrMap.slice(0, 120).map((r) => {
                      const a = attributes.find((x) => x.id === r.attribute_id) || null;
                      return (
                        <div key={r.id} className="mtx-row">
                          <div className="mtx-rowText">
                            <div className="mtx-rowName">{a ? a.name : r.attribute_id}</div>
                            <div className="mtx-rowSlug">
                              sort: {r.sort_order ?? "-"} • required: {r.is_required ? "yes" : "no"}
                              {a ? ` • type: ${a.input_type}` : ""}
                            </div>
                          </div>
                          <button className="mtx-ghostBtn" onClick={() => onUnmap(r)} disabled={busy}>
                            Unmap
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mtx-footnote" style={{ textAlign: "left" }}>
                  Note: “Unmap” soft-disables if <b>is_active</b> exists; otherwise it deletes the row.
                </div>
              </div>
            )}
          </CardBox>
        </div>
      </div>

      {/* SAME CSS */}
      <style jsx>{`
        .mtx-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          margin: 12px 0 16px;
        }
        .mtx-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .mtx-status {
          display: flex;
          justify-content: flex-end;
          min-height: 24px;
        }
        .mtx-grid2 {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }
        @media (min-width: 980px) {
          .mtx-grid2 {
            grid-template-columns: 1fr 1fr;
          }
        }

        .mtx-card {
          background: #fff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 14px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
          overflow: hidden;
        }
        .mtx-cardHead {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 14px 10px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        }
        .mtx-cardBody {
          padding: 14px;
        }

        .mtx-title {
          font-size: 15px;
          font-weight: 800;
        }
        .mtx-subtitle {
          margin-top: 4px;
          font-size: 13px;
          opacity: 0.75;
          line-height: 1.35;
        }
        .mtx-right {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
          align-items: center;
        }

        .mtx-chipCol {
          display: grid;
          gap: 6px;
          justify-items: end;
        }
        .mtx-chip {
          font-size: 12px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(0, 0, 0, 0.12);
          background: rgba(0, 0, 0, 0.02);
          white-space: nowrap;
        }
        .mtx-chip.subtle {
          opacity: 0.7;
        }

        .mtx-form {
          display: grid;
          gap: 12px;
        }

        .mtx-field {
          display: grid;
          gap: 6px;
        }
        .mtx-field > span {
          font-size: 12px;
          opacity: 0.75;
        }

        .mtx-field select,
        .mtx-field input {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          height: 42px;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid rgba(0, 0, 0, 0.18);
          background: #fff;
          font-size: 14px;
          outline: none;
        }
        .mtx-field select:disabled,
        .mtx-field input:disabled {
          background: rgba(0, 0, 0, 0.03);
          opacity: 0.7;
        }
        .mtx-field select:focus,
        .mtx-field input:focus {
          border-color: rgba(0, 0, 0, 0.35);
          box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.06);
        }

        .mtx-twoCol {
          display: grid;
          gap: 12px;
          grid-template-columns: 1fr;
        }
        @media (min-width: 760px) {
          .mtx-twoCol {
            grid-template-columns: 1fr 1fr;
          }
        }

        .mtx-checkRow {
          display: flex;
          align-items: center;
          gap: 10px;
          height: 42px;
          padding: 0 12px;
          border-radius: 10px;
          border: 1px solid rgba(0, 0, 0, 0.18);
          background: #fff;
        }
        .mtx-checkRow input {
          width: 16px;
          height: 16px;
        }
        .mtx-checkRow span {
          font-size: 13px;
          font-weight: 800;
          opacity: 0.9;
        }

        .mtx-primaryBtn {
          height: 44px;
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.18);
          background: #111;
          color: #fff;
          font-weight: 900;
          cursor: pointer;
        }
        .mtx-primaryBtn:disabled {
          background: rgba(0, 0, 0, 0.08);
          color: rgba(0, 0, 0, 0.35);
          cursor: not-allowed;
        }

        .mtx-ghostBtn {
          height: 40px;
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.18);
          background: #fff;
          font-weight: 800;
          cursor: pointer;
        }
        .mtx-ghostBtn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .mtx-divider {
          height: 1px;
          background: rgba(0, 0, 0, 0.06);
          margin: 4px 0;
        }

        .mtx-list {
          display: grid;
          gap: 10px;
        }
        .mtx-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          border: 1px solid rgba(0, 0, 0, 0.06);
          border-radius: 12px;
          padding: 10px 12px;
          background: rgba(0, 0, 0, 0.01);
        }
        .mtx-rowText {
          display: grid;
          gap: 4px;
          min-width: 0;
        }
        .mtx-rowName {
          font-weight: 900;
          font-size: 13px;
          word-break: break-word;
        }
        .mtx-rowSlug {
          font-size: 12px;
          opacity: 0.75;
          word-break: break-word;
        }

        .mtx-empty {
          font-size: 13px;
          opacity: 0.7;
          padding: 4px 0;
        }

        .mtx-selection {
          border: 1px solid rgba(0, 0, 0, 0.06);
          border-radius: 12px;
          padding: 10px 12px;
          background: rgba(0, 0, 0, 0.01);
        }
        .mtx-selectionHead {
          font-size: 12px;
          font-weight: 900;
          opacity: 0.7;
          margin-bottom: 8px;
        }
        .mtx-pillRow {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .mtx-pill {
          font-size: 12px;
          font-weight: 900;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(0, 0, 0, 0.12);
          background: #fff;
          white-space: nowrap;
        }

        .mtx-footnote {
          margin-top: 12px;
          font-size: 13px;
          opacity: 0.7;
          text-align: right;
        }
      `}</style>
    </Container>
  );
}
