"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { ActionButton } from "@/components/ui/ActionButton";

type IdentityRow = {
  id: string; identity_key: string; label: string; family_key: string;
  lifecycle_stage: string; workspace_label: string; description: string;
  provider_forms: string[]; engagement_models: string[]; aliases: string[];
  legacy_role: string; legacy_modules: string[];
  requires_business_onboarding: boolean; requires_professional_verification: boolean;
  is_featured: boolean; is_active: boolean; sort_order: number;
};

const families = ["customer","property_real_estate","construction","materials_supply","equipment_rental","professional","skilled_workforce","logistics","finance_investment","legal_compliance","knowledge_media","agriculture_rural","government_public"];
const stages = ["need","land","transaction","planning","approval","development","site_preparation","foundation","structure","envelope","services","finishing","interiors","external_works","procurement","equipment","execution","handover","maintenance","finance","logistics","manufacturing","operations"];
const emptyForm = { identity_key: "", label: "", family_key: "construction", lifecycle_stage: "execution", workspace_label: "", description: "", provider_forms: "individual, firm, company", engagement_models: "direct_service, contract", aliases: "", legacy_role: "vendor", legacy_modules: "services", requires_business_onboarding: true, requires_professional_verification: false, is_featured: false, is_active: true, sort_order: 1000 };

const list = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);
const slug = (value: string) => value.trim().toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

