// app/admin/dashboard/master-data/materials/attributes/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

type AttrInputType = "single_select" | "multi_select" | "text" | "number" | "boolean";
type ValueTab = "global" | "product_group";

type AttrRow = {
  id: string;
  name: string;
  slug: string;
  input_type: AttrInputType;
  unit: string | null;
  sort_order: number;
  is_active: boolean;
  scope?: "global" | "product_specific" | string; // newly added in DB (safe)
};

type AttrValueRow = {
  id: string;
  attribute_id: string;
  value: string;
  slug: string | null;
  sort_order: number;
  is_active: boolean;
  product_group_id: string | null; // ✅ required for product-group specific values
};

type ProductGroupRow = {
  id: string;
  name: string;
  sort_order: number | null;
  is_active: boolean | null;
};

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
function isMaterialsAdmin(role: string | null | undefined) {
  return role === "materials_admin";
}

async function requireMaterialsAdmin(supabase: ReturnType<typeof getSupabaseBrowser>) {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return { ok: false, role: null as string | null };

  const { data: prof, error: profErr } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profErr) throw profErr;

  const role = ((prof as any)?.role ?? null) as string | null;
  const ok = isMaster(role) || isMaterialsAdmin(role);
  return { ok, role };
}

async function fetchAttributes(supabase: ReturnType<typeof getSupabaseBrowser>) {
  const { data, error } = await supabase
    .from("material_attributes")
    .select("id,name,slug,input_type,unit,sort_order,is_active,scope")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data || []) as AttrRow[];
}

async function fetchProductGroups(supabase: ReturnType<typeof getSupabaseBrowser>) {
  const { data, error } = await supabase
    .from("material_taxons")
    .select("id,name,sort_order,is_active")
    .eq("kind", "product_group")
    .or("is_active.is.null,is_active.eq.true")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;

  const rows = (data || []) as ProductGroupRow[];
  return rows.filter((r) => r.is_active !== false);
}

