"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import MasterDescriptionAi, { MasterEditNavigation } from "./MasterDataAssistants";
import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { ActionButton } from "@/components/ui/ActionButton";
import RegistrationMasterSections from "./RegistrationMasterSections";
import OperatingCapabilityMasterSections from "./OperatingCapabilityMasterSections";
import { useIdentityAi } from "./useIdentityAi";
import { identityFamilies as families, identityStages as stages } from "@/lib/admin/identity-ai-options";

type IdentityRow = {
  id: string; identity_key: string; label: string; family_key: string;
  lifecycle_stage: string; workspace_label: string; description: string;
  provider_forms: string[]; engagement_models: string[]; aliases: string[];
  legacy_role: string; legacy_modules: string[];
  requires_business_onboarding: boolean; requires_professional_verification: boolean;
  registration_scopes: string[]; lifetime_free_candidate: boolean; redirect_to_business: boolean;
  is_featured: boolean; is_active: boolean; sort_order: number;
};



const emptyForm = { identity_key: "", label: "", family_key: "construction", lifecycle_stage: "execution", workspace_label: "", description: "", provider_forms: "individual, firm, company", engagement_models: "direct_service, contract", aliases: "", legacy_role: "vendor", legacy_modules: "services", registration_scopes: "", lifetime_free_candidate: false, redirect_to_business: false, requires_business_onboarding: true, requires_professional_verification: false, is_featured: false, is_active: true, sort_order: 1000 };

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
  const [activeWorkspace, setActiveWorkspace] = useState<
    "identities" | "registration" | "capabilities"
  >("identities");

  const [identityWorkspaceView, setIdentityWorkspaceView] = useState<
    "editor" | "catalogue"
  >("editor");

  const [capabilityWorkspaceView, setCapabilityWorkspaceView] = useState<
    "capabilities" | "mappings"
  >("capabilities");
  const { aiBusy, aiMessage, changeAiField, regenerateDescription } =
    useIdentityAi(form, setForm, editingId);

  const possibleDuplicates = rows.filter(row =>
    row.id !== editingId && (
      row.label.trim().toLowerCase() === form.label.trim().toLowerCase() ||
      (Boolean(form.identity_key.trim()) &&
        row.identity_key === form.identity_key.trim())
    )
  );

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
    setActiveWorkspace("identities");
    setIdentityWorkspaceView("editor");
    setEditingId(row.id);
    setForm({ ...row, provider_forms: row.provider_forms.join(", "), engagement_models: row.engagement_models.join(", "), aliases: row.aliases.join(", "), legacy_modules: row.legacy_modules.join(", "), registration_scopes: (row.registration_scopes || []).join(", ") } as typeof emptyForm);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy || aiBusy) return;
    if (!editingId && possibleDuplicates.length) {
      setMessage("An identity with this name or permanent key already exists. Review the catalogue and use Edit.");
      return;
    }
    setBusy(true); setMessage("");
    const { data: auth } = await supabase.auth.getUser();
    const payload = { ...form, identity_key: slug(form.identity_key || form.label), provider_forms: list(form.provider_forms), engagement_models: list(form.engagement_models), aliases: list(form.aliases), legacy_modules: list(form.legacy_modules), registration_scopes: list(form.registration_scopes), updated_by: auth.user?.id || null, ...(editingId ? {} : { created_by: auth.user?.id || null }) };
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

  if (loading) return <Container><SectionHeader title="Constitutional Registration Master" subtitle="Loading the managed catalogue…" /></Container>;

  return <Container>
    <SectionHeader title="Constitutional Registration Master" subtitle="Manage who people are separately from provider form, capability and engagement model." />
    <div className="top"><ActionButton href="/admin/dashboard/master-data" variant="secondary">← Master Data</ActionButton><span>{rows.length} identities · {rows.filter((r) => r.is_active).length} active</span></div>
    {message && <div className="message" role="status">{message}</div>}

    <section className="masterWorkspaceChooser" aria-labelledby="master-workspace-heading">
      <div className="masterWorkspaceHeading">
        <div>
          <small>REGISTRATION OPERATING SYSTEM</small>
          <h2 id="master-workspace-heading">Choose a control category</h2>
          <p>
            Open only the group you are working on. Existing records, permissions,
            AI assistance and registration behaviour remain unchanged.
          </p>
        </div>
      </div>

      <div className="masterWorkspaceNav" role="tablist" aria-label="Constitutional registration controls">
        <button
          type="button"
          role="tab"
          aria-selected={activeWorkspace === "identities"}
          className={activeWorkspace === "identities" ? "active" : ""}
          onClick={() => {
            setActiveWorkspace("identities");
            setIdentityWorkspaceView("editor");
          }}
        >
          <span>01</span>
          <strong>Identity Catalogue</strong>
          <small>Add, edit, search and activate reusable identities.</small>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeWorkspace === "registration"}
          className={activeWorkspace === "registration" ? "active" : ""}
          onClick={() => setActiveWorkspace("registration")}
        >
          <span>02</span>
          <strong>Business Registration Controls</strong>
          <small>Manage constitutions, sectors, mappings, redirects and previews.</small>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeWorkspace === "capabilities"}
          className={activeWorkspace === "capabilities" ? "active" : ""}
          onClick={() => {
            setActiveWorkspace("capabilities");
            setCapabilityWorkspaceView("capabilities");
          }}
        >
          <span>03</span>
          <strong>3BOS Operating Access</strong>
          <small>Define operating capabilities and map them to identities.</small>
        </button>
      </div>
    </section>

    <MasterEditNavigation />

    {activeWorkspace === "identities" && (
      <nav className="secondaryWorkspaceNav" aria-label="Identity catalogue sections">
        <button
          type="button"
          className={identityWorkspaceView === "editor" ? "active" : ""}
          aria-pressed={identityWorkspaceView === "editor"}
          onClick={() => setIdentityWorkspaceView("editor")}
        >
          <strong>{editingId ? "Edit Identity" : "Add Identity"}</strong>
          <small>Create a new identity or continue the selected edit.</small>
        </button>

        <button
          type="button"
          className={identityWorkspaceView === "catalogue" ? "active" : ""}
          aria-pressed={identityWorkspaceView === "catalogue"}
          onClick={() => setIdentityWorkspaceView("catalogue")}
        >
          <strong>Browse Identities</strong>
          <small>Search, review and select from all {rows.length} identities.</small>
        </button>
      </nav>
    )}

    {activeWorkspace === "identities" &&
      identityWorkspaceView === "editor" && (
    <form id="identity-master-form" className="panel" onSubmit={save}>
      <h2>{editingId ? "Edit identity" : "Add a new identity"}</h2>
      <p>Add a reusable work category, not an individual member or company. Example: Civil Contractor. Search the catalogue below before adding a duplicate. Identity, provider form, engagement model and operating capabilities are managed separately.</p>
      <div className="message" role="status" aria-live="polite">
        <strong>AI identity assistant</strong>
        <div>{aiMessage}</div>
        {!editingId && (
          <button type="button" className="secondary"
            style={{ marginTop: 10 }}
            disabled={aiBusy || busy || form.label.trim().length < 3}
            onClick={regenerateDescription}>
            {aiBusy ? "Preparing suggestions…" : "Retry AI / regenerate description"}
          </button>
        )}
        <small style={{ display: "block", marginTop: 8 }}>
          AI suggests catalogue wording only. Review every field before saving.
          Registration scopes, verification and subscription settings are not changed by AI.
        </small>
      </div>
      {possibleDuplicates.length > 0 && (
        <div className="message" role="status">
          Possible existing identity: {possibleDuplicates.map(row => row.label).join(", ")}.
          Check the catalogue and use Edit rather than adding a duplicate.
        </div>
      )}
      <div className="grid">
        <label>Identity name *<input required value={form.label} onChange={(e) => changeAiField("label", e.target.value)} /><small className="identity-field-help">Enter the type of work, not a member or company name. Example: Civil Contractor.</small></label>
        <label>Permanent key *<input required value={form.identity_key} disabled={Boolean(editingId)} onChange={(e) => changeAiField("identity_key", slug(e.target.value))} /><small className="identity-field-help">Permanent system identifier. Example: civil_contractor. Generated from the name; check it before saving. Existing keys stay locked.</small></label>
        <label>Family *<select required value={form.family_key} onChange={(e) => changeAiField("family_key", e.target.value)}><option value="">Choose family</option>{families.map((x) => <option key={x}>{x}</option>)}</select><small className="identity-field-help">Choose the broad work group. Example: construction for Civil Contractor. This grouping does not itself grant operating tools.</small></label>
        <label>Lifecycle stage *<select required value={form.lifecycle_stage} onChange={(e) => changeAiField("lifecycle_stage", e.target.value)}><option value="">Choose lifecycle stage</option>{stages.map((x) => <option key={x}>{x}</option>)}</select><small className="identity-field-help">Choose the main stage where this identity works. Example: execution for Civil Contractor; planning for a planning role.</small></label>
        <label>Workspace label *<input required value={form.workspace_label} onChange={(e) => changeAiField("workspace_label", e.target.value)} /><small className="identity-field-help">Enter the workspace title members should see. Example: Civil Contractor Workspace. You can customise the suggested title.</small></label>
        <label>Display order<input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /><small className="identity-field-help">Lower numbers appear first. Example: 100 appears before 200. Use whole numbers and leave gaps for future entries.</small></label>
        <label className="wide">Plain-language description *<textarea required value={form.description} onChange={(e) => changeAiField("description", e.target.value)} /><small className="identity-field-help">Explain the work in a simple sentence. Example: Carries out civil construction work for buildings and sites.</small></label>
          <div className="wide">
            <MasterDescriptionAi
              kind="identity"
              context={{ name: form.label, key: form.identity_key, family: form.family_key, stage: form.lifecycle_stage }}
              currentValue={form.description}
              disabled={busy || aiBusy}
              onApply={value => changeAiField("description", value)}
            />
          </div>
        <label>Provider forms (comma separated)<input value={form.provider_forms} onChange={(e) => setForm({ ...form, provider_forms: e.target.value })} /><small className="identity-field-help">Comma-separated system keys for how the provider operates. Current form example: individual, firm, company. Preserve established keys.</small></label>
        <label>Engagement models (comma separated)<input value={form.engagement_models} onChange={(e) => setForm({ ...form, engagement_models: e.target.value })} /><small className="identity-field-help">Comma-separated system keys for how work is engaged. Current form example: direct_service, contract. Preserve established keys.</small></label>
        <label>Aliases / regional search words<input value={form.aliases} onChange={(e) => setForm({ ...form, aliases: e.target.value })} /><small className="identity-field-help">Alternative names people may search for, separated by commas. Example: civil works contractor, building contractor. These are search terms, not extra identities.</small></label>
        <label>Legacy modules<input value={form.legacy_modules} onChange={(e) => setForm({ ...form, legacy_modules: e.target.value })} /><small className="identity-field-help">Compatibility setting for existing modules. This form defaults to services. Preserve existing values unless their downstream use has been checked.</small></label>
        <label className="wide">Registration scopes<input value={form.registration_scopes} onChange={(e) => setForm({ ...form, registration_scopes: e.target.value })} placeholder="business_identity, business_personal_role, individual_skill" /><small className="identity-field-help">Controls which registration lists include this identity. Supported scopes shown here: business_identity, business_personal_role, individual_skill. Separate applicable scopes with commas; leaving this blank excludes it from the corresponding lists on this page.</small></label>
      </div>
      <div className="checks">
        <label><input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} /> Main choice<small className="identity-field-help">Marks this identity as a main choice. Use selectively; it does not grant operating capabilities.</small></label>
        <label><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active<small className="identity-field-help">Controls the identity's active status. Review its registration and capability mappings before changing an existing identity.</small></label>
        <label><input type="checkbox" checked={form.requires_business_onboarding} onChange={(e) => setForm({ ...form, requires_business_onboarding: e.target.checked })} /> Business onboarding<small className="identity-field-help">Business-onboarding requirement flag. Preserve existing settings until the registration flow has been checked.</small></label>
        <label><input type="checkbox" checked={form.requires_professional_verification} onChange={(e) => setForm({ ...form, requires_professional_verification: e.target.checked })} /> Verification required<small className="identity-field-help">Professional-verification requirement flag. Select according to the approved verification policy; this does not verify a member by itself.</small></label>
        <label><input type="checkbox" checked={form.lifetime_free_candidate} onChange={(e) => setForm({ ...form, lifetime_free_candidate: e.target.checked })} /> Lifetime Free eligibility candidate<small className="identity-field-help">Eligibility candidate only. This flag is not, by itself, confirmation that a member receives a free subscription.</small></label>
        <label><input type="checkbox" checked={form.redirect_to_business} onChange={(e) => setForm({ ...form, redirect_to_business: e.target.checked })} /> Redirect to Business Registration<small className="identity-field-help">Business-registration redirect flag. Review it with the Registration Redirect Rules below; do not change it independently without checking the intended journey.</small></label>
      </div>
      <div className="actions"><button disabled={busy || aiBusy}>{busy ? "Saving…" : editingId ? "Save changes" : "Add identity"}</button>{editingId && <button type="button" className="secondary" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel</button>}</div>
    </form>
    )}

    {activeWorkspace === "registration" && (
      <div className="workspaceContent" role="tabpanel">
        <div className="workspaceIntroduction">
          <small>BUSINESS REGISTRATION</small>
          <h2>Registration Controls</h2>
          <p>
            Manage legal constitutions, business sectors, identity mappings,
            redirect journeys and registration previews.
          </p>
        </div>
        <RegistrationMasterSections identities={rows} />
      </div>
    )}

    {activeWorkspace === "capabilities" && (
      <div className="workspaceContent" role="tabpanel">
        <div className="workspaceIntroduction">
          <small>3BOS OPERATING ACCESS</small>
          <h2>Capabilities and Identity Access</h2>
          <p>
            Define internal operating tools and explicitly assign them to
            the appropriate business identities.
          </p>
        </div>
        <nav className="secondaryWorkspaceNav" aria-label="3BOS operating access sections">
          <button
            type="button"
            className={capabilityWorkspaceView === "capabilities" ? "active" : ""}
            aria-pressed={capabilityWorkspaceView === "capabilities"}
            onClick={() => setCapabilityWorkspaceView("capabilities")}
          >
            <strong>Operating Capabilities</strong>
            <small>Define and maintain the internal 3BOS tools.</small>
          </button>

          <button
            type="button"
            className={capabilityWorkspaceView === "mappings" ? "active" : ""}
            aria-pressed={capabilityWorkspaceView === "mappings"}
            onClick={() => setCapabilityWorkspaceView("mappings")}
          >
            <strong>Identity Mappings</strong>
            <small>Assign appropriate capabilities to business identities.</small>
          </button>
        </nav>

        <OperatingCapabilityMasterSections
          identities={rows}
          activeSection={capabilityWorkspaceView}
        />
      </div>
    )}

    {activeWorkspace === "identities" &&
      identityWorkspaceView === "catalogue" && (
    <section className="catalogue">
      <div className="filters"><input placeholder="Search identity, alias or description" value={query} onChange={(e) => setQuery(e.target.value)} /><select value={family} onChange={(e) => setFamily(e.target.value)}><option value="">All families</option>{families.map((x) => <option key={x}>{x}</option>)}</select></div>
      <div className="rows">{visible.map((row) => <article key={row.id} className={!row.is_active ? "inactive" : ""}>
        <div><strong>{row.label}</strong><small>{row.family_key.replaceAll("_", " ")} · {row.lifecycle_stage.replaceAll("_", " ")} · order {row.sort_order}</small><p>{row.description}</p><small>Forms: {row.provider_forms.join(", ")} · Models: {row.engagement_models.join(", ")}</small></div>
        <div className="rowActions"><button type="button" onClick={() => edit(row)}>Edit</button><button type="button" className="secondary" onClick={() => toggle(row)}>{row.is_active ? "Deactivate" : "Activate"}</button></div>
      </article>)}</div>
    </section>
    )}

    <style jsx>{`
      .masterWorkspaceChooser {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 18px;
        padding: 18px;
        margin-bottom: 20px;
      }

      .masterWorkspaceHeading small,
      .workspaceIntroduction > small {
        color: #047857;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: .12em;
      }

      .masterWorkspaceHeading h2,
      .workspaceIntroduction h2 {
        margin: 5px 0;
      }

      .masterWorkspaceHeading p,
      .workspaceIntroduction p {
        margin: 0;
        color: #64748b;
        line-height: 1.6;
      }

      .masterWorkspaceNav {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
        margin-top: 16px;
      }

      .masterWorkspaceNav button {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 4px 10px;
        min-height: 118px;
        padding: 16px;
        text-align: left;
        align-content: center;
        background: #fff;
        color: #172033;
        border: 1px solid #dbe3ec;
        border-radius: 15px;
        box-shadow: none;
      }

      .masterWorkspaceNav button:hover {
        border-color: #60a5fa;
        background: #f8fbff;
      }

      .masterWorkspaceNav button.active {
        border-color: #2563eb;
        background: #eff6ff;
        box-shadow: 0 0 0 2px rgba(37, 99, 235, .1);
      }

      .masterWorkspaceNav button > span {
        grid-row: 1 / 3;
        color: #2563eb;
        font-size: 12px;
        font-weight: 900;
      }

      .masterWorkspaceNav button strong {
        font-size: 15px;
      }

      .masterWorkspaceNav button small {
        color: #64748b;
        font-weight: 500;
        line-height: 1.45;
      }

      .workspaceContent {
        margin-bottom: 20px;
      }

      .secondaryWorkspaceNav {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        padding: 8px;
        margin-bottom: 16px;
        border: 1px solid #dbe3ec;
        border-radius: 15px;
        background: #f8fafc;
      }

      .secondaryWorkspaceNav button {
        display: grid;
        gap: 5px;
        min-height: 82px;
        padding: 14px 16px;
        text-align: left;
        color: #172033;
        background: #fff;
        border: 1px solid transparent;
        border-radius: 11px;
        box-shadow: none;
      }

      .secondaryWorkspaceNav button:hover {
        border-color: #93c5fd;
      }

      .secondaryWorkspaceNav button.active {
        color: #1d4ed8;
        border-color: #2563eb;
        background: #eff6ff;
        box-shadow: 0 0 0 2px rgba(37, 99, 235, .08);
      }

      .secondaryWorkspaceNav button small {
        color: #64748b;
        font-weight: 500;
        line-height: 1.45;
      }

      .workspaceIntroduction {
        padding: 18px;
        margin-bottom: 14px;
        border: 1px solid #bfdbfe;
        border-radius: 16px;
        background: linear-gradient(135deg, #eff6ff, #fff);
      }

      @media(max-width: 850px) {
        .masterWorkspaceNav,
        .secondaryWorkspaceNav {
          grid-template-columns: 1fr;
        }

        .masterWorkspaceNav button {
          min-height: 96px;
        }
      }

      .identity-field-help {
        display: block;
        margin-top: 6px;
        color: #475569;
        font-size: 12px;
        font-weight: 400;
        line-height: 1.5;
      }
      .checks label {
        flex-wrap: wrap;
        align-content: flex-start;
        flex: 1 1 260px;
      }
      .checks .identity-field-help {
        flex-basis: 100%;
      }

      .top,.actions,.checks,.filters,.rowActions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.top{justify-content:space-between;margin:12px 0 18px}.message{padding:12px;border:1px solid #93c5fd;background:#eff6ff;border-radius:10px;margin-bottom:14px}.panel,.catalogue{background:white;border:1px solid #e2e8f0;border-radius:16px;padding:18px;margin-bottom:20px}.panel h2{margin:0 0 4px}.panel p{color:#64748b;margin:0 0 16px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}.wide{grid-column:1/-1}label{font-weight:800;font-size:13px}input,select,textarea{display:block;width:100%;margin-top:6px;border:1px solid #cbd5e1;border-radius:9px;padding:10px;background:white}textarea{min-height:76px}.checks{margin:16px 0}.checks label{display:flex;align-items:center;gap:6px}.checks input{width:auto;margin:0}button{border:0;border-radius:9px;padding:10px 14px;background:#2563eb;color:white;font-weight:800;cursor:pointer}.secondary{background:white;color:#334155;border:1px solid #cbd5e1}.filters{margin-bottom:12px}.filters input{flex:1;min-width:240px}.filters select{width:auto}.rows{display:grid;gap:10px}.rows article{display:flex;justify-content:space-between;gap:16px;border:1px solid #e2e8f0;border-radius:12px;padding:14px}.rows article.inactive{opacity:.58;background:#f8fafc}.rows strong,.rows small{display:block}.rows small{color:#64748b;margin-top:4px}.rows p{margin:6px 0;color:#334155}.rowActions{align-self:center;flex-shrink:0}@media(max-width:640px){.rows article{display:block}.rowActions{margin-top:12px}.filters select{width:100%}}
    `}</style>
  </Container>;
}
