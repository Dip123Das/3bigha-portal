// app/admin/dashboard/master-data/materials/taxonomy/page.tsx
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
};

type SubcatPgMapRow = {
  subcategory_id: string;
  product_group_id: string;
  is_active: boolean;
};

function isMaster(role: string | null | undefined) {
  return role === "master_admin";
}
function isMaterialsAdmin(role: string | null | undefined) {
  return role === "materials_admin";
}

async function requireMaterialsAdmin(supabase: ReturnType<typeof getSupabaseBrowser>) {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return { ok: false, role: null as string | null };

  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = ((prof as any)?.role ?? null) as string | null;
  const ok = isMaster(role) || isMaterialsAdmin(role);
  return { ok, role };
}

async function fetchChildren(supabase: ReturnType<typeof getSupabaseBrowser>, kind: Kind, parentId: string | null) {
  const q = supabase
    .from("material_taxons")
    .select("id,parent_id,kind,name,slug,sort_order,is_active")
    .eq("kind", kind)
    .eq("is_active", true)
    .order("sort_order", { ascending: true, nullsFirst: true })
    .order("name", { ascending: true });

  if (parentId === null) q.is("parent_id", null);
  else q.eq("parent_id", parentId);

  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as TaxonRow[];
}

async function getNextSortOrder(
  supabase: ReturnType<typeof getSupabaseBrowser>,
  kind: Kind,
  parentId: string | null
): Promise<number> {
  const q = supabase
    .from("material_taxons")
    .select("sort_order")
    .eq("kind", kind)
    .eq("is_active", true)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (parentId === null) q.is("parent_id", null);
  else q.eq("parent_id", parentId);

  const { data, error } = await q;
  if (error) throw error;

  const maxSort = (data?.[0]?.sort_order ?? 0) as number;
  const next = Number.isFinite(maxSort) ? maxSort + 1 : 1;
  return next <= 0 ? 1 : next;
}

function kindLabel(k: Kind) {
  if (k === "type") return "Type";
  if (k === "category") return "Category";
  if (k === "subcategory") return "Subcategory";
  return "Product Group";
}

