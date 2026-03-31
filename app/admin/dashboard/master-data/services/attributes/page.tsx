// app/admin/dashboard/master-data/services/attributes/page.tsx
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
type Scope = "global" | "product_specific";

type AttrRow = {
  id: string;
  name: string;
  slug: string;
  input_type: AttrInputType;
  unit: string | null;
  sort_order: number;
  is_active: boolean;
  scope: Scope;
};

const ATTR_TABLE = "service_attributes" as const;
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

function formatSbError(e: any) {
  const msg = e?.message || "Unknown error";
  const code = e?.code ? ` (code: ${e.code})` : "";
  const details = e?.details ? ` • ${e.details}` : "";
  const hint = e?.hint ? ` • hint: ${e.hint}` : "";
  return `${msg}${code}${details}${hint}`;
}

async function fetchAttributes(supabase: ReturnType<typeof getSupabaseBrowser>) {
  const { data, error } = await supabase
    .from(ATTR_TABLE)
    .select("id,name,slug,input_type,unit,sort_order,is_active,scope")
    .eq("is_active", true)
    .order("scope", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data || []) as AttrRow[];
}

async function getNextSortOrder(supabase: ReturnType<typeof getSupabaseBrowser>, scope: Scope) {
  const { data, error } = await supabase
    .from(ATTR_TABLE)
    .select("sort_order")
    .eq("is_active", true)
    .eq("scope", scope)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (error) throw error;
  const maxSort = (data?.[0]?.sort_order ?? 0) as number;
  const next = Number.isFinite(maxSort) ? maxSort + 1 : 1;
  return next <= 0 ? 1 : next;
}

function CardBox(props: { title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="sax-card">
      <div className="sax-cardHead">
        <div>
          <div className="sax-title">{props.title}</div>
          {props.subtitle ? <div className="sax-subtitle">{props.subtitle}</div> : null}
        </div>
        {props.right ? <div className="sax-right">{props.right}</div> : null}
      </div>
      <div className="sax-cardBody">{props.children}</div>
    </section>
  );
}

