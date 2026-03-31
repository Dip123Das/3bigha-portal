"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

// ✅ Matches your enum: category | subcategory | service
type Kind = "category" | "subcategory" | "service";

type TaxonRow = {
  id: string;
  parent_id: string | null;
  kind: Kind;
  name: string;
  slug: string;
  sort_order: number | null;
  is_active: boolean;
};

const TAXON_TABLE = "service_taxons" as const;
const ADMIN_ROLE = "services_admin" as const;

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

async function requireModuleAdmin(supabase: ReturnType<typeof getSupabaseBrowser>) {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return { ok: false, role: null as string | null };

  const { data: prof, error: profErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profErr) throw profErr;

  const role = ((prof as any)?.role ?? null) as string | null;
  const ok = isMaster(role) || isModuleAdmin(role);
  return { ok, role };
}

async function fetchChildren(
  supabase: ReturnType<typeof getSupabaseBrowser>,
  kind: Kind,
  parentId: string | null
) {
  const q = supabase
    .from(TAXON_TABLE)
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
    .from(TAXON_TABLE)
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
  if (k === "category") return "Category";
  if (k === "subcategory") return "Subcategory";
  return "Service";
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

export default function ServicesTaxonomyAdmin() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [adminOk, setAdminOk] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  const [categories, setCategories] = useState<TaxonRow[]>([]);
  const [subcategories, setSubcategories] = useState<TaxonRow[]>([]);
  const [services, setServices] = useState<TaxonRow[]>([]);

  const [categoryId, setCategoryId] = useState<string>("");
  const [subcategoryId, setSubcategoryId] = useState<string>("");

  const [formKind, setFormKind] = useState<Kind>("category");
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formSort, setFormSort] = useState<number>(1);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [lastCreated, setLastCreated] = useState<{ kind: Kind; name: string; slug: string; sort_order: number } | null>(
    null
  );

  const [sortTouched, setSortTouched] = useState(false);

  // boot
  useEffect(() => {
    let alive = true;

    (async () => {
      const a = await requireModuleAdmin(supabase);
      if (!alive) return;

      setAdminOk(a.ok);
      setRole(a.role);

      if (!a.ok) {
        router.replace("/admin/dashboard");
        return;
      }

      const cats = await fetchChildren(supabase, "category", null);
      if (!alive) return;
      setCategories(cats);
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

  // load subcats
  useEffect(() => {
    let alive = true;
    (async () => {
      setSubcategories([]);
      setServices([]);
      setSubcategoryId("");

      if (!categoryId) return;
      const s = await fetchChildren(supabase, "subcategory", categoryId);
      if (!alive) return;
      setSubcategories(s);
    })().catch((e: any) => setMsg(e?.message || "Failed to load subcategories."));
    return () => {
      alive = false;
    };
  }, [categoryId, supabase]);

  // load services
  useEffect(() => {
    let alive = true;
    (async () => {
      setServices([]);
      if (!subcategoryId) return;
      const sv = await fetchChildren(supabase, "service", subcategoryId);
      if (!alive) return;
      setServices(sv);
    })().catch((e: any) => setMsg(e?.message || "Failed to load services."));
    return () => {
      alive = false;
    };
  }, [subcategoryId, supabase]);

  const selectedCategory = categories.find((x) => x.id === categoryId) || null;
  const selectedSubcategory = subcategories.find((x) => x.id === subcategoryId) || null;

  const inferredParentId = useMemo(() => {
    if (formKind === "category") return null;
    if (formKind === "subcategory") return categoryId || null;
    return subcategoryId || null; // service -> subcategory
  }, [formKind, categoryId, subcategoryId]);

  const inferredParentLabel = useMemo(() => {
    if (formKind === "category") return "No parent (top-level)";
    if (formKind === "subcategory") return selectedCategory ? `Category: ${selectedCategory.name}` : "Pick a Category first";
    return selectedSubcategory ? `Subcategory: ${selectedSubcategory.name}` : "Pick a Subcategory first";
  }, [formKind, selectedCategory, selectedSubcategory]);

  const canCreate = useMemo(() => {
    if (!formName.trim()) return false;
    if (formKind === "subcategory" && !categoryId) return false;
    if (formKind === "service" && !subcategoryId) return false;
    return true;
  }, [formKind, formName, categoryId, subcategoryId]);

  async function refresh(kind: Kind) {
    if (kind === "category") setCategories(await fetchChildren(supabase, "category", null));
    if (kind === "subcategory" && categoryId) setSubcategories(await fetchChildren(supabase, "subcategory", categoryId));
    if (kind === "service" && subcategoryId) setServices(await fetchChildren(supabase, "service", subcategoryId));
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      setSortTouched(false);

      if (formKind === "subcategory" && !categoryId) return;
      if (formKind === "service" && !subcategoryId) return;

      const next = await getNextSortOrder(supabase, formKind, inferredParentId);
      if (!alive) return;
      setFormSort(next);
    })().catch(() => {});
    return () => {
      alive = false;
    };
  }, [formKind, inferredParentId, categoryId, subcategoryId, supabase]);

  async function onCreate() {
    setMsg(null);
    setLastCreated(null);
    if (!canCreate) return;

    const name = formName.trim();
    const slug = (formSlug.trim() || slugify(name)).toLowerCase();

    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id ?? null;

      const tryInsert = async (sort_order: number) => {
        return await supabase.from(TAXON_TABLE).insert({
          kind: formKind,
          parent_id: inferredParentId,
          name,
          slug,
          sort_order,
          is_active: true,
          created_by: userId,
        });
      };

      let { error } = await tryInsert(formSort);

      const isDupSort =
        (error as any)?.code === "23505" ||
        String((error as any)?.message || "").toLowerCase().includes("parent_kind_sort") ||
        String((error as any)?.message || "").toLowerCase().includes("ux_");

      if (error && isDupSort) {
        const next = await getNextSortOrder(supabase, formKind, inferredParentId);
        const retry = await tryInsert(next);
        error = retry.error || null;
        if (!error) setFormSort(next);
      }

      if (error) throw error;

      await refresh(formKind);

      setLastCreated({ kind: formKind, name, slug, sort_order: formSort });
      setMsg(`Created ✅ ${kindLabel(formKind)}: ${name}`);

      setFormName("");
      setFormSlug("");
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message || "Create failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onDisable(row: TaxonRow) {
    setMsg(null);
    setBusy(true);
    try {
      const { error } = await supabase.from(TAXON_TABLE).update({ is_active: false }).eq("id", row.id);
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

  if (loading) {
    return (
      <Container>
        <SectionHeader title="Services Taxonomy" subtitle="Loading..." />
      </Container>
    );
  }

  if (!adminOk) {
    return (
      <Container>
        <SectionHeader title="Services Taxonomy" subtitle="Admin access required" />
        <EmptyState message="Access denied." />
      </Container>
    );
  }

  return (
    <Container>
      <div className="mtx-page">
        <SectionHeader
          title="Services → Taxonomy Manager"
          subtitle={`Category → Subcategory → Service (role: ${role ?? "—"})`}
        />
            <div className="mtx-topbar">
          <div className="mtx-actions">
            <ActionButton href="/admin/dashboard/master-data" variant="secondary">
              ← Back to Master Data
            </ActionButton>

            {/* Mapping immediately after Taxonomy */}
            <ActionButton href="/admin/dashboard/master-data/services/mapping" variant="secondary">
              Mapping
            </ActionButton>

            <ActionButton href="/admin/dashboard/master-data/services/attributes" variant="secondary">
              Attributes Manager
            </ActionButton>
          </div>

          <div className="mtx-status">{msg ? <Badge>{msg}</Badge> : null}</div>
        </div>

        <div className="mtx-grid2">
          <CardBox
            title="Select path"
            subtitle="Choose Category → Subcategory to load Services."
            right={
              <div className="mtx-chipCol">
                <span className="mtx-chip">Active only</span>
                <span className="mtx-chip subtle">Sorted by order → name</span>
              </div>
            }
          >
            <div className="mtx-form">
              <label className="mtx-field">
                <span>Category</span>
                <select
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    setMsg(null);
                  }}
                >
                  <option value="">— Select Category —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.slug})
                    </option>
                  ))}
                </select>
              </label>

              <label className="mtx-field">
                <span>Subcategory</span>
                <select
                  value={subcategoryId}
                  onChange={(e) => {
                    setSubcategoryId(e.target.value);
                    setMsg(null);
                  }}
                  disabled={!categoryId}
                >
                  <option value="">{categoryId ? "— Select Subcategory —" : "Select a Category first"}</option>
                  {subcategories.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.slug})
                    </option>
                  ))}
                </select>
              </label>

              <label className="mtx-field">
                <span>Services</span>
                <select disabled={!subcategoryId}>
                  <option value="">{subcategoryId ? `— Services (${services.length}) —` : "Select a Subcategory first"}</option>
                  {services.map((sv) => (
                    <option key={sv.id} value={sv.id}>
                      {sv.name} ({sv.slug})
                    </option>
                  ))}
                </select>
              </label>

              <div className="mtx-selection">
                <div className="mtx-selectionHead">Current selection</div>
                <div className="mtx-pillRow">
                  <span className="mtx-pill">{selectedCategory ? `Category: ${selectedCategory.slug}` : "Category: —"}</span>
                  <span className="mtx-pill">
                    {selectedSubcategory ? `Subcategory: ${selectedSubcategory.slug}` : "Subcategory: —"}
                  </span>
                  <span className="mtx-pill">{`Services: ${subcategoryId ? services.length : 0}`}</span>
                </div>
              </div>
            </div>

            <div className="mtx-footnote">Tip: pick Category → Subcategory to load Services.</div>
          </CardBox>

          <CardBox title="Create new node" subtitle={`Adds a row into ${TAXON_TABLE} (active).`} right={<Badge>{TAXON_TABLE}</Badge>}>
            <div className="mtx-form">
              <label className="mtx-field">
                <span>Level</span>
                <select value={formKind} onChange={(e) => setFormKind(e.target.value as Kind)}>
                  <option value="category">Category</option>
                  <option value="subcategory">Subcategory</option>
                  <option value="service">Service</option>
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
                  <input
                    value={formName}
                    onChange={(e) => {
                      setFormName(e.target.value);
                      if (!formSlug.trim()) setFormSlug(slugify(e.target.value));
                    }}
                    placeholder="e.g., Legal Services"
                  />
                </label>

                <label className="mtx-field">
                  <span>Slug</span>
                  <input value={formSlug} onChange={(e) => setFormSlug(e.target.value)} placeholder="auto-generated" />
                </label>
              </div>

              <div className="mtx-twoCol">
                <label className="mtx-field">
                  <span>Sort order (unique per parent)</span>
                  <input
                    type="number"
                    value={formSort}
                    onChange={(e) => {
                      setSortTouched(true);
                      setFormSort(parseInt(e.target.value || "1", 10));
                    }}
                  />
                </label>

                <div className="mtx-field">
                  <span>Status</span>
                  <div className="mtx-readonly">{busy ? "Saving…" : canCreate ? "Ready" : "Incomplete"}</div>
                </div>
              </div>

              <button className="mtx-primaryBtn" type="button" onClick={onCreate} disabled={!canCreate || busy}>
                {busy ? "Saving..." : "Create"}
              </button>

              {lastCreated ? (
                <div className="mtx-hint">
                  <div>
                    <b>Created ✅</b> {kindLabel(lastCreated.kind)}: <b>{lastCreated.name}</b>
                  </div>
                  <div style={{ marginTop: 6, opacity: 0.85 }}>
                    slug: <b>{lastCreated.slug}</b> | sort: <b>{lastCreated.sort_order}</b>
                  </div>
                </div>
              ) : null}

              {!canCreate ? (
                <div className="mtx-hint">
                  {!formName.trim() ? <div>Enter a Name.</div> : null}
                  {formKind === "subcategory" && !categoryId ? <div>Pick a Category to create a Subcategory.</div> : null}
                  {formKind === "service" && !subcategoryId ? <div>Pick a Subcategory to create a Service.</div> : null}
                </div>
              ) : null}

              {sortTouched ? (
                <div className="mtx-footnote" style={{ textAlign: "left" }}>
                  Note: you edited sort order manually. It must be unique under the same parent.
                </div>
              ) : null}
            </div>

            <div className="mtx-footnote">Use Disable instead of delete so listings don’t break.</div>
          </CardBox>
        </div>

        <div className="mtx-grid2 mtx-mt">
          <CardBox title="Categories" subtitle="Top-level categories (parent_id is null)" right={<span className="mtx-count">{categories.length}</span>}>
            {categories.length === 0 ? (
              <div className="mtx-empty">No categories yet.</div>
            ) : (
              <div className="mtx-list">
                {categories.slice(0, 25).map((r) => (
                  <div key={r.id} className="mtx-row">
                    <div className="mtx-rowText">
                      <div className="mtx-rowName">{r.name}</div>
                      <div className="mtx-rowSlug">
                        {r.slug} {r.sort_order != null ? ` • sort ${r.sort_order}` : ""}
                      </div>
                    </div>
                    <button className="mtx-ghostBtn" onClick={() => onDisable(r)} disabled={busy}>
                      Disable
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardBox>

          <CardBox
            title="Services (current Subcategory)"
            subtitle={selectedSubcategory ? `Subcategory: ${selectedSubcategory.name}` : "Select a Subcategory to view services."}
            right={<span className="mtx-count">{services.length}</span>}
          >
            {services.length === 0 ? (
              <div className="mtx-empty">No services here for this subcategory.</div>
            ) : (
              <div className="mtx-list">
                {services.slice(0, 50).map((r) => (
                  <div key={r.id} className="mtx-row">
                    <div className="mtx-rowText">
                      <div className="mtx-rowName">{r.name}</div>
                      <div className="mtx-rowSlug">
                        {r.slug} {r.sort_order != null ? ` • sort ${r.sort_order}` : ""}
                      </div>
                    </div>
                    <button className="mtx-ghostBtn" onClick={() => onDisable(r)} disabled={busy}>
                      Disable
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardBox>
        </div>

        {/* ✅ SAME CSS STYLE SYSTEM AS MATERIALS */}
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

          .mtx-selection {
            border: 1px solid rgba(0, 0, 0, 0.08);
            background: #fff;
            border-radius: 12px;
            padding: 12px;
          }
          .mtx-selectionHead {
            font-size: 13px;
            font-weight: 800;
            opacity: 0.9;
          }
          .mtx-pillRow {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 10px;
          }
          .mtx-pill {
            border: 1px solid rgba(0, 0, 0, 0.12);
            background: rgba(0, 0, 0, 0.02);
            border-radius: 999px;
            padding: 6px 10px;
            font-size: 12px;
            white-space: nowrap;
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
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 12px;
            border-radius: 12px;
            border: 1px solid rgba(0, 0, 0, 0.1);
            background: #fff;
          }
          .mtx-rowText {
            min-width: 0;
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
        `}</style>
      </div>
    </Container>
  );
}

