// app/admin/dashboard/master-data/rentals/taxonomy/page.tsx
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

const TAXON_TABLE = "rental_taxons" as const;
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

// Soft-disable if is_active exists, otherwise hard delete
async function softDeleteTaxon(supabase: ReturnType<typeof getSupabaseBrowser>, id: string) {
  const r1 = await supabase.from(TAXON_TABLE).update({ is_active: false }).eq("id", id);
  if (!r1.error) return;

  if (looksLikeMissingColumn(r1.error, "is_active")) {
    const r2 = await supabase.from(TAXON_TABLE).delete().eq("id", id);
    if (r2.error) throw r2.error;
    return;
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

export default function RentalsTaxonomyAdmin() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // lists
  const [types, setTypes] = useState<TaxonRow[]>([]);
  const [categories, setCategories] = useState<TaxonRow[]>([]);
  const [subcategories, setSubcategories] = useState<TaxonRow[]>([]);
  const [productGroups, setProductGroups] = useState<TaxonRow[]>([]);

  // selection
  const [typeId, setTypeId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");

  const selectedType = types.find((t) => t.id === typeId) || null;
  const selectedCategory = categories.find((c) => c.id === categoryId) || null;
  const selectedSubcategory = subcategories.find((s) => s.id === subcategoryId) || null;

  // create forms
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newSort, setNewSort] = useState<number>(1);
  const [newSource, setNewSource] = useState<string>("admin");

  const currentKind: Kind = !typeId ? "type" : !categoryId ? "category" : !subcategoryId ? "subcategory" : "product_group";
  const parentForCurrent =
    currentKind === "type" ? null : currentKind === "category" ? typeId : currentKind === "subcategory" ? categoryId : subcategoryId;

  const titleForCurrent =
    currentKind === "type"
      ? "Types"
      : currentKind === "category"
      ? `Categories under: ${selectedType?.name ?? "—"}`
      : currentKind === "subcategory"
      ? `Subcategories under: ${selectedCategory?.name ?? "—"}`
      : `Product Groups under: ${selectedSubcategory?.name ?? "—"}`;

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
        if (!alive) return;

        setTypes(t);
        setLoading(false);
      } catch (e: any) {
        console.error(e);
        if (!alive) return;

        const m =
          e?.message ||
          (looksLikeMissingRelation(e, TAXON_TABLE)
            ? "Rentals taxonomy table not found in DB yet. Create rental_taxons first."
            : "Failed to load.");

        setMsg(m);
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [router, supabase]);

  // cascade
  useEffect(() => {
    let alive = true;
    (async () => {
      setCategories([]);
      setSubcategories([]);
      setProductGroups([]);
      setCategoryId("");
      setSubcategoryId("");

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

  async function refreshCurrentLists() {
    // refresh based on selection depth
    const t = await fetchTaxons(supabase, "type", null);
    setTypes(t);

    if (typeId) setCategories(await fetchTaxons(supabase, "category", typeId));
    if (categoryId) setSubcategories(await fetchTaxons(supabase, "subcategory", categoryId));
    if (subcategoryId) setProductGroups(await fetchTaxons(supabase, "product_group", subcategoryId));
  }

  async function onCreate() {
    setMsg(null);
    const name = newName.trim();
    if (!name) return;

    const slug = (newSlug.trim() || slugify(name)).toLowerCase();
    if (!slug) return;

    if (currentKind !== "type" && !parentForCurrent) {
      return setMsg("Select parent first (Type / Category / Subcategory).");
    }

    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id ?? null;

      const payload1: any = {
        parent_id: parentForCurrent,
        kind: currentKind,
        name,
        slug,
        sort_order: newSort,
        source: newSource || null,
        is_active: true,
        created_by: userId,
      };

      let { error } = await supabase.from(TAXON_TABLE).insert(payload1);

      // remove is_active if column doesn't exist
      if (error && looksLikeMissingColumn(error, "is_active")) {
        const payload2: any = {
          parent_id: parentForCurrent,
          kind: currentKind,
          name,
          slug,
          sort_order: newSort,
          source: newSource || null,
          created_by: userId,
        };
        const retry = await supabase.from(TAXON_TABLE).insert(payload2);
        error = retry.error;
      }

      // remove created_by if column doesn't exist
      if (error && looksLikeMissingColumn(error, "created_by")) {
        const payload3: any = {
          parent_id: parentForCurrent,
          kind: currentKind,
          name,
          slug,
          sort_order: newSort,
          source: newSource || null,
          is_active: true,
        };
        const retry2 = await supabase.from(TAXON_TABLE).insert(payload3);
        error = retry2.error;
      }

      if (error) throw error;

      setNewName("");
      setNewSlug("");
      setNewSort(1);
      setNewSource("admin");
      await refreshCurrentLists();
      setMsg("Created ✅");
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message || "Create failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(row: TaxonRow) {
    setMsg(null);
    setBusy(true);
    try {
      await softDeleteTaxon(supabase, row.id);

      // if removing selected item, clear downstream selections
      if (row.id === typeId) {
        setTypeId("");
        setCategoryId("");
        setSubcategoryId("");
        setCategories([]);
        setSubcategories([]);
        setProductGroups([]);
      }
      if (row.id === categoryId) {
        setCategoryId("");
        setSubcategoryId("");
        setSubcategories([]);
        setProductGroups([]);
      }
      if (row.id === subcategoryId) {
        setSubcategoryId("");
        setProductGroups([]);
      }

      await refreshCurrentLists();
      setMsg("Removed ✅");
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message || "Remove failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Container>
        <SectionHeader title="Rentals → Taxonomy" subtitle="Loading..." />
      </Container>
    );
  }

  if (!allowed) {
    return (
      <Container>
        <SectionHeader title="Rentals → Taxonomy" subtitle="Admin access required" />
        <EmptyState message="Access denied." />
      </Container>
    );
  }

  return (
    <Container>
      <div className="mtx-page">
        <SectionHeader
          title="Rentals → Taxonomy"
          subtitle={`Manage Types → Categories → Subcategories → Product Groups (role: ${role ?? "—"})`}
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
            title="Select hierarchy"
            subtitle="Pick Type → Category → Subcategory (then manage Product Groups)"
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

              <div className="mtx-selection">
                <div className="mtx-selectionHead">Current selection</div>
                <div className="mtx-pillRow">
                  <span className="mtx-pill">{selectedType ? `Type: ${selectedType.slug}` : "Type: —"}</span>
                  <span className="mtx-pill">{selectedCategory ? `Category: ${selectedCategory.slug}` : "Category: —"}</span>
                  <span className="mtx-pill">
                    {selectedSubcategory ? `Subcategory: ${selectedSubcategory.slug}` : "Subcategory: —"}
                  </span>
                </div>
              </div>

              <div className="mtx-footnote" style={{ textAlign: "left", marginTop: 0 }}>
                Tip: To add Product Groups, select a Subcategory first.
              </div>
            </div>
          </CardBox>

          <CardBox title={`Create ${currentKind}`} subtitle={titleForCurrent} right={<Badge>{TAXON_TABLE}</Badge>}>
            <div className="mtx-form">
              <div className="mtx-footnote" style={{ textAlign: "left", marginTop: 0 }}>
                Parent:{" "}
                <b>
                  {currentKind === "type"
                    ? "None"
                    : currentKind === "category"
                    ? selectedType?.name ?? "Select a Type"
                    : currentKind === "subcategory"
                    ? selectedCategory?.name ?? "Select a Category"
                    : selectedSubcategory?.name ?? "Select a Subcategory"}
                </b>
              </div>

              <div className="mtx-twoCol">
                <label className="mtx-field">
                  <span>Name</span>
                  <input
                    value={newName}
                    onChange={(e) => {
                      setNewName(e.target.value);
                      if (!newSlug.trim()) setNewSlug(slugify(e.target.value));
                    }}
                    placeholder={`e.g., ${currentKind === "type" ? "Vehicles" : currentKind === "category" ? "Cars" : currentKind === "subcategory" ? "SUV" : "Compact SUV"}`}
                  />
                </label>

                <label className="mtx-field">
                  <span>Slug</span>
                  <input value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="auto-generated" />
                </label>
              </div>

              <div className="mtx-twoCol">
                <label className="mtx-field">
                  <span>Sort order</span>
                  <input
                    type="number"
                    value={newSort}
                    onChange={(e) => setNewSort(parseInt(e.target.value || "1", 10))}
                  />
                </label>

                <label className="mtx-field">
                  <span>Source</span>
                  <input value={newSource} onChange={(e) => setNewSource(e.target.value)} placeholder="admin / seed / import" />
                </label>
              </div>

              <button className="mtx-primaryBtn" type="button" onClick={onCreate} disabled={busy || !newName.trim()}>
                {busy ? "Saving..." : `Create ${currentKind}`}
              </button>

              <div className="mtx-footnote" style={{ textAlign: "left" }}>
                Note: Slugs must be unique per your DB constraint (often unique on kind+parent+slug or global unique).
              </div>
            </div>
          </CardBox>
        </div>

        <div className="mtx-grid2 mtx-mt">
          <CardBox title="Types" subtitle="Top level (kind=type)">
            {types.length === 0 ? (
              <div className="mtx-empty">No types yet.</div>
            ) : (
              <div className="mtx-list">
                {types.map((r) => (
                  <div key={r.id} className="mtx-row">
                    <div className="mtx-rowText">
                      <div className="mtx-rowName">{r.name}</div>
                      <div className="mtx-rowSlug">
                        {r.slug} • sort: {r.sort_order ?? "-"} • source: {r.source ?? "-"}
                      </div>
                    </div>
                    <button className="mtx-ghostBtn" onClick={() => onRemove(r)} disabled={busy}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardBox>

          <CardBox title="Categories" subtitle={selectedType ? `Under: ${selectedType.name}` : "Select a Type"}>
            {!selectedType ? (
              <div className="mtx-empty">Select a Type first.</div>
            ) : categories.length === 0 ? (
              <div className="mtx-empty">No categories yet.</div>
            ) : (
              <div className="mtx-list">
                {categories.map((r) => (
                  <div key={r.id} className="mtx-row">
                    <div className="mtx-rowText">
                      <div className="mtx-rowName">{r.name}</div>
                      <div className="mtx-rowSlug">
                        {r.slug} • sort: {r.sort_order ?? "-"} • source: {r.source ?? "-"}
                      </div>
                    </div>
                    <button className="mtx-ghostBtn" onClick={() => onRemove(r)} disabled={busy}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardBox>

          <CardBox title="Subcategories" subtitle={selectedCategory ? `Under: ${selectedCategory.name}` : "Select a Category"}>
            {!selectedCategory ? (
              <div className="mtx-empty">Select a Category first.</div>
            ) : subcategories.length === 0 ? (
              <div className="mtx-empty">No subcategories yet.</div>
            ) : (
              <div className="mtx-list">
                {subcategories.map((r) => (
                  <div key={r.id} className="mtx-row">
                    <div className="mtx-rowText">
                      <div className="mtx-rowName">{r.name}</div>
                      <div className="mtx-rowSlug">
                        {r.slug} • sort: {r.sort_order ?? "-"} • source: {r.source ?? "-"}
                      </div>
                    </div>
                    <button className="mtx-ghostBtn" onClick={() => onRemove(r)} disabled={busy}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardBox>

          <CardBox title="Product Groups" subtitle={selectedSubcategory ? `Under: ${selectedSubcategory.name}` : "Select a Subcategory"}>
            {!selectedSubcategory ? (
              <div className="mtx-empty">Select a Subcategory first.</div>
            ) : productGroups.length === 0 ? (
              <div className="mtx-empty">No product groups yet.</div>
            ) : (
              <div className="mtx-list">
                {productGroups.map((r) => (
                  <div key={r.id} className="mtx-row">
                    <div className="mtx-rowText">
                      <div className="mtx-rowName">{r.name}</div>
                      <div className="mtx-rowSlug">
                        {r.slug} • sort: {r.sort_order ?? "-"} • source: {r.source ?? "-"}
                      </div>
                    </div>
                    <button className="mtx-ghostBtn" onClick={() => onRemove(r)} disabled={busy}>
                      Remove
                    </button>
                  </div>
                ))}
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
        .mtx-mt {
          margin-top: 14px;
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
