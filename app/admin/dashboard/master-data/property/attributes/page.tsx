"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

type AttrInputType = "single_select" | "multi_select" | "text" | "number" | "boolean" | string;

type AttrRow = {
  id: string;
  name: string;
  slug: string;
  input_type: AttrInputType;
  unit: string | null;
  sort_order: number | null;
  is_active: boolean | null;
};

function isMaster(role: string | null | undefined) {
  return role === "master_admin";
}

async function requireMasterAdmin(supabase: ReturnType<typeof getSupabaseBrowser>) {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) return { ok: false };

  const { data: prof } = await supabase.from("profiles").select("role").eq("id", session.user.id).maybeSingle();
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

/** ---------------- Recommended Global Attributes ----------------
 * These are only attribute DEFINITIONS.
 * Values for select-types should be added from Values page afterwards.
 */
const RECOMMENDED: Array<{
  name: string;
  slug: string;
  input_type: AttrInputType;
  unit?: string | null;
  sort_order?: number | null;
}> = [
  { name: "Facing", slug: "facing", input_type: "multi_select", unit: null, sort_order: 10 },
  { name: "Built-up Area", slug: "built-up-area", input_type: "number", unit: "sqft", sort_order: 20 },
  { name: "Plot Area", slug: "plot-area", input_type: "number", unit: "sqft", sort_order: 30 },
  { name: "Bedrooms", slug: "bedrooms", input_type: "number", unit: null, sort_order: 40 },
  { name: "Bathrooms", slug: "bathrooms", input_type: "number", unit: null, sort_order: 50 },
  { name: "Furnishing Status", slug: "furnishing-status", input_type: "single_select", unit: null, sort_order: 60 },
  { name: "Parking Available", slug: "parking-available", input_type: "boolean", unit: null, sort_order: 70 },
  { name: "Floor No.", slug: "floor-no", input_type: "number", unit: null, sort_order: 80 },
  { name: "Total Floors", slug: "total-floors", input_type: "number", unit: null, sort_order: 90 },
  { name: "Age of Property", slug: "age-of-property", input_type: "number", unit: "years", sort_order: 100 },
  { name: "Availability", slug: "availability", input_type: "single_select", unit: null, sort_order: 110 },
  { name: "Ownership", slug: "ownership", input_type: "single_select", unit: null, sort_order: 120 },
  { name: "Price", slug: "price", input_type: "number", unit: "INR", sort_order: 130 },
  { name: "Negotiable", slug: "negotiable", input_type: "boolean", unit: null, sort_order: 140 },
  { name: "Road Width", slug: "road-width", input_type: "number", unit: "ft", sort_order: 150 },
  { name: "Water Supply", slug: "water-supply", input_type: "single_select", unit: null, sort_order: 160 },
  { name: "Electricity Available", slug: "electricity-available", input_type: "boolean", unit: null, sort_order: 170 },
  { name: "Landmark / Nearby", slug: "landmark", input_type: "text", unit: null, sort_order: 180 },
];

function InputLabel(props: { title: string; hint?: string }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontWeight: 900 }}>{props.title}</div>
      {props.hint ? <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>{props.hint}</div> : null}
    </div>
  );
}