async function fetchAttributeValuesAll(supabase: ReturnType<typeof getSupabaseBrowser>, attributeId: string) {
  const { data, error } = await supabase
    .from("material_attribute_values")
    .select("id,attribute_id,value,slug,sort_order,is_active,product_group_id")
    .eq("attribute_id", attributeId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("value", { ascending: true });

  if (error) throw error;
  return (data || []) as AttrValueRow[];
}

function CardBox(props: { title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mxa-card">
      <div className="mxa-cardHead">
        <div>
          <div className="mxa-title">{props.title}</div>
          {props.subtitle ? <div className="mxa-subtitle">{props.subtitle}</div> : null}
        </div>
        {props.right ? <div className="mxa-right">{props.right}</div> : null}
      </div>
      <div className="mxa-cardBody">{props.children}</div>
    </section>
  );
}

export default function MaterialsAttributesAdmin() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [adminOk, setAdminOk] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [attributes, setAttributes] = useState<AttrRow[]>([]);
  const [selectedAttrId, setSelectedAttrId] = useState<string>("");

  const [productGroups, setProductGroups] = useState<ProductGroupRow[]>([]);
  const [selectedPgId, setSelectedPgId] = useState<string>(""); // used for “Values for selected Product Group” tab

  const [valuesAll, setValuesAll] = useState<AttrValueRow[]>([]);
  const [valueTab, setValueTab] = useState<ValueTab>("global");

  // Create attribute form
  const [aName, setAName] = useState("");
  const [aSlug, setASlug] = useState("");
  const [aInputType, setAInputType] = useState<AttrInputType>("single_select");
  const [aUnit, setAUnit] = useState("");
  const [aSort, setASort] = useState<number>(1);
  const [aScope, setAScope] = useState<"global" | "product_specific">("global"); // ✅ uses your new scope column

  // Create value form
  const [vValue, setVValue] = useState("");
  const [vSlug, setVSlug] = useState("");
  const [vSort, setVSort] = useState<number>(1);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const a = await requireMaterialsAdmin(supabase);
        if (!alive) return;

        setAdminOk(a.ok);
        setRole(a.role);

        if (!a.ok) {
          router.replace("/admin/dashboard");
          return;
        }

        const [attrs, pgs] = await Promise.all([fetchAttributes(supabase), fetchProductGroups(supabase)]);
        if (!alive) return;

        setAttributes(attrs);
        setProductGroups(pgs);
        setLoading(false);
      } catch (e: any) {
        console.error(e);
        if (!alive) return;
        setMsg(e?.message || "Failed to load attributes.");
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [router, supabase]);

  // Load ALL values for selected attribute (both global + product-group specific)
  useEffect(() => {
    let alive = true;

    (async () => {
      setValuesAll([]);
      setMsg(null);

      if (!selectedAttrId) return;

      try {
        const v = await fetchAttributeValuesAll(supabase, selectedAttrId);
        if (!alive) return;
        setValuesAll(v);
      } catch (e: any) {
        console.error(e);
        if (!alive) return;
        setMsg(e?.message || "Failed to load attribute values.");
      }
    })();

    return () => {
      alive = false;
    };
  }, [selectedAttrId, supabase]);

  const selectedAttr = useMemo(() => attributes.find((a) => a.id === selectedAttrId) || null, [attributes, selectedAttrId]);

  const selectedAttrIsSelect = useMemo(() => {
    return selectedAttr?.input_type === "single_select" || selectedAttr?.input_type === "multi_select";
  }, [selectedAttr]);

  // ✅ Tab filters (NO hooks inside conditionals)
  const valuesGlobal = useMemo(() => valuesAll.filter((v) => !v.product_group_id), [valuesAll]);
  const valuesForSelectedPg = useMemo(() => {
    if (!selectedPgId) return [];
    return valuesAll.filter((v) => v.product_group_id === selectedPgId);
  }, [valuesAll, selectedPgId]);

  async function refreshAttributes() {
    const attrs = await fetchAttributes(supabase);
    setAttributes(attrs);
  }

  async function refreshValues() {
    if (!selectedAttrId) return;
    const v = await fetchAttributeValuesAll(supabase, selectedAttrId);
    setValuesAll(v);
  }

  async function onCreateAttribute() {
    setMsg(null);
    const name = aName.trim();
    if (!name) return;

    const slug = (aSlug.trim() || slugify(name)).toLowerCase();

    setBusy(true);
    try {
      const { error } = await supabase.from("material_attributes").insert({
        name,
        slug,
        input_type: aInputType,
        unit: aUnit.trim() ? aUnit.trim() : null,
        sort_order: Number.isFinite(aSort) ? aSort : 1,
        is_active: true,
        scope: aScope, // ✅ new column
      });

      if (error) throw error;

      setAName("");
      setASlug("");
      setAUnit("");
      setASort(1);
      setAScope("global");

      await refreshAttributes();
      setMsg(`Attribute created ✅ ${name}`);
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message || "Create attribute failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onDisableAttribute(row: AttrRow) {
    setMsg(null);
    setBusy(true);
    try {
      const { error } = await supabase.from("material_attributes").update({ is_active: false }).eq("id", row.id);
      if (error) throw error;

      if (selectedAttrId === row.id) {
        setSelectedAttrId("");
        setValuesAll([]);
      }
      await refreshAttributes();
      setMsg("Attribute disabled.");
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message || "Disable attribute failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onCreateValue() {
    setMsg(null);
    if (!selectedAttrId) return setMsg("Select an attribute first.");
    if (!selectedAttrIsSelect && selectedAttr?.input_type !== "boolean" && selectedAttr?.input_type !== "number" && selectedAttr?.input_type !== "text") {
      // just safety; still allow values if user wants
    }

    const value = vValue.trim();
    if (!value) return;

    // ✅ Decide which bucket the new value goes into based on active tab
    const product_group_id =
      valueTab === "global" ? null : selectedPgId ? selectedPgId : null;

    if (valueTab === "product_group" && !selectedPgId) {
      setMsg("Select a Product Group first to add Product-Group-specific values.");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.from("material_attribute_values").insert({
        attribute_id: selectedAttrId,
        value,
        slug: vSlug.trim() ? vSlug.trim().toLowerCase() : null,
        sort_order: Number.isFinite(vSort) ? vSort : 1,
        is_active: true,
        product_group_id,
      });

      if (error) throw error;

      setVValue("");
      setVSlug("");
      setVSort(1);

      await refreshValues();
      setMsg(valueTab === "global" ? "Global value created ✅" : "Product-group value created ✅");
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message || "Create value failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onDisableValue(row: AttrValueRow) {
    setMsg(null);
    setBusy(true);
    try {
      const { error } = await supabase.from("material_attribute_values").update({ is_active: false }).eq("id", row.id);
      if (error) throw error;

      await refreshValues();
      setMsg("Value disabled.");
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message || "Disable value failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Container>
        <SectionHeader title="Materials → Attributes" subtitle="Loading..." />
      </Container>
    );
  }

  if (!adminOk) {
    return (
      <Container>
        <SectionHeader title="Materials → Attributes" subtitle="Admin access required" />
        <EmptyState message="Access denied." />
      </Container>
    );
  }

  return (
    <Container>
      <div className="mxa-page">
        <SectionHeader
          title="Materials → Attributes Manager"
          subtitle={`Define variation fields (Brand, Grade, Diameter…) and their allowed values (role: ${role ?? "—"})`}
        />

        <div className="mxa-topbar">
          <div className="mxa-actions">
            <ActionButton href="/admin/dashboard/master-data" variant="secondary">
              ← Back to Master Data
            </ActionButton>
            <ActionButton href="/admin/dashboard/master-data/materials/taxonomy" variant="secondary">
              Taxonomy Manager
            </ActionButton>
            <ActionButton href="/admin/dashboard/master-data/materials/mapping" variant="secondary">
              Product → Variations Mapping
            </ActionButton>
          </div>
          <div className="mxa-status">{msg ? <Badge>{msg}</Badge> : null}</div>
        </div>

        <div className="mxa-grid2">
          <CardBox
            title="Attributes"
            subtitle="Select an attribute to manage its values."
            right={<Badge>material_attributes</Badge>}
          >
            <div className="mxa-form">
              <label className="mxa-field">
                <span>Select Attribute</span>
                <select value={selectedAttrId} onChange={(e) => setSelectedAttrId(e.target.value)}>
                  <option value="">— Select Attribute —</option>
                  {attributes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.input_type}) — {a.slug}
                      {a.scope ? ` • ${a.scope}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              {selectedAttr ? (
                <div className="mxa-hint">
                  <div>
                    <b>{selectedAttr.name}</b> • <span style={{ opacity: 0.8 }}>{selectedAttr.slug}</span>
                  </div>
                  <div style={{ marginTop: 6, opacity: 0.85 }}>
                    type: <b>{selectedAttr.input_type}</b>
                    {selectedAttr.unit ? (
                      <>
                        {" "}
                        • unit: <b>{selectedAttr.unit}</b>
                      </>
                    ) : null}
                    {selectedAttr.scope ? (
                      <>
                        {" "}
                        • scope: <b>{selectedAttr.scope}</b>
                      </>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="mxa-hint">
                  Tip: create attributes like Brand, Grade, Diameter, Length, Weight, Application…
                </div>
              )}

              {selectedAttr ? (
                <button className="mxa-ghostBtn" type="button" onClick={() => onDisableAttribute(selectedAttr)} disabled={busy}>
                  Disable selected attribute
                </button>
              ) : null}
            </div>
          </CardBox>

          <CardBox title="Create Attribute" subtitle="Attributes decide which inputs appear per product." right={<Badge>slug required</Badge>}>
            <div className="mxa-form">
              <div className="mxa-twoCol">
                <label className="mxa-field">
                  <span>Name</span>
                  <input
                    value={aName}
                    onChange={(e) => {
                      setAName(e.target.value);
                      if (!aSlug.trim()) setASlug(slugify(e.target.value));
                    }}
                    placeholder="e.g., Brand"
                  />
                </label>

                <label className="mxa-field">
                  <span>Slug (unique)</span>
                  <input value={aSlug} onChange={(e) => setASlug(e.target.value)} placeholder="e.g., brand" />
                </label>
              </div>

              <div className="mxa-twoCol">
                <label className="mxa-field">
                  <span>Input type</span>
                  <select value={aInputType} onChange={(e) => setAInputType(e.target.value as AttrInputType)}>
                    <option value="single_select">single_select</option>
                    <option value="multi_select">multi_select</option>
                    <option value="text">text</option>
                    <option value="number">number</option>
                    <option value="boolean">boolean</option>
                  </select>
                </label>

                <label className="mxa-field">
                  <span>Unit (optional)</span>
                  <input value={aUnit} onChange={(e) => setAUnit(e.target.value)} placeholder="mm / ft / kg ..." />
                </label>
              </div>

              <div className="mxa-twoCol">
                <label className="mxa-field">
                  <span>Scope</span>
                  <select value={aScope} onChange={(e) => setAScope(e.target.value as any)}>
                    <option value="global">global</option>
                    <option value="product_specific">product_specific</option>
                  </select>
                </label>

                <label className="mxa-field">
                  <span>Sort order</span>
                  <input type="number" value={aSort} onChange={(e) => setASort(parseInt(e.target.value || "1", 10))} />
                </label>
              </div>

              <button className="mxa-primaryBtn" type="button" onClick={onCreateAttribute} disabled={busy || !aName.trim()}>
                {busy ? "Saving..." : "Create attribute"}
              </button>
            </div>
          </CardBox>
        </div>

        <div className="mxa-grid2 mxa-mt">
          <CardBox
            title="Attribute Values"
            subtitle={
              selectedAttr
                ? selectedAttrIsSelect
                  ? "Add allowed values. Use tabs for Global vs Product Group specific."
                  : "This attribute is not a select type — values are optional."
                : "Select an attribute first."
            }
            right={<Badge>material_attribute_values</Badge>}
          >
            {!selectedAttr ? (
              <div className="mxa-empty">Select an attribute to manage values.</div>
            ) : (
              <>
                {/* Tabs */}
                <div className="mxa-tabs">
                  <button
                    type="button"
                    className={`mxa-tab ${valueTab === "global" ? "active" : ""}`}
                    onClick={() => setValueTab("global")}
                  >
                    Global values
                  </button>
                  <button
                    type="button"
                    className={`mxa-tab ${valueTab === "product_group" ? "active" : ""}`}
                    onClick={() => setValueTab("product_group")}
                  >
                    Values for selected Product Group
                  </button>
                </div>

                {valueTab === "product_group" ? (
                  <div className="mxa-form" style={{ marginTop: 10 }}>
                    <label className="mxa-field">
                      <span>Select Product Group (for this tab)</span>
                      <select value={selectedPgId} onChange={(e) => setSelectedPgId(e.target.value)}>
                        <option value="">— Select Product Group —</option>
                        {productGroups.map((pg) => (
                          <option key={pg.id} value={pg.id}>
                            {pg.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="mxa-hint">
                      This tab saves values with <b>product_group_id</b> set — vendors will only see these values when that Product Group is selected.
                    </div>
                  </div>
                ) : (
                  <div className="mxa-hint" style={{ marginTop: 10 }}>
                    Global values are saved with <b>product_group_id = NULL</b> — they can be reused across multiple product groups (only if you want).
                  </div>
                )}

                {/* Create value form */}
                <div className="mxa-form" style={{ marginTop: 12 }}>
                  <div className="mxa-twoCol">
                    <label className="mxa-field">
                      <span>Value</span>
                      <input value={vValue} onChange={(e) => setVValue(e.target.value)} placeholder="e.g., UltraTech / Fe-500D / 20mm" />
                    </label>
                    <label className="mxa-field">
                      <span>Value slug (optional)</span>
                      <input value={vSlug} onChange={(e) => setVSlug(e.target.value)} placeholder="optional" />
                    </label>
                  </div>

                  <label className="mxa-field">
                    <span>Sort order</span>
                    <input type="number" value={vSort} onChange={(e) => setVSort(parseInt(e.target.value || "1", 10))} />
                  </label>

                  <button
                    className="mxa-primaryBtn"
                    type="button"
                    onClick={onCreateValue}
                    disabled={busy || !vValue.trim() || (valueTab === "product_group" && !selectedPgId)}
                    title={valueTab === "product_group" && !selectedPgId ? "Select a Product Group first" : ""}
                  >
                    {busy ? "Saving..." : valueTab === "global" ? "Add global value" : "Add product-group value"}
                  </button>
                </div>

                {/* Values list */}
                <div className="mxa-list mxa-mt">
                  {valueTab === "global" ? (
                    valuesGlobal.length === 0 ? (
                      <div className="mxa-empty">No global values yet.</div>
                    ) : (
                      valuesGlobal.slice(0, 120).map((r) => (
                        <div key={r.id} className="mxa-row">
                          <div className="mxa-rowText">
                            <div className="mxa-rowName">{r.value}</div>
                            <div className="mxa-rowMeta">
                              sort {r.sort_order} {r.slug ? `• slug ${r.slug}` : ""} • global
                            </div>
                          </div>
                          <button className="mxa-ghostBtn" onClick={() => onDisableValue(r)} disabled={busy}>
                            Disable
                          </button>
                        </div>
                      ))
                    )
                  ) : !selectedPgId ? (
                    <div className="mxa-empty">Select a Product Group to view its values.</div>
                  ) : valuesForSelectedPg.length === 0 ? (
                    <div className="mxa-empty">No values yet for this Product Group.</div>
                  ) : (
                    valuesForSelectedPg.slice(0, 120).map((r) => (
                      <div key={r.id} className="mxa-row">
                        <div className="mxa-rowText">
                          <div className="mxa-rowName">{r.value}</div>
                          <div className="mxa-rowMeta">
                            sort {r.sort_order} {r.slug ? `• slug ${r.slug}` : ""} • product_group
                          </div>
                        </div>
                        <button className="mxa-ghostBtn" onClick={() => onDisableValue(r)} disabled={busy}>
                          Disable
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </CardBox>

          <CardBox title="Next step" subtitle="After creating values, map attributes to product groups." right={<Badge>per-product variations</Badge>}>
            <div className="mxa-hint">
              Go to <b>Product → Variations Mapping</b> and attach attributes to each Product Group.
              <div style={{ marginTop: 8, opacity: 0.85 }}>
                Example: <b>Cement</b> → Brand, Grade • <b>Aggregates</b> → Size, Washed, Moisture Content
              </div>
            </div>

            <div className="mxa-mt">
              <ActionButton href="/admin/dashboard/master-data/materials/mapping">Open Mapping Page →</ActionButton>
            </div>
          </CardBox>
        </div>

        <style jsx>{`
          .mxa-topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            flex-wrap: wrap;
            margin: 12px 0 16px;
          }
          .mxa-actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
          }
          .mxa-status {
            display: flex;
            justify-content: flex-end;
            min-height: 24px;
          }

          .mxa-grid2 {
            display: grid;
            grid-template-columns: 1fr;
            gap: 14px;
          }
          .mxa-mt {
            margin-top: 14px;
          }
          @media (min-width: 980px) {
            .mxa-grid2 {
              grid-template-columns: 1fr 1fr;
            }
          }

          .mxa-card {
            background: #fff;
            border: 1px solid rgba(0, 0, 0, 0.08);
            border-radius: 14px;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
            overflow: hidden;
          }
          .mxa-cardHead {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 12px;
            padding: 14px 14px 10px;
            border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          }
          .mxa-cardBody {
            padding: 14px;
          }

          .mxa-title {
            font-size: 15px;
            font-weight: 800;
          }
          .mxa-subtitle {
            margin-top: 4px;
            font-size: 13px;
            opacity: 0.75;
            line-height: 1.35;
          }
          .mxa-right {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            justify-content: flex-end;
          }

          .mxa-form {
            display: grid;
            gap: 12px;
          }

          .mxa-field {
            display: grid;
            gap: 6px;
          }
          .mxa-field > span {
            font-size: 12px;
            opacity: 0.75;
          }

          .mxa-field select,
          .mxa-field input {
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

          .mxa-twoCol {
            display: grid;
            gap: 12px;
            grid-template-columns: 1fr;
          }
          @media (min-width: 760px) {
            .mxa-twoCol {
              grid-template-columns: 1fr 1fr;
            }
          }

          .mxa-primaryBtn {
            height: 44px;
            border-radius: 12px;
            border: 1px solid rgba(0, 0, 0, 0.18);
            background: #111;
            color: #fff;
            font-weight: 900;
            cursor: pointer;
          }
          .mxa-primaryBtn:disabled {
            background: rgba(0, 0, 0, 0.08);
            color: rgba(0, 0, 0, 0.35);
            cursor: not-allowed;
          }

          .mxa-hint {
            border: 1px dashed rgba(0, 0, 0, 0.18);
            background: rgba(0, 0, 0, 0.02);
            border-radius: 12px;
            padding: 10px 12px;
            font-size: 13px;
            opacity: 0.9;
            line-height: 1.45;
          }

          .mxa-empty {
            font-size: 14px;
            opacity: 0.75;
          }

          .mxa-list {
            display: grid;
            gap: 10px;
          }
          .mxa-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 12px;
            border-radius: 12px;
            border: 1px solid rgba(0, 0, 0, 0.1);
            background: #fff;
          }
          .mxa-rowText {
            min-width: 0;
          }
          .mxa-rowName {
            font-weight: 800;
            font-size: 14px;
            line-height: 1.2;
          }
          .mxa-rowMeta {
            margin-top: 4px;
            font-size: 13px;
            opacity: 0.7;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            max-width: 520px;
          }

          .mxa-ghostBtn {
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
          .mxa-ghostBtn:disabled {
            opacity: 0.55;
            cursor: not-allowed;
          }

          .mxa-tabs {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
          }
          .mxa-tab {
            height: 36px;
            padding: 0 12px;
            border-radius: 999px;
            border: 1px solid rgba(0, 0, 0, 0.18);
            background: rgba(0, 0, 0, 0.02);
            font-weight: 900;
            font-size: 12px;
            cursor: pointer;
          }
          .mxa-tab.active {
            background: #111;
            color: #fff;
            border-color: #111;
          }
        `}</style>
      </div>
    </Container>
  );
}