function slugify(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function CardBox(props: { title: any; subtitle?: string; right?: React.ReactNode; children: React.ReactNode }) {
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

/**
 * SAFE DELETE POLICY (A):
 * - allow delete only if:
 *   1) no active children under this taxon
 *   2) no material_listings rows reference this taxon in the relevant FK column
 */
async function hasActiveChildren(supabase: ReturnType<typeof getSupabaseBrowser>, id: string) {
  const { data, error } = await supabase.from("material_taxons").select("id").eq("parent_id", id).eq("is_active", true).limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

function listingColumnForKind(kind: Kind): "type_id" | "category_id" | "subcategory_id" | "product_group_id" {
  if (kind === "type") return "type_id";
  if (kind === "category") return "category_id";
  if (kind === "subcategory") return "subcategory_id";
  return "product_group_id";
}

async function hasListingReferences(supabase: ReturnType<typeof getSupabaseBrowser>, kind: Kind, id: string) {
  const col = listingColumnForKind(kind);
  const { data, error } = await supabase.from("material_listings").select("id").eq(col, id).limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

// ===============================
// NEW: Global Product Groups + subcategory mapping
// ===============================
async function fetchGlobalProductGroups(supabase: ReturnType<typeof getSupabaseBrowser>) {
  // Product Groups are global (parent_id is NULL)
  return fetchChildren(supabase, "product_group", null);
}

async function fetchSubcategoryProductGroupMap(supabase: ReturnType<typeof getSupabaseBrowser>, subcategoryId: string) {
  const { data, error } = await supabase
    .from("material_subcategory_product_groups")
    .select("subcategory_id,product_group_id,is_active")
    .eq("subcategory_id", subcategoryId)
    .maybeSingle();

  if (error) throw error;
  return (data || null) as SubcatPgMapRow | null;
}

async function upsertSubcategoryProductGroup(
  supabase: ReturnType<typeof getSupabaseBrowser>,
  subcategoryId: string,
  productGroupId: string
) {
  const { error } = await supabase.from("material_subcategory_product_groups").upsert(
    {
      subcategory_id: subcategoryId,
      product_group_id: productGroupId,
      is_active: true,
    },
    { onConflict: "subcategory_id" }
  );

  if (error) throw error;
}

export default function MaterialsTaxonomyAdmin() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [adminOk, setAdminOk] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  const [types, setTypes] = useState<TaxonRow[]>([]);
  const [categories, setCategories] = useState<TaxonRow[]>([]);
  const [subcategories, setSubcategories] = useState<TaxonRow[]>([]);

  // NEW: global product groups list
  const [globalProductGroups, setGlobalProductGroups] = useState<TaxonRow[]>([]);

  // NEW: currently assigned product group for selected subcategory
  const [assignedPgId, setAssignedPgId] = useState<string>("");
  const [assignedPgRow, setAssignedPgRow] = useState<TaxonRow | null>(null);

  const [typeId, setTypeId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [subcategoryId, setSubcategoryId] = useState<string>("");

  // CREATE FORM
  const [formKind, setFormKind] = useState<Kind>("type");
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [slugLocked, setSlugLocked] = useState(false);
  const [formSort, setFormSort] = useState<number>(1);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [lastCreated, setLastCreated] = useState<{ kind: Kind; name: string; slug: string; sort_order: number } | null>(null);
  const [sortTouched, setSortTouched] = useState(false);

  // EDIT MODE
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSort, setEditSort] = useState<number>(1);

  useEffect(() => {
    let alive = true;

    (async () => {
      const a = await requireMaterialsAdmin(supabase);
      if (!alive) return;

      setAdminOk(a.ok);
      setRole(a.role);

      if (!a.ok) {
        router.replace("/admin/dashboard");
        return;
      }

      const t = await fetchChildren(supabase, "type", null);
      const gp = await fetchGlobalProductGroups(supabase);

      if (!alive) return;

      setTypes(t);
      setGlobalProductGroups(gp);
      setLoading(false);
    })().catch((e: any) => {
      console.error(e);
      setMsg(e?.message || "Failed to load taxonomy.");
      setLoading(false);
    });

    return () => {
      alive = false;
    };
  }, [router, supabase]);

  // load categories on type change
  useEffect(() => {
    let alive = true;
    (async () => {
      setCategories([]);
      setSubcategories([]);
      setCategoryId("");
      setSubcategoryId("");
      setAssignedPgId("");
      setAssignedPgRow(null);

      if (!typeId) return;
      const c = await fetchChildren(supabase, "category", typeId);
      if (!alive) return;
      setCategories(c);
    })().catch((e: any) => setMsg(e?.message || "Failed to load categories."));
    return () => {
      alive = false;
    };
  }, [typeId, supabase]);

  // load subcategories on category change
  useEffect(() => {
    let alive = true;
    (async () => {
      setSubcategories([]);
      setSubcategoryId("");
      setAssignedPgId("");
      setAssignedPgRow(null);

      if (!categoryId) return;
      const s = await fetchChildren(supabase, "subcategory", categoryId);
      if (!alive) return;
      setSubcategories(s);
    })().catch((e: any) => setMsg(e?.message || "Failed to load subcategories."));
    return () => {
      alive = false;
    };
  }, [categoryId, supabase]);

  // NEW: when subcategory selected, load its assigned product group (single mapping)
  useEffect(() => {
    let alive = true;
    (async () => {
      setAssignedPgId("");
      setAssignedPgRow(null);

      if (!subcategoryId) return;

      const map = await fetchSubcategoryProductGroupMap(supabase, subcategoryId);
      if (!alive) return;

      if (map?.product_group_id) {
        setAssignedPgId(map.product_group_id);
        const row = globalProductGroups.find((x) => x.id === map.product_group_id) || null;
        setAssignedPgRow(row);
      }
    })().catch((e: any) => setMsg(e?.message || "Failed to load subcategory → product group mapping."));
    return () => {
      alive = false;
    };
  }, [subcategoryId, supabase, globalProductGroups]);

  // inferred parent for create form
  const inferredParentId = useMemo(() => {
    if (formKind === "type") return null;
    if (formKind === "category") return typeId || null;
    if (formKind === "subcategory") return categoryId || null;

    // IMPORTANT: product groups are GLOBAL now
    return null;
  }, [formKind, typeId, categoryId]);

  const selectedType = types.find((x) => x.id === typeId) || null;
  const selectedCategory = categories.find((x) => x.id === categoryId) || null;
  const selectedSubcategory = subcategories.find((x) => x.id === subcategoryId) || null;

  const inferredParentLabel = useMemo(() => {
    if (formKind === "type") return "No parent (top-level)";
    if (formKind === "category") return selectedType ? `Type: ${selectedType.name}` : "Pick a Type first";
    if (formKind === "subcategory") return selectedCategory ? `Category: ${selectedCategory.name}` : "Pick a Category first";
    // product_group
    return "No parent (GLOBAL Product Group)";
  }, [formKind, selectedType, selectedCategory]);

  const canCreate = useMemo(() => {
    if (!formName.trim()) return false;
    if (formKind === "category" && !typeId) return false;
    if (formKind === "subcategory" && !categoryId) return false;
    // product_group does NOT require subcategory now
    return true;
  }, [formKind, formName, typeId, categoryId]);

  async function refresh(kind: Kind) {
    if (kind === "type") setTypes(await fetchChildren(supabase, "type", null));
    if (kind === "category" && typeId) setCategories(await fetchChildren(supabase, "category", typeId));
    if (kind === "subcategory" && categoryId) setSubcategories(await fetchChildren(supabase, "subcategory", categoryId));
    if (kind === "product_group") setGlobalProductGroups(await fetchGlobalProductGroups(supabase));
  }

  // suggest next sort on parent/kind changes
  useEffect(() => {
    let alive = true;
    (async () => {
      setSortTouched(false);

      if (formKind === "category" && !typeId) return;
      if (formKind === "subcategory" && !categoryId) return;

      // product_group is global => parent null
      const next = await getNextSortOrder(supabase, formKind, inferredParentId);
      if (!alive) return;
      setFormSort(next);
    })().catch(() => {});
    return () => {
      alive = false;
    };
  }, [formKind, inferredParentId, typeId, categoryId, supabase]);

  // slug auto from name unless user edits
  useEffect(() => {
    if (slugLocked) return;
    setFormSlug(slugify(formName));
  }, [formName, slugLocked]);

  // reset slug lock on kind/parent change
  useEffect(() => {
    setSlugLocked(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formKind, inferredParentId]);

  async function onCreate() {
    setMsg(null);
    setLastCreated(null);
    if (!canCreate) return;

    const name = formName.trim();
    const slug = (formSlug.trim() || slugify(name)) as string;

    setBusy(true);
    try {
      // For product_group: create OR reuse (global)
      if (formKind === "product_group") {
        // check existing
        const { data: existing, error: exErr } = await supabase
          .from("material_taxons")
          .select("id,kind,name,slug,parent_id,sort_order,is_active")
          .eq("kind", "product_group")
          .eq("slug", slug)
          .maybeSingle();

        if (exErr) throw exErr;

        if (existing?.id) {
          // reuse existing
          setLastCreated({ kind: "product_group", name: existing.name, slug: existing.slug, sort_order: existing.sort_order ?? 1 });
          setMsg(`Reused ✅ Product Group: ${existing.name} (slug already existed)`);

          // refresh list
          await refresh("product_group");

          // If a subcategory is selected, auto-assign it now (big UX improvement)
          if (subcategoryId) {
            await upsertSubcategoryProductGroup(supabase, subcategoryId, existing.id);
            setAssignedPgId(existing.id);
            setAssignedPgRow((existing as any) as TaxonRow);
            setMsg(`Assigned ✅ Subcategory → Product Group: ${selectedSubcategory?.name ?? "Subcategory"} → ${existing.name}`);
          }

          setFormName("");
          setFormSlug("");
          setSlugLocked(false);
          return;
        }
      }

      // Normal insert for all kinds (including NEW product_group when not found)
      const { error } = await supabase.from("material_taxons").insert({
        kind: formKind,
        parent_id: inferredParentId,
        name,
        slug,
        sort_order: formSort,
        is_active: true,
      });

      if (error) throw error;

      await refresh(formKind);

      setLastCreated({ kind: formKind, name, slug, sort_order: formSort });

      if (formKind === "product_group" && subcategoryId) {
        // auto-assign newly created product group to selected subcategory
        const { data: pgRow, error: pgErr } = await supabase
          .from("material_taxons")
          .select("id,kind,name,slug,parent_id,sort_order,is_active")
          .eq("kind", "product_group")
          .eq("slug", slug)
          .maybeSingle();

        if (pgErr) throw pgErr;
        if (pgRow?.id) {
          await upsertSubcategoryProductGroup(supabase, subcategoryId, pgRow.id);
          setAssignedPgId(pgRow.id);
          setAssignedPgRow((pgRow as any) as TaxonRow);
          setMsg(`Created + Assigned ✅ Product Group: ${name} → ${selectedSubcategory?.name ?? "Subcategory"}`);
        } else {
          setMsg(`Created ✅ ${kindLabel(formKind)}: ${name}`);
        }
      } else {
        setMsg(`Created ✅ ${kindLabel(formKind)}: ${name}`);
      }

      setFormName("");
      setFormSlug("");
      setSlugLocked(false);
    } catch (e: any) {
      console.error(e);
      const m = String(e?.message || "");
      if (m.toLowerCase().includes("slug") && (e?.code === "23505" || m.toLowerCase().includes("duplicate"))) {
        setMsg(`Slug already exists for ${kindLabel(formKind)}. For Product Group, it will be reused — try again or just Assign below.`);
      } else {
        setMsg(e?.message || "Create failed.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function onAssignProductGroup() {
    setMsg(null);
    if (!subcategoryId) return setMsg("Select a Subcategory first.");
    if (!assignedPgId) return setMsg("Select a Product Group to assign.");

    setBusy(true);
    try {
      await upsertSubcategoryProductGroup(supabase, subcategoryId, assignedPgId);
      const row = globalProductGroups.find((x) => x.id === assignedPgId) || null;
      setAssignedPgRow(row);
      setMsg(`Assigned ✅ ${selectedSubcategory?.name ?? "Subcategory"} → ${row?.name ?? "Product Group"}`);
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message || "Assign failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onDisable(row: TaxonRow) {
    setMsg(null);
    setBusy(true);
    try {
      const { error } = await supabase.from("material_taxons").update({ is_active: false }).eq("id", row.id);
      if (error) throw error;
      await refresh(row.kind);
      setMsg("Disabled (soft removed).");
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message || "Disable failed.");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(row: TaxonRow) {
    setMsg(null);
    setEditingId(row.id);
    setEditName(row.name);
    setEditSort(row.sort_order ?? 1);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditSort(1);
  }

  async function saveEdit(row: TaxonRow) {
    setMsg(null);
    const nextName = editName.trim();
    if (!nextName) return setMsg("Name cannot be empty.");

    const nextSort = Number.isFinite(editSort) ? editSort : 1;

    setBusy(true);
    try {
      const { error } = await supabase.from("material_taxons").update({ name: nextName, sort_order: nextSort }).eq("id", row.id);
      if (error) throw error;

      await refresh(row.kind);
      setMsg("Updated ✅");
      cancelEdit();
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message || "Update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(row: TaxonRow) {
    setMsg(null);
    setBusy(true);
    try {
      const children = await hasActiveChildren(supabase, row.id);
      if (children) {
        setMsg("Cannot delete: this item has active children. Disable or remove children first.");
        return;
      }

      const refs = await hasListingReferences(supabase, row.kind, row.id);
      if (refs) {
        setMsg("Cannot delete: this item is referenced by material listings. Use Disable instead.");
        return;
      }

      const ok = window.confirm(`Delete permanently?\n\n${kindLabel(row.kind)}: ${row.name}\nslug: ${row.slug}`);
      if (!ok) return;

      const { error } = await supabase.from("material_taxons").delete().eq("id", row.id);
      if (error) throw error;

      await refresh(row.kind);
      setMsg("Deleted ✅");
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message || "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Container>
        <SectionHeader title="Materials Taxonomy" subtitle="Loading..." />
      </Container>
    );
  }

  if (!adminOk) {
    return (
      <Container>
        <SectionHeader title="Materials Taxonomy" subtitle="Admin access required" />
        <EmptyState message="Access denied." />
      </Container>
    );
  }

  return (
    <Container>
      <div className="mtx-page">
        <SectionHeader title="Materials → Taxonomy Manager" subtitle={`Type → Category → Subcategory → Product Group (role: ${role ?? "—"})`} />

        <div className="mtx-topbar">
          <div className="mtx-actions">
            <ActionButton href="/admin/dashboard/master-data" variant="secondary">
              ← Back to Master Data
            </ActionButton>
            <ActionButton href="/admin/dashboard/master-data/materials/attributes" variant="secondary">
              Attributes →
            </ActionButton>
            <ActionButton href="/admin/dashboard/master-data/materials/mapping" variant="secondary">
              Mapping →
            </ActionButton>
          </div>

          <div className="mtx-status">{msg ? <Badge>{msg}</Badge> : null}</div>
        </div>

        <div className="mtx-grid2">
          <CardBox title="Select path" subtitle="Choose a chain to manage taxonomy and assign Product Group." right={<div className="mtx-chipCol"><span className="mtx-chip">Active only</span><span className="mtx-chip subtle">Sorted by order → name</span></div>}>
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

              {/* NEW: Assign (single) Product Group to Subcategory */}
              <label className="mtx-field">
                <span>
                  Product Group for this Subcategory <span className="mtx-advancedBadge">Locked</span>
                </span>
                <select
                  value={assignedPgId}
                  onChange={(e) => {
                    setAssignedPgId(e.target.value);
                    const row = globalProductGroups.find((x) => x.id === e.target.value) || null;
                    setAssignedPgRow(row);
                  }}
                  disabled={!subcategoryId}
                >
                  <option value="">{subcategoryId ? "— Select Product Group —" : "Select a Subcategory first"}</option>
                  {globalProductGroups.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.slug})
                    </option>
                  ))}
                </select>

                <div className="mtx-help">
                  <b>Rule:</b> One Subcategory → One Product Group. Multiple subcategories can reuse the same product group (e.g., OPC43/OPC53/PPC → Cement).
                </div>

                <button className="mtx-primaryBtn" type="button" onClick={onAssignProductGroup} disabled={!subcategoryId || !assignedPgId || busy}>
                  {busy ? "Saving..." : "Assign Product Group"}
                </button>

                {assignedPgRow && selectedSubcategory ? (
                  <div className="mtx-hint">
                    Assigned: <b>{selectedSubcategory.name}</b> → <b>{assignedPgRow.name}</b> (slug: {assignedPgRow.slug})
                  </div>
                ) : null}
              </label>
            </div>
          </CardBox>

          <CardBox title="Create new node" subtitle="Adds a row into material_taxons (active). Product Groups are GLOBAL now." right={<Badge>material_taxons</Badge>}>
            <div className="mtx-form">
              <label className="mtx-field">
                <span>Level</span>
                <select value={formKind} onChange={(e) => setFormKind(e.target.value as Kind)}>
                  <option value="type">Type</option>
                  <option value="category">Category</option>
                  <option value="subcategory">Subcategory</option>
                  <option value="product_group">Product Group (GLOBAL)</option>
                </select>
              </label>

              <div className="mtx-parentBox">
                <div className="mtx-parentTop">
                  <div className="mtx-parentTitle">Parent</div>
                  <div className="mtx-parentKind">{kindLabel(formKind)}</div>
                </div>
                <div className="mtx-parentValue">{inferredParentLabel}</div>
              </div>

              <div className="mtx-twoCol">
                <label className="mtx-field">
                  <span>Name</span>
                  <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g., Cement" autoComplete="off" />
                </label>

                <label className="mtx-field">
                  <span>Slug (auto)</span>
                  <input
                    value={formSlug}
                    onChange={(e) => {
                      setFormSlug(e.target.value);
                      setSlugLocked(true);
                    }}
                    onBlur={() => {
                      if (!formSlug.trim()) setSlugLocked(false);
                    }}
                    placeholder="auto-generated"
                    autoComplete="new-password"
                    spellCheck={false}
                  />
                </label>
              </div>

              <div className="mtx-twoCol">
                <label className="mtx-field">
                  <span>Sort order</span>
                  <input
                    type="number"
                    value={formSort}
                    onChange={(e) => {
                      setSortTouched(true);
                      setFormSort(parseInt(e.target.value || "1", 10));
                    }}
                    autoComplete="off"
                  />
                </label>

                <div className="mtx-field">
                  <span>Status</span>
                  <div className="mtx-readonly">{busy ? "Saving…" : canCreate ? "Ready" : "Incomplete"}</div>
                </div>
              </div>

              <button className="mtx-primaryBtn" type="button" onClick={onCreate} disabled={!canCreate || busy}>
                {busy ? "Saving..." : formKind === "product_group" ? "Create / Reuse Product Group" : "Create"}
              </button>

              {lastCreated ? (
                <div className="mtx-hint">
                  <div>
                    <b>Result ✅</b> {kindLabel(lastCreated.kind)}: <b>{lastCreated.name}</b>
                  </div>
                  <div style={{ marginTop: 6, opacity: 0.85 }}>
                    slug: <b>{lastCreated.slug}</b> | sort: <b>{lastCreated.sort_order}</b>
                  </div>
                </div>
              ) : null}

              {!canCreate ? (
                <div className="mtx-hint">
                  {!formName.trim() ? <div>Enter a Name.</div> : null}
                  {formKind === "category" && !typeId ? <div>Pick a Type to create a Category.</div> : null}
                  {formKind === "subcategory" && !categoryId ? <div>Pick a Category to create a Subcategory.</div> : null}
                </div>
              ) : null}

              {sortTouched ? (
                <div className="mtx-footnote" style={{ textAlign: "left" }}>
                  Note: you edited sort order manually. It must be unique under the same parent (or global for product group).
                </div>
              ) : null}
            </div>

            <div className="mtx-footnote">Disable is safe. Delete is allowed only when no children & no listings reference.</div>
          </CardBox>
        </div>

        {/* Lists */}
        <div className="mtx-grid2 mtx-mt">
          <CardBox title="Types (top-level)" subtitle="Edit Name + Sort, Disable, or Safe Delete." right={<span className="mtx-count">{types.length}</span>}>
            {types.length === 0 ? (
              <div className="mtx-empty">No types.</div>
            ) : (
              <div className="mtx-list">
                {types.slice(0, 50).map((r) => (
                  <div key={r.id} className="mtx-row">
                    <div className="mtx-rowText">
                      <div className="mtx-rowName">{r.name}</div>
                      <div className="mtx-rowSlug">
                        {r.slug} {r.sort_order != null ? ` • sort ${r.sort_order}` : ""}
                      </div>
                      {editingId === r.id ? (
                        <div className="mtx-editBox">
                          <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" />
                          <input type="number" value={editSort} onChange={(e) => setEditSort(parseInt(e.target.value || "1", 10))} placeholder="Sort" />
                        </div>
                      ) : null}
                    </div>

                    <div className="mtx-rowBtns">
                      {editingId === r.id ? (
                        <>
                          <button className="mtx-ghostBtn" onClick={() => saveEdit(r)} disabled={busy}>
                            Save
                          </button>
                          <button className="mtx-ghostBtn" onClick={cancelEdit} disabled={busy}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="mtx-ghostBtn" onClick={() => startEdit(r)} disabled={busy}>
                            Edit
                          </button>
                          <button className="mtx-ghostBtn" onClick={() => onDisable(r)} disabled={busy}>
                            Disable
                          </button>
                          <button className="mtx-dangerBtn" onClick={() => onDelete(r)} disabled={busy}>
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBox>

          <CardBox
            title="Global Product Groups"
            subtitle="These are shared across subcategories. Example: Cement is ONE product group reused by OPC43/OPC53/PPC/PSC."
            right={<span className="mtx-count">{globalProductGroups.length}</span>}
          >
            {globalProductGroups.length === 0 ? (
              <div className="mtx-empty">No product groups.</div>
            ) : (
              <div className="mtx-list">
                {globalProductGroups.slice(0, 120).map((r) => (
                  <div key={r.id} className="mtx-row">
                    <div className="mtx-rowText">
                      <div className="mtx-rowName">{r.name}</div>
                      <div className="mtx-rowSlug">
                        {r.slug} {r.sort_order != null ? ` • sort ${r.sort_order}` : ""}
                      </div>

                      {editingId === r.id ? (
                        <div className="mtx-editBox">
                          <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" />
                          <input type="number" value={editSort} onChange={(e) => setEditSort(parseInt(e.target.value || "1", 10))} placeholder="Sort" />
                        </div>
                      ) : null}
                    </div>

                    <div className="mtx-rowBtns">
                      {editingId === r.id ? (
                        <>
                          <button className="mtx-ghostBtn" onClick={() => saveEdit(r)} disabled={busy}>
                            Save
                          </button>
                          <button className="mtx-ghostBtn" onClick={cancelEdit} disabled={busy}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="mtx-ghostBtn" onClick={() => startEdit(r)} disabled={busy}>
                            Edit
                          </button>
                          <button className="mtx-ghostBtn" onClick={() => onDisable(r)} disabled={busy}>
                            Disable
                          </button>
                          <button className="mtx-dangerBtn" onClick={() => onDelete(r)} disabled={busy}>
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBox>
        </div>

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

          .mtx-count {
            display: inline-flex;
            min-width: 34px;
            height: 28px;
            padding: 0 10px;
            align-items: center;
            justify-content: center;
            border-radius: 999px;
            background: rgba(0, 0, 0, 0.06);
            font-weight: 800;
            font-size: 13px;
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

          .mtx-readonly {
            height: 42px;
            display: flex;
            align-items: center;
            padding: 10px 12px;
            border-radius: 10px;
            border: 1px solid rgba(0, 0, 0, 0.12);
            background: rgba(0, 0, 0, 0.02);
            font-size: 14px;
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

          .mtx-hint {
            border: 1px dashed rgba(0, 0, 0, 0.18);
            background: rgba(0, 0, 0, 0.02);
            border-radius: 12px;
            padding: 10px 12px;
            font-size: 13px;
            opacity: 0.9;
            line-height: 1.45;
          }

          .mtx-parentBox {
            border: 1px solid rgba(0, 0, 0, 0.1);
            background: rgba(0, 0, 0, 0.02);
            border-radius: 12px;
            padding: 12px;
          }
          .mtx-parentTop {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
          }
          .mtx-parentTitle {
            font-size: 13px;
            font-weight: 800;
          }
          .mtx-parentKind {
            font-size: 12px;
            opacity: 0.7;
          }
          .mtx-parentValue {
            margin-top: 6px;
            font-size: 13px;
            opacity: 0.85;
          }

          .mtx-footnote {
            margin-top: 12px;
            font-size: 13px;
            opacity: 0.7;
            text-align: right;
          }

          .mtx-empty {
            font-size: 14px;
            opacity: 0.75;
          }

          .mtx-list {
            display: grid;
            gap: 10px;
          }
          .mtx-row {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
            padding: 12px;
            border-radius: 12px;
            border: 1px solid rgba(0, 0, 0, 0.1);
            background: #fff;
          }
          .mtx-rowText {
            min-width: 0;
            flex: 1;
          }
          .mtx-rowName {
            font-weight: 800;
            font-size: 14px;
            line-height: 1.2;
          }
          .mtx-rowSlug {
            margin-top: 4px;
            font-size: 13px;
            opacity: 0.7;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            max-width: 520px;
          }

          .mtx-rowBtns {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            justify-content: flex-end;
          }

          .mtx-ghostBtn {
            height: 36px;
            padding: 0 12px;
            border-radius: 10px;
            border: 1px solid rgba(0, 0, 0, 0.18);
            background: rgba(0, 0, 0, 0.02);
            font-weight: 800;
            font-size: 12px;
            cursor: pointer;
            white-space: nowrap;
          }
          .mtx-ghostBtn:disabled {
            opacity: 0.55;
            cursor: not-allowed;
          }

          .mtx-dangerBtn {
            height: 36px;
            padding: 0 12px;
            border-radius: 10px;
            border: 1px solid rgba(0, 0, 0, 0.25);
            background: rgba(255, 0, 0, 0.06);
            font-weight: 900;
            font-size: 12px;
            cursor: pointer;
            white-space: nowrap;
          }
          .mtx-dangerBtn:disabled {
            opacity: 0.55;
            cursor: not-allowed;
          }

          .mtx-editBox {
            display: grid;
            grid-template-columns: 1fr 120px;
            gap: 8px;
            margin-top: 10px;
          }
          .mtx-editBox input {
            height: 40px;
            padding: 10px 12px;
            border-radius: 10px;
            border: 1px solid rgba(0, 0, 0, 0.18);
            background: #fff;
            font-size: 14px;
          }

          .mtx-advancedBadge {
            display: inline-block;
            margin-left: 6px;
            padding: 2px 8px;
            font-size: 11px;
            font-weight: 800;
            border-radius: 999px;
            background: rgba(0, 0, 0, 0.08);
            opacity: 0.75;
            vertical-align: middle;
          }

          .mtx-help {
            margin-top: 6px;
            font-size: 12px;
            opacity: 0.7;
            line-height: 1.35;
          }
        `}</style>
      </div>
    </Container>
  );
}