export default function IdentityMasterAdminPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [rows, setRows] = useState<IdentityRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return router.replace("/login?next=/admin/dashboard/master-data/identities");
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", auth.user.id).maybeSingle();
    if ((profile as any)?.role !== "master_admin") return router.replace("/admin/dashboard");
    const { data, error } = await supabase.from("identity_master").select("*").order("sort_order").order("label");
    if (error) throw error;
    setRows((data || []) as IdentityRow[]);
    setLoading(false);
  }, [router, supabase]);

  useEffect(() => { load().catch((error) => { setMessage(error.message || "Could not load identity master. Apply the identity migration first."); setLoading(false); }); }, [load]);

  const visible = rows.filter((row) => {
    const text = `${row.label} ${row.identity_key} ${row.description} ${(row.aliases || []).join(" ")}`.toLowerCase();
    return (!family || row.family_key === family) && (!query || text.includes(query.toLowerCase()));
  });

  function edit(row: IdentityRow) {
    setEditingId(row.id);
    setForm({ ...row, provider_forms: row.provider_forms.join(", "), engagement_models: row.engagement_models.join(", "), aliases: row.aliases.join(", "), legacy_modules: row.legacy_modules.join(", ") } as typeof emptyForm);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    const { data: auth } = await supabase.auth.getUser();
    const payload = { ...form, identity_key: slug(form.identity_key || form.label), provider_forms: list(form.provider_forms), engagement_models: list(form.engagement_models), aliases: list(form.aliases), legacy_modules: list(form.legacy_modules), updated_by: auth.user?.id || null, ...(editingId ? {} : { created_by: auth.user?.id || null }) };
    const request = editingId ? supabase.from("identity_master").update(payload).eq("id", editingId) : supabase.from("identity_master").insert(payload);
    const { error } = await request;
    setBusy(false);
    if (error) return setMessage(error.message);
    setMessage(editingId ? "Identity updated and recorded in the audit history." : "New identity added to the registration catalogue.");
    setEditingId(null); setForm(emptyForm); await load();
  }

  async function toggle(row: IdentityRow) {
    const { error } = await supabase.from("identity_master").update({ is_active: !row.is_active }).eq("id", row.id);
    if (error) return setMessage(error.message);
    setMessage(row.is_active ? "Identity hidden from new registrations; existing members remain preserved." : "Identity published for registration.");
    await load();
  }

  if (loading) return <Container><SectionHeader title="Identity & Capability Master" subtitle="Loading the managed catalogue…" /></Container>;

  return <Container>
    <SectionHeader title="Identity & Capability Master" subtitle="Manage who people are separately from provider form, capability and engagement model." />
    <div className="top"><ActionButton href="/admin/dashboard/master-data" variant="secondary">← Master Data</ActionButton><span>{rows.length} identities · {rows.filter((r) => r.is_active).length} active</span></div>
    {message && <div className="message" role="status">{message}</div>}

    <form className="panel" onSubmit={save}>
      <h2>{editingId ? "Edit identity" : "Add a new identity"}</h2>
      <p>Use one clear work identity. Do not put “individual”, “Pvt. Ltd.” or “turnkey” in every title—those are managed separately below.</p>
      <div className="grid">
        <label>Identity name *<input required value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value, workspace_label: form.workspace_label || `${e.target.value} Workspace`, identity_key: editingId ? form.identity_key : slug(e.target.value) })} /></label>
        <label>Permanent key *<input required value={form.identity_key} disabled={Boolean(editingId)} onChange={(e) => setForm({ ...form, identity_key: slug(e.target.value) })} /></label>
        <label>Family *<select value={form.family_key} onChange={(e) => setForm({ ...form, family_key: e.target.value })}>{families.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label>Lifecycle stage *<select value={form.lifecycle_stage} onChange={(e) => setForm({ ...form, lifecycle_stage: e.target.value })}>{stages.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label>Workspace label *<input required value={form.workspace_label} onChange={(e) => setForm({ ...form, workspace_label: e.target.value })} /></label>
        <label>Display order<input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></label>
        <label className="wide">Plain-language description *<textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <label>Provider forms (comma separated)<input value={form.provider_forms} onChange={(e) => setForm({ ...form, provider_forms: e.target.value })} /></label>
        <label>Engagement models (comma separated)<input value={form.engagement_models} onChange={(e) => setForm({ ...form, engagement_models: e.target.value })} /></label>
        <label>Aliases / regional search words<input value={form.aliases} onChange={(e) => setForm({ ...form, aliases: e.target.value })} /></label>
        <label>Legacy modules<input value={form.legacy_modules} onChange={(e) => setForm({ ...form, legacy_modules: e.target.value })} /></label>
      </div>
      <div className="checks">
        <label><input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} /> Main choice</label>
        <label><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active</label>
        <label><input type="checkbox" checked={form.requires_business_onboarding} onChange={(e) => setForm({ ...form, requires_business_onboarding: e.target.checked })} /> Business onboarding</label>
        <label><input type="checkbox" checked={form.requires_professional_verification} onChange={(e) => setForm({ ...form, requires_professional_verification: e.target.checked })} /> Verification required</label>
      </div>
      <div className="actions"><button disabled={busy}>{busy ? "Saving…" : editingId ? "Save changes" : "Add identity"}</button>{editingId && <button type="button" className="secondary" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel</button>}</div>
    </form>

    <section className="catalogue">
      <div className="filters"><input placeholder="Search identity, alias or description" value={query} onChange={(e) => setQuery(e.target.value)} /><select value={family} onChange={(e) => setFamily(e.target.value)}><option value="">All families</option>{families.map((x) => <option key={x}>{x}</option>)}</select></div>
      <div className="rows">{visible.map((row) => <article key={row.id} className={!row.is_active ? "inactive" : ""}>
        <div><strong>{row.label}</strong><small>{row.family_key.replaceAll("_", " ")} · {row.lifecycle_stage.replaceAll("_", " ")} · order {row.sort_order}</small><p>{row.description}</p><small>Forms: {row.provider_forms.join(", ")} · Models: {row.engagement_models.join(", ")}</small></div>
        <div className="rowActions"><button type="button" onClick={() => edit(row)}>Edit</button><button type="button" className="secondary" onClick={() => toggle(row)}>{row.is_active ? "Deactivate" : "Activate"}</button></div>
      </article>)}</div>
    </section>
    <style jsx>{`
      .top,.actions,.checks,.filters,.rowActions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.top{justify-content:space-between;margin:12px 0 18px}.message{padding:12px;border:1px solid #93c5fd;background:#eff6ff;border-radius:10px;margin-bottom:14px}.panel,.catalogue{background:white;border:1px solid #e2e8f0;border-radius:16px;padding:18px;margin-bottom:20px}.panel h2{margin:0 0 4px}.panel p{color:#64748b;margin:0 0 16px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}.wide{grid-column:1/-1}label{font-weight:800;font-size:13px}input,select,textarea{display:block;width:100%;margin-top:6px;border:1px solid #cbd5e1;border-radius:9px;padding:10px;background:white}textarea{min-height:76px}.checks{margin:16px 0}.checks label{display:flex;align-items:center;gap:6px}.checks input{width:auto;margin:0}button{border:0;border-radius:9px;padding:10px 14px;background:#2563eb;color:white;font-weight:800;cursor:pointer}.secondary{background:white;color:#334155;border:1px solid #cbd5e1}.filters{margin-bottom:12px}.filters input{flex:1;min-width:240px}.filters select{width:auto}.rows{display:grid;gap:10px}.rows article{display:flex;justify-content:space-between;gap:16px;border:1px solid #e2e8f0;border-radius:12px;padding:14px}.rows article.inactive{opacity:.58;background:#f8fafc}.rows strong,.rows small{display:block}.rows small{color:#64748b;margin-top:4px}.rows p{margin:6px 0;color:#334155}.rowActions{align-self:center;flex-shrink:0}@media(max-width:640px){.rows article{display:block}.rowActions{margin-top:12px}.filters select{width:100%}}
    `}</style>
  </Container>;
}