function ModalShell(props: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  if (!props.open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 9999,
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
      onMouseDown={(e) => {
        // click outside closes
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div
        style={{
          width: "min(920px, 100%)",
          background: "#fff",
          borderRadius: 14,
          border: "1px solid rgba(0,0,0,0.12)",
          boxShadow: "0 20px 45px rgba(0,0,0,0.25)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: 14, borderBottom: "1px solid rgba(0,0,0,0.08)", display: "flex", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16 }}>{props.title}</div>
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>Define what the attribute means. Values are managed separately.</div>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            style={{
              height: 36,
              padding: "0 12px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.14)",
              background: "#fff",
              cursor: "pointer",
              fontWeight: 900,
            }}
          >
            ✕ Close
          </button>
        </div>

        <div style={{ padding: 14 }}>{props.children}</div>
      </div>
    </div>
  );
}

export default function PropertyAttributesMasterPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [attrs, setAttrs] = useState<AttrRow[]>([]);

  // modal state
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<string | null>(null);

  // form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [inputType, setInputType] = useState<AttrInputType>("text");
  const [unit, setUnit] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<string>("");
  const [isActive, setIsActive] = useState(true);

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

  async function loadAttrs() {
    const res = await supabase
      .from("property_attributes")
      .select("id,name,slug,input_type,unit,sort_order,is_active")
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true });

    if (res.error) throw res.error;
    setAttrs((res.data ?? []) as any);
  }

  async function boot() {
    setLoading(true);
    setErr(null);
    try {
      await loadAttrs();
      setLoading(false);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load attributes");
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!checking && allowed) boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking, allowed]);

  function resetForm() {
    setName("");
    setSlug("");
    setSlugTouched(false);
    setInputType("text");
    setUnit("");
    setSortOrder("");
    setIsActive(true);
    setEditingId(null);
  }

  function openAdd() {
    setErr(null);
    setMode("add");
    resetForm();
    setOpen(true);
  }

  function openEdit(a: AttrRow) {
    setErr(null);
    setMode("edit");
    setEditingId(a.id);

    setName(a.name ?? "");
    setSlug(a.slug ?? "");
    setSlugTouched(true);
    setInputType(a.input_type ?? "text");
    setUnit(a.unit ?? "");
    setSortOrder(a.sort_order == null ? "" : String(a.sort_order));
    setIsActive(a.is_active === false ? false : true);

    setOpen(true);
  }

  // auto-slug from name unless user manually typed slug
  useEffect(() => {
    if (slugTouched) return;
    setSlug(slugify(name));
  }, [name, slugTouched]);

  function validate() {
    const n = name.trim();
    const s = slugify(slug.trim());
    if (!n) return "Attribute name is required.";
    if (!s) return "Slug is required.";
    if (!inputType) return "Input type is required.";
    // prevent duplicates (client-side)
    const exists = attrs.some((a) => a.slug === s && a.id !== editingId);
    if (exists) return `Slug '${s}' already exists. Choose a unique slug.`;
    return null;
  }

  async function save() {
    setErr(null);
    const v = validate();
    if (v) return setErr(v);

    const payload = {
      name: name.trim(),
      slug: slugify(slug.trim()),
      input_type: inputType,
      unit: unit.trim() ? unit.trim() : null,
      sort_order: sortOrder.trim() === "" ? null : Number(sortOrder),
      is_active: isActive,
    };

    if (payload.sort_order != null && !Number.isFinite(payload.sort_order as any)) {
      return setErr("Sort order must be a valid number (or keep it blank).");
    }

    if (mode === "add") {
      const { error } = await supabase.from("property_attributes").insert(payload);
      if (error) return setErr(error.message);
    } else {
      if (!editingId) return setErr("Missing editing id");
      const { error } = await supabase.from("property_attributes").update(payload).eq("id", editingId);
      if (error) return setErr(error.message);
    }

    setOpen(false);
    await loadAttrs();
  }

  async function removeAttr(a: AttrRow) {
    setErr(null);
    const yes = confirm(`Delete attribute "${a.name}"?`);
    if (!yes) return;

    const { error } = await supabase.from("property_attributes").delete().eq("id", a.id);
    if (error) return setErr(error.message);

    await loadAttrs();
  }

  async function seedRecommended() {
    setErr(null);

    // Build rows for upsert
    const rows = RECOMMENDED.map((r) => ({
      name: r.name,
      slug: r.slug,
      input_type: r.input_type,
      unit: r.unit ?? null,
      sort_order: r.sort_order ?? null,
      is_active: true,
    }));

    // If you have a UNIQUE constraint on slug, this becomes safe & repeatable.
    // If not, it will error. In that case tell me and I’ll switch to a “only insert missing” path.
    const { error } = await supabase.from("property_attributes").upsert(rows as any, { onConflict: "slug" });

    if (error) return setErr(error.message);

    await loadAttrs();
  }

  if (checking) {
    return (
      <Container>
        <SectionHeader title="Property · Attributes" subtitle="Checking access…" />
      </Container>
    );
  }

  if (!allowed) {
    return (
      <Container>
        <SectionHeader title="Property · Attributes" subtitle="Access denied" />
        <EmptyState message="master_admin access required." />
      </Container>
    );
  }

  return (
    <Container>
      <SectionHeader title="Property · Attributes" subtitle="Manage property_attributes (definitions only)" />

      {/* TOP NAV (anti-overlay patch: zIndex + pointerEvents) */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 14,
          position: "relative",
          zIndex: 50,
          pointerEvents: "auto",
        }}
      >
        <ActionButton href="/admin/dashboard/master-data" variant="secondary">
          ← Back
        </ActionButton>

        <ActionButton href="/admin/dashboard/master-data/property/taxonomy" variant="secondary">
          Taxonomy →
        </ActionButton>

        <ActionButton href="/admin/dashboard/master-data/property/values" variant="secondary">
          Values →
        </ActionButton>

        <ActionButton href="/admin/dashboard/master-data/property/mapping" variant="secondary">
          Mapping →
        </ActionButton>

        <ActionButton variant="primary" onClick={openAdd}>
          + Add Attribute
        </ActionButton>
      </div>

      {err ? <div style={{ color: "crimson", fontWeight: 900, marginBottom: 10 }}>{err}</div> : null}

      {loading ? (
        <EmptyState message="Loading attributes…" />
      ) : (
        <div style={{ display: "grid", gap: 12, position: "relative", zIndex: 10, pointerEvents: "auto" }}>
          {/* RECOMMENDED PANEL */}
          <div style={{ border: "1px dashed #c7d2fe", borderRadius: 14, padding: 14, background: "rgba(99,102,241,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 15 }}>Recommended Global Property Attributes</div>
                <div style={{ marginTop: 6, opacity: 0.85, lineHeight: 1.5 }}>
                  These are common “global” attributes used across most property subtypes. Click <b>Seed Recommended</b> to create them in
                  <code style={{ marginLeft: 6 }}>property_attributes</code>. Then add select-values in the <b>Values</b> page.
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <Badge>{RECOMMENDED.length}</Badge>
                <ActionButton variant="secondary" onClick={seedRecommended}>
                  Seed Recommended
                </ActionButton>
              </div>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              {RECOMMENDED.slice(0, 8).map((r) => (
                <div key={r.slug} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <Badge>{String(r.input_type)}</Badge>
                  <Badge>{r.slug}</Badge>
                  {r.unit ? <Badge>unit: {r.unit}</Badge> : null}
                  <div style={{ fontWeight: 900 }}>{r.name}</div>
                </div>
              ))}
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
                (Showing 8 of {RECOMMENDED.length}. Seeding creates all.)
              </div>
            </div>
          </div>

          {/* ATTRIBUTES LIST */}
          <div style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 14, padding: 12, background: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div style={{ fontWeight: 900 }}>Attributes</div>
              <Badge>{attrs.length}</Badge>
            </div>

            {attrs.length === 0 ? (
              <div style={{ opacity: 0.7, marginTop: 10 }}>No attributes yet. Add your first attribute or seed recommended.</div>
            ) : (
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                {attrs.map((a) => (
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
                        {a.unit ? <Badge>unit: {a.unit}</Badge> : null}
                        {a.sort_order != null ? <Badge>sort: {a.sort_order}</Badge> : null}
                        {a.is_active === false ? <Badge>inactive</Badge> : <Badge>active</Badge>}
                      </div>
                      <div style={{ fontWeight: 900 }}>{a.name}</div>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <ActionButton variant="secondary" onClick={() => openEdit(a)}>
                        Edit
                      </ActionButton>
                      <ActionButton variant="secondary" onClick={() => removeAttr(a)}>
                        Delete
                      </ActionButton>

                      <ActionButton variant="secondary" href="/admin/dashboard/master-data/property/values">
                        Manage Values →
                      </ActionButton>

                      <ActionButton variant="secondary" href="/admin/dashboard/master-data/property/mapping">
                        Map to Subtypes →
                      </ActionButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADD/EDIT MODAL */}
      <ModalShell
        open={open}
        title={mode === "add" ? "Add Property Attribute" : "Edit Property Attribute"}
        onClose={() => setOpen(false)}
      >
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12 }}>
            <div>
              <InputLabel
                title="Attribute name"
                hint='Example: "Facing", "Built-up Area", "Bedrooms", "Furnishing Status"'
              />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Built-up Area"
                style={{
                  width: "100%",
                  height: 44,
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.14)",
                  padding: "0 12px",
                }}
              />
            </div>

            <div>
              <InputLabel
                title="Slug"
                hint='Auto-generated from name. Use lowercase with hyphens. Example: "built-up-area"'
              />
              <input
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                placeholder="e.g. built-up-area"
                style={{
                  width: "100%",
                  height: 44,
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.14)",
                  padding: "0 12px",
                }}
              />
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
                Stored slug will be: <b>{slugify(slug)}</b>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <InputLabel
                title="Input type"
                hint="Choose how users will provide this field."
              />
              <select
                value={inputType}
                onChange={(e) => setInputType(e.target.value)}
                style={{
                  width: "100%",
                  height: 44,
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.14)",
                  padding: "0 12px",
                }}
              >
                <option value="text">text (free typing)</option>
                <option value="number">number</option>
                <option value="boolean">boolean (true/false)</option>
                <option value="single_select">single_select (choose one value)</option>
                <option value="multi_select">multi_select (choose multiple values)</option>
              </select>

              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85, lineHeight: 1.4 }}>
                <b>Tip:</b> If you choose <b>single_select</b> / <b>multi_select</b>, add the allowed options from the{" "}
                <b>Values</b> page.
              </div>
            </div>

            <div>
              <InputLabel
                title="Unit (optional)"
                hint='Use for number fields. Examples: "sqft", "ft", "years", "INR"'
              />
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. sqft"
                style={{
                  width: "100%",
                  height: 44,
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.14)",
                  padding: "0 12px",
                }}
              />
            </div>

            <div>
              <InputLabel title="Sort order (optional)" hint="Lower comes first. Leave blank if unsure." />
              <input
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                placeholder="e.g. 10"
                inputMode="numeric"
                style={{
                  width: "100%",
                  height: 44,
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.14)",
                  padding: "0 12px",
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }}>
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Active (visible for usage)
            </label>

            <div style={{ fontSize: 12, opacity: 0.8 }}>
              If inactive, it remains stored but can be hidden from listing forms.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end", marginTop: 6 }}>
            <ActionButton variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </ActionButton>
            <ActionButton variant="primary" onClick={save}>
              {mode === "add" ? "Create Attribute" : "Save Changes"}
            </ActionButton>
          </div>

          <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: 10, marginTop: 6, fontSize: 12, opacity: 0.85, lineHeight: 1.5 }}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Examples</div>
            <div>
              <b>Facing</b> → <code>multi_select</code> (values later: North, South, East, West)
              <br />
              <b>Built-up Area</b> → <code>number</code> unit: <code>sqft</code>
              <br />
              <b>Furnishing Status</b> → <code>single_select</code> (values later: Furnished, Semi-furnished, Unfurnished)
              <br />
              <b>Parking Available</b> → <code>boolean</code>
            </div>
          </div>
        </div>
      </ModalShell>
    </Container>
  );
}