export default function ServicesAttributesAdmin() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [adminOk, setAdminOk] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [rows, setRows] = useState<AttrRow[]>([]);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [inputType, setInputType] = useState<AttrInputType>("single_select");
  const [unit, setUnit] = useState<string>("");
  const [scope, setScope] = useState<Scope>("global");
  const [sortOrder, setSortOrder] = useState<number>(1);

  const [lastCreated, setLastCreated] = useState<{ name: string; slug: string; scope: Scope; input_type: AttrInputType; sort_order: number } | null>(null);

  const canCreate = useMemo(() => {
    if (!name.trim()) return false;
    return true;
  }, [name]);

  async function refresh() {
    const data = await fetchAttributes(supabase);
    setRows(data);
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const a = await requireModuleAdmin(supabase);
        if (!alive) return;

        setAdminOk(a.ok);
        setRole(a.role);

        if (!a.ok) {
          router.replace("/admin/dashboard");
          return;
        }

        await refresh();

        const next = await getNextSortOrder(supabase, scope);
        if (!alive) return;
        setSortOrder(next);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, supabase]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const next = await getNextSortOrder(supabase, scope);
        if (!alive) return;
        setSortOrder(next);
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, [scope, supabase]);

  async function onCreate() {
    setMsg(null);
    setLastCreated(null);
    if (!canCreate) return;

    const nm = name.trim();
    const sl = (slug.trim() || slugify(nm)).toLowerCase();

    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id ?? null;

      const tryInsert = async (so: number) => {
        return await supabase.from(ATTR_TABLE).insert({
          name: nm,
          slug: sl,
          input_type: inputType,
          unit: unit.trim() ? unit.trim() : null,
          sort_order: so,
          is_active: true,
          scope,
          created_by: userId,
        } as any);
      };

      let { error } = await tryInsert(sortOrder);

      const isDup =
        (error as any)?.code === "23505" ||
        String((error as any)?.message || "").toLowerCase().includes("duplicate");

      if (error && isDup) {
        const next = await getNextSortOrder(supabase, scope);
        const retry = await tryInsert(next);
        error = retry.error || null;
        if (!error) setSortOrder(next);
      }

      if (error) throw error;

      await refresh();

      setLastCreated({ name: nm, slug: sl, scope, input_type: inputType, sort_order: sortOrder });
      setMsg(`Created ✅ Attribute: ${nm}`);

      setName("");
      setSlug("");
      setUnit("");
    } catch (e: any) {
      console.error(e);
      setMsg(`Create failed: ${formatSbError(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function onDisable(row: AttrRow) {
    setMsg(null);
    setBusy(true);
    try {
      const { error } = await supabase.from(ATTR_TABLE).update({ is_active: false }).eq("id", row.id);
      if (error) throw error;
      await refresh();
      setMsg("Disabled (soft removed).");
    } catch (e: any) {
      console.error(e);
      setMsg(`Disable failed: ${formatSbError(e)}`);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Container>
        <SectionHeader title="Services → Attributes" subtitle="Loading..." />
      </Container>
    );
  }

  if (!adminOk) {
    return (
      <Container>
        <SectionHeader title="Services → Attributes" subtitle="Admin access required" />
        <EmptyState message="Access denied." />
      </Container>
    );
  }

  const globals = rows.filter((r) => r.scope === "global");
  const productSpecific = rows.filter((r) => r.scope === "product_specific");

  return (
    <Container>
      <div className="sax-page">
        <SectionHeader
          title="Services → Attributes Manager"
          subtitle={`Create global/product-specific attributes (role: ${role ?? "—"})`}
        />

        <div className="sax-topbar">
          <div className="sax-actions">
            <ActionButton href="/admin/dashboard/master-data" variant="secondary">
              ← Back to Master Data
            </ActionButton>
            <ActionButton href="/admin/dashboard/master-data/services/taxonomy" variant="secondary">
              Taxonomy Manager
            </ActionButton>
            <ActionButton href="/admin/dashboard/master-data/services/mapping" variant="secondary">
              Mapping
            </ActionButton>
          </div>
          <div className="sax-status">{msg ? <Badge>{msg}</Badge> : null}</div>
        </div>

        <div className="sax-grid2">
          <CardBox title="Create attribute" subtitle={`Adds a row into ${ATTR_TABLE} (active).`} right={<Badge>{ATTR_TABLE}</Badge>}>
            <div className="sax-form">
              <label className="sax-field">
                <span>Scope</span>
                <select value={scope} onChange={(e) => setScope(e.target.value as Scope)}>
                  <option value="global">global</option>
                  <option value="product_specific">product_specific</option>
                </select>
              </label>

              <div className="sax-twoCol">
                <label className="sax-field">
                  <span>Name</span>
                  <input
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!slug.trim()) setSlug(slugify(e.target.value));
                    }}
                    placeholder="e.g., Service Duration"
                  />
                </label>

                <label className="sax-field">
                  <span>Slug</span>
                  <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto-generated" />
                </label>
              </div>

              <div className="sax-twoCol">
                <label className="sax-field">
                  <span>Input type</span>
                  <select value={inputType} onChange={(e) => setInputType(e.target.value as AttrInputType)}>
                    <option value="single_select">single_select</option>
                    <option value="multi_select">multi_select</option>
                    <option value="text">text</option>
                    <option value="number">number</option>
                    <option value="boolean">boolean</option>
                  </select>
                </label>

                <label className="sax-field">
                  <span>Unit (optional)</span>
                  <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g., hour / day / ₹" />
                </label>
              </div>

              <label className="sax-field">
                <span>Sort order (within scope)</span>
                <input type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value || "1", 10))} />
              </label>

              <button className="sax-primaryBtn" type="button" onClick={onCreate} disabled={!canCreate || busy}>
                {busy ? "Saving..." : "Create"}
              </button>

              {lastCreated ? (
                <div className="sax-hint">
                  <div>
                    <b>Created ✅</b> <b>{lastCreated.name}</b>
                  </div>
                  <div style={{ marginTop: 6, opacity: 0.85 }}>
                    scope: <b>{lastCreated.scope}</b> • type: <b>{lastCreated.input_type}</b> • slug: <b>{lastCreated.slug}</b> • sort:{" "}
                    <b>{lastCreated.sort_order}</b>
                  </div>
                </div>
              ) : null}
            </div>
          </CardBox>

          <CardBox
            title="Active attributes"
            subtitle={`Global: ${globals.length} • Product-specific: ${productSpecific.length}`}
            right={<span className="sax-count">{rows.length}</span>}
          >
            {rows.length === 0 ? (
              <div className="sax-empty">No attributes yet.</div>
            ) : (
              <div className="sax-list">
                {rows.slice(0, 80).map((r) => (
                  <div key={r.id} className="sax-row">
                    <div className="sax-rowText">
                      <div className="sax-rowName">
                        {r.name} <span className="sax-pill">{r.scope}</span>
                      </div>
                      <div className="sax-rowMeta">
                        {r.slug} • {r.input_type}
                        {r.unit ? ` • unit ${r.unit}` : ""} • sort {r.sort_order}
                      </div>
                    </div>

                    <button className="sax-ghostBtn" onClick={() => onDisable(r)} disabled={busy}>
                      Disable
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardBox>
        </div>

        <style jsx>{`
          .sax-topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            flex-wrap: wrap;
            margin: 12px 0 16px;
          }
          .sax-actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
          }
          .sax-status {
            display: flex;
            justify-content: flex-end;
            min-height: 24px;
          }

          .sax-grid2 {
            display: grid;
            grid-template-columns: 1fr;
            gap: 14px;
          }
          @media (min-width: 980px) {
            .sax-grid2 {
              grid-template-columns: 1fr 1fr;
            }
          }

          .sax-card {
            background: #fff;
            border: 1px solid rgba(0, 0, 0, 0.08);
            border-radius: 14px;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
            overflow: hidden;
          }
          .sax-cardHead {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 12px;
            padding: 14px 14px 10px;
            border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          }
          .sax-cardBody {
            padding: 14px;
          }

          .sax-title {
            font-size: 15px;
            font-weight: 800;
          }
          .sax-subtitle {
            margin-top: 4px;
            font-size: 13px;
            opacity: 0.75;
            line-height: 1.35;
          }

          .sax-count {
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

          .sax-form {
            display: grid;
            gap: 12px;
          }

          .sax-field {
            display: grid;
            gap: 6px;
          }
          .sax-field > span {
            font-size: 12px;
            opacity: 0.75;
          }

          .sax-field select,
          .sax-field input {
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

          .sax-twoCol {
            display: grid;
            gap: 12px;
            grid-template-columns: 1fr;
          }
          @media (min-width: 760px) {
            .sax-twoCol {
              grid-template-columns: 1fr 1fr;
            }
          }

          .sax-primaryBtn {
            height: 44px;
            border-radius: 12px;
            border: 1px solid rgba(0, 0, 0, 0.18);
            background: #111;
            color: #fff;
            font-weight: 900;
            cursor: pointer;
            padding: 0 14px;
          }
          .sax-primaryBtn:disabled {
            background: rgba(0, 0, 0, 0.08);
            color: rgba(0, 0, 0, 0.35);
            cursor: not-allowed;
          }

          .sax-empty {
            font-size: 14px;
            opacity: 0.75;
          }

          .sax-list {
            display: grid;
            gap: 10px;
          }
          .sax-row {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
            padding: 12px;
            border-radius: 12px;
            border: 1px solid rgba(0, 0, 0, 0.1);
            background: #fff;
          }
          .sax-rowText {
            min-width: 0;
            flex: 1;
          }
          .sax-rowName {
            font-weight: 800;
            font-size: 14px;
            line-height: 1.2;
            display: flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
          }
          .sax-rowMeta {
            margin-top: 4px;
            font-size: 13px;
            opacity: 0.7;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            max-width: 520px;
          }

          .sax-pill {
            font-size: 12px;
            padding: 5px 10px;
            border-radius: 999px;
            border: 1px solid rgba(0, 0, 0, 0.12);
            background: rgba(0, 0, 0, 0.02);
            white-space: nowrap;
          }

          .sax-ghostBtn {
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
          .sax-ghostBtn:disabled {
            opacity: 0.55;
            cursor: not-allowed;
          }

          .sax-hint {
            border: 1px dashed rgba(0, 0, 0, 0.18);
            background: rgba(0, 0, 0, 0.02);
            border-radius: 12px;
            padding: 10px 12px;
            font-size: 13px;
            opacity: 0.9;
            line-height: 1.45;
          }
        `}</style>
      </div>
    </Container>
  );
}
