// app/admin/dashboard/master-data/rentals/values/page.tsx
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

type AttrValueRow = {
  id: string;
  attribute_id: string;
  value: string;
  sort_order: number | null;
  is_active?: boolean | null;
  product_group_id?: string | null;
};

const TAXON_TABLE = "rental_taxons" as const;
const ATTR_TABLE = "rental_attributes" as const;
const VALUE_TABLE = "rental_attribute_values" as const;

const ADMIN_ROLE = "rentals_admin" as const;

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

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

/**
 * IMPORTANT:
 * Keep SELECT strings literal (no dynamic concat), otherwise TS may emit
 * ParserError<"Unexpected input: ,product_group_id">
 */
async function fetchAttributeValues(
  supabase: ReturnType<typeof getSupabaseBrowser>,
  attributeId: string,
  productGroupId: string | null,
  supportsPgScopedValues: boolean,
  wantPgScopedFilter: boolean
) {
  if (supportsPgScopedValues && wantPgScopedFilter) {
    let q = supabase
      .from(VALUE_TABLE)
      .select("id,attribute_id,value,sort_order,is_active,product_group_id")
      .eq("attribute_id", attributeId)
      .order("sort_order", { ascending: true, nullsFirst: true })
      .order("value", { ascending: true });

    if (productGroupId === null) q = q.is("product_group_id", null);
    else q = q.eq("product_group_id", productGroupId);

    const r1 = await q;
    if (!r1.error) return (r1.data || []) as AttrValueRow[];

    if (looksLikeMissingRelation(r1.error, VALUE_TABLE)) throw r1.error;

    if (looksLikeMissingColumn(r1.error, "is_active")) {
      let q2 = supabase
        .from(VALUE_TABLE)
        .select("id,attribute_id,value,sort_order,product_group_id")
        .eq("attribute_id", attributeId)
        .order("sort_order", { ascending: true, nullsFirst: true })
        .order("value", { ascending: true });

      if (productGroupId === null) q2 = q2.is("product_group_id", null);
      else q2 = q2.eq("product_group_id", productGroupId);

      const r2 = await q2;
      if (r2.error) throw r2.error;
      return (r2.data || []) as AttrValueRow[];
    }

    throw r1.error;
  }

  const r1 = await supabase
    .from(VALUE_TABLE)
    .select("id,attribute_id,value,sort_order,is_active")
    .eq("attribute_id", attributeId)
    .order("sort_order", { ascending: true, nullsFirst: true })
    .order("value", { ascending: true });

  if (!r1.error) return (r1.data || []) as AttrValueRow[];
  if (looksLikeMissingRelation(r1.error, VALUE_TABLE)) throw r1.error;

  if (looksLikeMissingColumn(r1.error, "is_active")) {
    const r2 = await supabase
      .from(VALUE_TABLE)
      .select("id,attribute_id,value,sort_order")
      .eq("attribute_id", attributeId)
      .order("sort_order", { ascending: true, nullsFirst: true })
      .order("value", { ascending: true });

    if (r2.error) throw r2.error;
    return (r2.data || []) as AttrValueRow[];
  }

  throw r1.error;
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

export default function RentalsValuesAdmin() {
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

  // attributes + values
  const [attributes, setAttributes] = useState<AttrRow[]>([]);
  const [selectedAttrId, setSelectedAttrId] = useState<string>("");

  const [valuesMode, setValuesMode] = useState<"global" | "product_group">("global");
  const [values, setValues] = useState<AttrValueRow[]>([]);
  const [supportsPgScopedValues, setSupportsPgScopedValues] = useState<boolean>(false);

  // create value form
  const [vValue, setVValue] = useState("");
  const [vSort, setVSort] = useState<number>(1);

  const selectedPG = productGroups.find((p) => p.id === productGroupId) || null;

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

        // detect product_group_id
        let pgScoped = false;
        const probe = await supabase.from(VALUE_TABLE).select("id,product_group_id").limit(1);
        if (!probe.error) pgScoped = true;
        else if (looksLikeMissingColumn(probe.error, "product_group_id")) pgScoped = false;
        else if (looksLikeMissingRelation(probe.error, VALUE_TABLE)) throw probe.error;
        else pgScoped = false;

        if (!alive) return;
        setSupportsPgScopedValues(pgScoped);

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
          (looksLikeMissingRelation(e, ATTR_TABLE) || looksLikeMissingRelation(e, VALUE_TABLE) || looksLikeMissingRelation(e, TAXON_TABLE)
            ? "Rentals master tables not found in DB yet. Create the Rentals tables first (OPTION A SQL)."
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

  // if DB doesn't support PG-scoped values, force global tab
  useEffect(() => {
    if (valuesMode === "product_group" && !supportsPgScopedValues) setValuesMode("global");
  }, [valuesMode, supportsPgScopedValues]);

  // load values
  useEffect(() => {
    let alive = true;
    (async () => {
      setValues([]);
      if (!selectedAttrId) return;

      if (valuesMode === "product_group" && (!supportsPgScopedValues || !productGroupId)) return;

      try {
        if (supportsPgScopedValues) {
          if (valuesMode === "global") {
            const vg = await fetchAttributeValues(supabase, selectedAttrId, null, true, true);
            if (!alive) return;
            setValues(vg);
          } else {
            const vp = await fetchAttributeValues(supabase, selectedAttrId, productGroupId, true, true);
            if (!alive) return;
            setValues(vp);
          }
        } else {
          const v = await fetchAttributeValues(supabase, selectedAttrId, null, false, false);
          if (!alive) return;
          setValues(v);
        }
      } catch (e: any) {
        console.error(e);
        if (!alive) return;

        if (looksLikeMissingColumn(e, "product_group_id")) {
          setSupportsPgScopedValues(false);
          setValuesMode("global");
          try {
            const vg = await fetchAttributeValues(supabase, selectedAttrId, null, false, false);
            if (!alive) return;
            setValues(vg);
          } catch (e2: any) {
            if (!alive) return;
            setMsg(e2?.message || "Failed to load values.");
          }
          return;
        }

        setMsg(e?.message || "Failed to load values.");
      }
    })();

    return () => void (alive = false);
  }, [selectedAttrId, valuesMode, productGroupId, supportsPgScopedValues, supabase]);

  async function refreshValues() {
    if (!selectedAttrId) return;
    if (valuesMode === "product_group" && (!supportsPgScopedValues || !productGroupId)) return;

    if (supportsPgScopedValues) {
      if (valuesMode === "global") setValues(await fetchAttributeValues(supabase, selectedAttrId, null, true, true));
      else setValues(await fetchAttributeValues(supabase, selectedAttrId, productGroupId, true, true));
    } else {
      setValues(await fetchAttributeValues(supabase, selectedAttrId, null, false, false));
    }
  }

  async function onCreateValue() {
    setMsg(null);
    if (!selectedAttrId) return setMsg("Select an attribute first.");

    if (valuesMode === "product_group" && (!supportsPgScopedValues || !productGroupId)) {
      return setMsg("Select a Product Group to add PG-specific values.");
    }

    const value = vValue.trim();
    if (!value) return;

    setBusy(true);
    try {
      const base: any = {
        attribute_id: selectedAttrId,
        value,
        sort_order: vSort,
        is_active: true,
      };

      if (supportsPgScopedValues && valuesMode === "product_group") {
        base.product_group_id = productGroupId;
      }

      let { error } = await supabase.from(VALUE_TABLE).insert(base);

      if (error && looksLikeMissingColumn(error, "is_active")) {
        const base2: any = { attribute_id: selectedAttrId, value, sort_order: vSort };
        if (supportsPgScopedValues && valuesMode === "product_group") base2.product_group_id = productGroupId;
        const retry = await supabase.from(VALUE_TABLE).insert(base2);
        error = retry.error;
      }

      if (error && looksLikeMissingColumn(error, "product_group_id")) {
        setSupportsPgScopedValues(false);
        setValuesMode("global");
        const base3: any = { attribute_id: selectedAttrId, value, sort_order: vSort, is_active: true };
        const retry2 = await supabase.from(VALUE_TABLE).insert(base3);
        error = retry2.error;
      }

      if (error) throw error;

      setVValue("");
      setVSort(1);
      await refreshValues();
      setMsg("Value created ✅");
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message || "Create value failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onRemoveValue(row: AttrValueRow) {
    setMsg(null);
    setBusy(true);
    try {
      let { error } = await supabase.from(VALUE_TABLE).update({ is_active: false }).eq("id", row.id);
      if (error && looksLikeMissingColumn(error, "is_active")) {
        const del = await supabase.from(VALUE_TABLE).delete().eq("id", row.id);
        error = del.error;
      }
      if (error) throw error;

      await refreshValues();
      setMsg("Value removed ✅");
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message || "Remove value failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Container>
        <SectionHeader title="Rentals → Values Manager" subtitle="Loading..." />
      </Container>
    );
  }

  if (!allowed) {
    return (
      <Container>
        <SectionHeader title="Rentals → Values Manager" subtitle="Admin access required" />
        <EmptyState message="Access denied." />
      </Container>
    );
  }

  const valuesTitle =
    valuesMode === "global"
      ? supportsPgScopedValues
        ? "Global values (shared)"
        : "Values (global)"
      : "Values for selected Product Group";

  const valuesSubtitle =
    valuesMode === "global"
      ? supportsPgScopedValues
        ? "Only product_group_id = NULL"
        : "Applies everywhere"
      : selectedPG
      ? `Product Group: ${selectedPG.name}`
      : "Select a Product Group first";

  return (
    <Container>
      <div className="mtx-page">
        <SectionHeader
          title="Rentals → Values Manager"
          subtitle={`Manage Attribute Values (role: ${role ?? "—"})`}
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
            title="Scope"
            subtitle="Pick Type → Category → Subcategory → Product Group (only needed for PG-specific values)"
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

              <div className="mtx-footnote" style={{ textAlign: "left" }}>
                {supportsPgScopedValues ? (
                  <span style={{ opacity: 0.8 }}>(PG-specific values supported)</span>
                ) : (
                  <span style={{ opacity: 0.8 }}>(Global values only)</span>
                )}
              </div>
            </div>
          </CardBox>

          <CardBox title="Select Attribute" subtitle={`Pick one attribute from ${ATTR_TABLE}`} right={<Badge>{ATTR_TABLE}</Badge>}>
            <div className="mtx-form">
              <label className="mtx-field">
                <span>Attribute</span>
                <select value={selectedAttrId} onChange={(e) => setSelectedAttrId(e.target.value)}>
                  <option value="">— Select Attribute —</option>
                  {attributes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.input_type})
                    </option>
                  ))}
                </select>
              </label>

              <div className="mtx-footnote" style={{ textAlign: "left", marginTop: 0 }}>
                Tip: only <b>single_select</b> / <b>multi_select</b> really need values.
              </div>
            </div>
          </CardBox>
        </div>

        <div className="mtx-grid2 mtx-mt">
          <CardBox
            title={valuesTitle}
            subtitle={valuesSubtitle}
            right={
              <div className="mtx-right">
                <div className="mtx-tabRow">
                  <button
                    className={`mtx-tab ${valuesMode === "global" ? "active" : ""}`}
                    onClick={() => setValuesMode("global")}
                    type="button"
                  >
                    Global values
                  </button>
                  <button
                    className={`mtx-tab ${valuesMode === "product_group" ? "active" : ""}`}
                    onClick={() => setValuesMode("product_group")}
                    type="button"
                    disabled={!supportsPgScopedValues}
                    title={!supportsPgScopedValues ? "Enable PG-scoped values in DB (product_group_id column)." : ""}
                  >
                    Values for selected Product Group
                  </button>
                </div>
              </div>
            }
          >
            <div className="mtx-form">
              <div className="mtx-footnote" style={{ textAlign: "left", marginTop: 0 }}>
                {supportsPgScopedValues ? (
                  valuesMode === "global" ? (
                    <b>(product_group_id IS NULL)</b>
                  ) : (
                    <b>(product_group_id = selected PG)</b>
                  )
                ) : (
                  <b>(global-only table)</b>
                )}
              </div>

              <div className="mtx-twoCol">
                <label className="mtx-field">
                  <span>Value</span>
                  <input
                    value={vValue}
                    onChange={(e) => setVValue(e.target.value)}
                    placeholder="e.g., Petrol / Diesel / Electric"
                    disabled={!selectedAttrId || (valuesMode === "product_group" && !productGroupId)}
                  />
                </label>

                <label className="mtx-field">
                  <span>Sort</span>
                  <input
                    type="number"
                    value={vSort}
                    onChange={(e) => setVSort(parseInt(e.target.value || "1", 10))}
                    disabled={!selectedAttrId || (valuesMode === "product_group" && !productGroupId)}
                  />
                </label>
              </div>

              <button
                className="mtx-primaryBtn"
                type="button"
                onClick={onCreateValue}
                disabled={
                  busy ||
                  !selectedAttrId ||
                  !vValue.trim() ||
                  (valuesMode === "product_group" && (!supportsPgScopedValues || !productGroupId))
                }
              >
                {busy ? "Saving..." : "Add Value"}
              </button>

              <div className="mtx-divider" />

              <div className="mtx-title" style={{ fontSize: 14 }}>
                Existing values
              </div>

              {!selectedAttrId ? (
                <div className="mtx-empty">Select an attribute first.</div>
              ) : valuesMode === "product_group" && !productGroupId ? (
                <div className="mtx-empty">Select a Product Group to view/add PG-specific values.</div>
              ) : values.length === 0 ? (
                <div className="mtx-empty">No values yet.</div>
              ) : (
                <div className="mtx-list">
                  {values.slice(0, 120).map((r) => (
                    <div key={r.id} className="mtx-row">
                      <div className="mtx-rowText">
                        <div className="mtx-rowName">{r.value}</div>
                        <div className="mtx-rowSlug">
                          sort: {r.sort_order ?? "-"}
                          {supportsPgScopedValues ? (
                            <>
                              {" "}
                              • pg:{" "}
                              {r.product_group_id ? (
                                <span style={{ fontWeight: 700 }}>{r.product_group_id}</span>
                              ) : (
                                <span style={{ opacity: 0.75 }}>GLOBAL</span>
                              )}
                            </>
                          ) : null}
                        </div>
                      </div>
                      <button className="mtx-ghostBtn" onClick={() => onRemoveValue(r)} disabled={busy}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mtx-footnote" style={{ textAlign: "left" }}>
                Note: “Remove” soft-disables if <b>is_active</b> exists; otherwise it deletes the row.
              </div>
            </div>
          </CardBox>

          <CardBox
            title="Quick tips"
            subtitle="Common patterns"
            right={<Badge>{VALUE_TABLE}</Badge>}
          >
            <div className="mtx-form">
              <div className="mtx-empty">
                • Use <b>Global values</b> for shared enums (e.g., Fuel Type).
              </div>
              <div className="mtx-empty">
                • Use <b>PG-specific values</b> only when different product groups need different options.
              </div>
              <div className="mtx-empty">
                • Keep sort orders small: 1, 2, 3…
              </div>
            </div>
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
        .mtx-mt {
          margin-top: 14px;
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

        .mtx-tabRow {
          display: inline-flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .mtx-tab {
          height: 34px;
          padding: 0 10px;
          border-radius: 999px;
          border: 1px solid rgba(0, 0, 0, 0.16);
          background: #fff;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }
        .mtx-tab:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .mtx-tab.active {
          background: rgba(0, 0, 0, 0.08);
          border-color: rgba(0, 0, 0, 0.22);
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