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
  unit: string | null;
  sort_order: number | null;
  is_active: boolean | null;
};

type ValueRow = {
  id: string;
  attribute_id: string;
  value: string;
  slug: string;
  sort_order: number | null;
  is_active: boolean | null;
};

const VALUES_TABLE = "property_attribute_values" as const;

function isMaster(role: string | null | undefined) {
  return role === "master_admin";
}

async function requireMasterAdmin(supabase: ReturnType<typeof getSupabaseBrowser>) {
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

export default function PropertyValuesMasterPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [attrs, setAttrs] = useState<AttrRow[]>([]);
  const [values, setValues] = useState<ValueRow[]>([]);

  const [selectedAttrId, setSelectedAttrId] = useState<string | null>(null);
  const selectedAttr = useMemo(
    () => attrs.find((a) => a.id === selectedAttrId) ?? null,
    [attrs, selectedAttrId]
  );

  const selectableAttrs = useMemo(
    () => attrs.filter((a) => a.input_type === "single_select" || a.input_type === "multi_select"),
    [attrs]
  );

  const filteredValues = useMemo(() => {
    if (!selectedAttrId) return [];
    return values.filter((v) => v.attribute_id === selectedAttrId);
  }, [values, selectedAttrId]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ValueRow | null>(null);
  const [form, setForm] = useState({
    value: "",
    slug: "",
    sort_order: "",
    is_active: true,
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
  async function boot() {
    setLoading(true);
    setErr(null);

    try {
      const a = await supabase
        .from("property_attributes")
        .select("id,name,slug,input_type,unit,sort_order,is_active")
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("name");

      if (a.error) throw a.error;
      setAttrs(a.data ?? []);

      const firstSelectable = (a.data ?? []).find(
        (x: AttrRow) => x.input_type === "single_select" || x.input_type === "multi_select"
      );
      setSelectedAttrId(firstSelectable?.id ?? null);

      const v = await supabase
        .from(VALUES_TABLE)
        .select("id,attribute_id,value,slug,sort_order,is_active")
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("value");

      if (v.error) throw v.error;
      setValues(v.data ?? []);

      setLoading(false);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load values");
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!checking && allowed) boot();
  }, [checking, allowed]);

  /* ---------- FORM ---------- */
  function openAdd() {
    setEditing(null);
    setForm({ value: "", slug: "", sort_order: "", is_active: true });
    setShowForm(true);
  }

  function openEdit(v: ValueRow) {
    setEditing(v);
    setForm({
      value: v.value,
      slug: v.slug,
      sort_order: v.sort_order == null ? "" : String(v.sort_order),
      is_active: v.is_active !== false,
    });
    setShowForm(true);
  }

  async function save() {
    if (!selectedAttrId) return;

    const valueLabel = form.value.trim();
    if (!valueLabel) return setErr("Value label is required");

    const payload = {
      attribute_id: selectedAttrId,
      value: valueLabel,
      slug: form.slug ? slugify(form.slug) : slugify(valueLabel),
      sort_order: form.sort_order ? Number(form.sort_order) : null,
      is_active: form.is_active,
    };

    if (editing) {
      const { error } = await supabase.from(VALUES_TABLE).update(payload).eq("id", editing.id);
      if (error) return setErr(error.message);
    } else {
      const { error } = await supabase.from(VALUES_TABLE).insert(payload);
      if (error) return setErr(error.message);
    }

    setShowForm(false);
    await boot();
  }

  async function remove(v: ValueRow) {
    if (!confirm(`Delete value "${v.value}"?`)) return;
    const { error } = await supabase.from(VALUES_TABLE).delete().eq("id", v.id);
    if (error) return setErr(error.message);
    await boot();
  }

  /* ---------- RENDER ---------- */
  if (checking) {
    return (
      <Container>
        <SectionHeader title="Property · Values" subtitle="Checking access…" />
      </Container>
    );
  }

  if (!allowed) {
    return (
      <Container>
        <SectionHeader title="Property · Values" subtitle="Access denied" />
        <EmptyState message="master_admin access required." />
      </Container>
    );
  }

  return (
    <Container>
      <SectionHeader
        title="Property · Values"
        subtitle="Manage allowed options for select-type attributes (global)"
      />

      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <ActionButton href="/admin/dashboard/master-data" variant="secondary">
          ← Back
        </ActionButton>
        <ActionButton href="/admin/dashboard/master-data/property/attributes" variant="secondary">
          ← Attributes
        </ActionButton>
        <ActionButton href="/admin/dashboard/master-data/property/mapping" variant="secondary">
          Mapping →
        </ActionButton>
      </div>

      {err && <div style={{ color: "crimson", fontWeight: 900 }}>{err}</div>}

      {loading ? (
        <EmptyState message="Loading values…" />
      ) : selectableAttrs.length === 0 ? (
        <EmptyState message="No select-type attributes found." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 14 }}>
          {/* LEFT */}
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 12 }}>
            <div style={{ fontWeight: 900 }}>Select Attribute</div>
            {selectableAttrs.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedAttrId(a.id)}
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: 8,
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  background: a.id === selectedAttrId ? "#eef2ff" : "#fff",
                  textAlign: "left",
                }}
              >
                <Badge>{a.input_type}</Badge>
                <div style={{ fontWeight: 900 }}>{a.name}</div>
              </button>
            ))}
          </div>

          {/* RIGHT */}
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 900 }}>Values</div>
              <ActionButton variant="primary" onClick={openAdd}>
                + Add Value
              </ActionButton>
            </div>

            {filteredValues.length === 0 ? (
              <div style={{ marginTop: 12, opacity: 0.7 }}>No values yet.</div>
            ) : (
              filteredValues.map((v) => (
                <div
                  key={v.id}
                  style={{
                    marginTop: 10,
                    padding: 10,
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                  }}
                >
                  <Badge>{v.slug}</Badge>
                  <div style={{ fontWeight: 900 }}>{v.value}</div>
                  <div style={{ marginTop: 6 }}>
                    <ActionButton variant="secondary" onClick={() => openEdit(v)}>
                      Edit
                    </ActionButton>{" "}
                    <ActionButton variant="secondary" onClick={() => remove(v)}>
                      Delete
                    </ActionButton>
                  </div>
                </div>
              ))
            )}

            {showForm && (
              <div style={{ marginTop: 16, border: "2px solid #2563eb", borderRadius: 14, padding: 12 }}>
                <input
                  placeholder="Value label"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                />
                <input
                  placeholder="Slug"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
                <input
                  placeholder="Sort order"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                />
                <label>
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  />{" "}
                  Active
                </label>
                <div>
                  <ActionButton variant="primary" onClick={save}>
                    Save
                  </ActionButton>{" "}
                  <ActionButton variant="secondary" onClick={() => setShowForm(false)}>
                    Cancel
                  </ActionButton>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Container>
  );
}
