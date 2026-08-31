"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import MasterDescriptionAi from "./MasterDataAssistants";
import { useSectorAi } from "./useSectorAi";
import MappingAiAssistant from "./MappingAiAssistant";

type IdentityOption = {
  id: string;
  identity_key: string;
  label: string;
  registration_scopes?: string[];
  is_active: boolean;
};

type LegalRow = {
  key: string;
  label: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
};

type SectorRow = {
  key: string;
  title: string;
  description: string | null;
  symbol: string | null;
  sort_order: number;
  is_active: boolean;
};

type MappingRow = {
  identity_key: string;
  sector_key: string;
  nature_modules: string[];
  sort_order: number;
  is_active: boolean;
};

type RedirectRow = {
  id: number;
  trigger_key: string;
  display_text: string;
  description: string | null;
  target_registration_path: string;
  redirect_after_selection: boolean;
  business_reason: string | null;
  target_business_identity_key: string | null;
  sort_order: number;
  is_active: boolean;
};

const csv = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const slug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export default function RegistrationMasterSections({
  identities,
}: {
  identities: IdentityOption[];
}) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [legalRows, setLegalRows] = useState<LegalRow[]>([]);
  const [sectorRows, setSectorRows] = useState<SectorRow[]>([]);
  const [mappingRows, setMappingRows] = useState<MappingRow[]>([]);
  const [redirectRows, setRedirectRows] = useState<RedirectRow[]>([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const [editingLegalKey, setEditingLegalKey] = useState<string | null>(null);

  const [legalForm, setLegalForm] = useState({
    key: "",
    label: "",
    description: "",
    sort_order: 1000,
    is_active: true,
  });

  const [editingSectorKey, setEditingSectorKey] = useState<string | null>(null);

  const [sectorForm, setSectorForm] = useState({
    key: "",
    title: "",
    description: "",
    symbol: "",
    sort_order: 1000,
    is_active: true,
  });

  const sectorAi = useSectorAi(sectorForm, setSectorForm, editingSectorKey);

  const sectorDuplicates = sectorRows.filter(row =>
    row.key !== editingSectorKey && (
      row.title.trim().toLowerCase() === sectorForm.title.trim().toLowerCase() ||
      row.key === slug(sectorForm.key || sectorForm.title)
    )
  );

  const [editingMapping, setEditingMapping] = useState<MappingRow | null>(null);
  const mappingModules = ["property", "materials", "services", "rentals", "blog"];

  const [mappingForm, setMappingForm] = useState({
    identity_key: "",
    sector_key: "",
    nature_modules: "",
    sort_order: 1000,
    is_active: true,
  });

  const [redirectForm, setRedirectForm] = useState({
    id: null as number | null,
    trigger_key: "",
    display_text: "",
    description: "",
    target_registration_path: "/onboarding/business?registration=1",
    redirect_after_selection: true,
    business_reason: "",
    target_business_identity_key: "",
    sort_order: 1000,
    is_active: true,
  });

  const load = useCallback(async () => {
    const [legal, sectors, mappings, redirects] = await Promise.all([
      supabase
        .from("registration_legal_constitutions")
        .select("*")
        .order("sort_order")
        .order("label"),
      supabase
        .from("registration_business_sectors")
        .select("*")
        .order("sort_order")
        .order("title"),
      supabase
        .from("registration_identity_sector_map")
        .select("*")
        .order("sort_order"),
      supabase
        .from("registration_redirect_rules")
        .select("*")
        .order("sort_order")
        .order("display_text"),
    ]);

    const firstError =
      legal.error ||
      sectors.error ||
      mappings.error ||
      redirects.error;

    if (firstError) {
      throw firstError;
    }

    setLegalRows((legal.data || []) as LegalRow[]);
    setSectorRows((sectors.data || []) as SectorRow[]);
    setMappingRows((mappings.data || []) as MappingRow[]);
    setRedirectRows((redirects.data || []) as RedirectRow[]);
  }, [supabase]);

  useEffect(() => {
    load().catch((error) =>
      setMessage(
        error?.message ||
          "Could not load Constitutional Registration Master data."
      )
    );
  }, [load]);

  const activeBusinessIdentities = identities.filter(
    (identity) =>
      identity.is_active &&
      (identity.registration_scopes || []).includes("business_identity")
  );

  const activePersonalRoles = identities.filter(
    (identity) =>
      identity.is_active &&
      (identity.registration_scopes || []).includes(
        "business_personal_role"
      )
  );

  const activeIndividualSkills = identities.filter(
    (identity) =>
      identity.is_active &&
      (identity.registration_scopes || []).includes("individual_skill")
  );

  const q = query.trim().toLowerCase();

  const visibleRedirects = redirectRows.filter((row) => {
    if (!q) return true;
    return `${row.trigger_key} ${row.display_text} ${row.description || ""} ${
      row.business_reason || ""
    }`
      .toLowerCase()
      .includes(q);
  });

  function resetLegalForm() {
    setEditingLegalKey(null);
    setLegalForm({
      key: "",
      label: "",
      description: "",
      sort_order: 1000,
      is_active: true,
    });
  }

  async function saveLegal(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setMessage("");

    const label = legalForm.label.trim();
    const key = editingLegalKey || slug(legalForm.key || label);

    if (!label || !key) {
      setMessage("Enter a constitution name and a valid permanent key using English letters or numbers.");
      return;
    }

    if (!Number.isSafeInteger(legalForm.sort_order)) {
      setMessage("Display order must be a whole number.");
      return;
    }

    if (!editingLegalKey && legalRows.some((row) => row.key === key)) {
      setMessage("This permanent key already exists. Use Edit beside the existing entry, or choose a different key for a different constitution.");
      return;
    }

    setBusy(true);
    try {
      const values = {
        label,
        description: legalForm.description.trim() || null,
        sort_order: legalForm.sort_order,
        is_active: legalForm.is_active,
      };

      const request = editingLegalKey
        ? supabase.from("registration_legal_constitutions")
            .update(values).eq("key", editingLegalKey)
        : supabase.from("registration_legal_constitutions")
            .insert({ ...values, key });

      const { data, error } = await request.select("key").single();
      if (error) throw error;
      if (!data) throw new Error("No saved entry returned. Refresh and check the catalogue before retrying.");

      const wasEditing = Boolean(editingLegalKey);
      resetLegalForm();
      setMessage(wasEditing ? "Legal constitution updated." : "Legal constitution added.");

      try {
        await load();
      } catch {
        setMessage("Saved successfully, but the list could not refresh. Reload this page before making another change.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message :
        (error as { message?: string })?.message || "Could not save the constitution.");
    } finally {
      setBusy(false);
    }
  }

  function resetSectorForm() {
    setEditingSectorKey(null);
    setSectorForm({
      key: "", title: "", description: "", symbol: "",
      sort_order: 1000, is_active: true,
    });
  }

  async function saveSector(event: React.FormEvent) {
    event.preventDefault();
    if (busy || sectorAi.aiBusy) return;
    setMessage("");

    const title = sectorForm.title.trim();
    const key = editingSectorKey || slug(sectorForm.key || title);
    if (!title || !key) {
      setMessage("Enter a sector title and a valid permanent key.");
      return;
    }
    if (!Number.isSafeInteger(sectorForm.sort_order)) {
      setMessage("Display order must be a whole number.");
      return;
    }
    if (sectorDuplicates.length) {
      setMessage("A sector with this title or key already exists. Use Edit beside the existing entry.");
      return;
    }

    setBusy(true);
    try {
      const values = {
        title,
        description: sectorForm.description.trim() || null,
        symbol: sectorForm.symbol.trim() || null,
        sort_order: sectorForm.sort_order,
        is_active: sectorForm.is_active,
      };

      const request = editingSectorKey
        ? supabase.from("registration_business_sectors")
            .update(values).eq("key", editingSectorKey)
        : supabase.from("registration_business_sectors")
            .insert({ ...values, key });

      const { data, error } = await request.select("key").single();
      if (error) throw error;
      if (!data) throw new Error("No saved sector returned. Refresh and check before retrying.");

      const wasEditing = Boolean(editingSectorKey);
      resetSectorForm();
      setMessage(wasEditing ? "Business sector updated." : "Business sector added.");

      try {
        await load();
      } catch {
        setMessage("Sector saved, but the list could not refresh. Reload before making another change.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message :
        (error as { message?: string })?.message || "Could not save the sector.");
    } finally {
      setBusy(false);
    }
  }

  function resetMappingForm() {
    setEditingMapping(null);
    setMappingForm({
      identity_key: "",
      sector_key: "",
      nature_modules: "",
      sort_order: 1000,
      is_active: true,
    });
  }

  function changeMappingModule(module: string, checked: boolean) {
    setMappingForm(current => {
      const selected = new Set(csv(current.nature_modules));
      if (checked) selected.add(module);
      else selected.delete(module);
      return { ...current, nature_modules: Array.from(selected).join(", ") };
    });
  }

  async function saveMapping(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setMessage("");

    const identityKey = editingMapping?.identity_key || mappingForm.identity_key;
    const sectorKey = editingMapping?.sector_key || mappingForm.sector_key;
    const modules = Array.from(new Set(csv(mappingForm.nature_modules)));

    if (!identityKey || !sectorKey) {
      setMessage("Choose both a business identity and a sector.");
      return;
    }

    if (!Number.isSafeInteger(mappingForm.sort_order)) {
      setMessage("Display order must be a whole number.");
      return;
    }

    const identity = identities.find(row => row.identity_key === identityKey);
    const sector = sectorRows.find(row => row.key === sectorKey);

    if (!identity || !sector) {
      setMessage("The identity or sector is unavailable. Refresh the page before saving.");
      return;
    }

    if ((!editingMapping || mappingForm.is_active) &&
        (!identity.is_active ||
         !(identity.registration_scopes || []).includes("business_identity") ||
         !sector.is_active)) {
      setMessage("New or active mappings require an active business identity and an active sector.");
      return;
    }

    // Preserve existing unrecognised values during maintenance.
    // They cannot be introduced into a new mapping.
    const originalModules = editingMapping?.nature_modules || [];
    const unexpected = modules.filter(module =>
      !mappingModules.includes(module) && !originalModules.includes(module)
    );

    if (unexpected.length) {
      setMessage("Unsupported marketplace modules: " + unexpected.join(", "));
      return;
    }

    if (!editingMapping && mappingRows.some(row =>
      row.identity_key === identityKey && row.sector_key === sectorKey
    )) {
      setMessage("This identity-to-sector mapping already exists. Use its Edit button.");
      return;
    }

    if (mappingForm.is_active && modules.length === 0 &&
        !window.confirm(
          "This active mapping has no marketplace modules. It will contribute no activities to registration. Save it anyway?"
        )) return;

    setBusy(true);
    try {
      const values = {
        nature_modules: modules,
        sort_order: mappingForm.sort_order,
        is_active: mappingForm.is_active,
      };

      const request = editingMapping
        ? supabase.from("registration_identity_sector_map")
            .update(values)
            .eq("identity_key", editingMapping.identity_key)
            .eq("sector_key", editingMapping.sector_key)
        : supabase.from("registration_identity_sector_map")
            .insert({ identity_key: identityKey, sector_key: sectorKey, ...values });

      const { data, error } = await request
        .select("identity_key,sector_key").single();

      if (error) throw error;
      if (!data) throw new Error("No saved mapping returned. Refresh and check before retrying.");

      const wasEditing = Boolean(editingMapping);
      resetMappingForm();
      setMessage(wasEditing ? "Identity-to-sector mapping updated." : "Identity-to-sector mapping added.");

      try {
        await load();
      } catch {
        setMessage("Mapping saved, but the list could not refresh. Reload before making another change.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message :
        (error as { message?: string })?.message || "Could not save the mapping.");
    } finally {
      setBusy(false);
    }
  }

  function resetRedirectForm() {
    setRedirectForm({
      id: null,
      trigger_key: "",
      display_text: "",
      description: "",
      target_registration_path: "/onboarding/business?registration=1",
      redirect_after_selection: true,
      business_reason: "",
      target_business_identity_key: "",
      sort_order: 1000,
      is_active: true,
    });
  }

  function previewRedirectRule() {
    const path = redirectForm.target_registration_path.trim();
    const key = redirectForm.trigger_key || slug(redirectForm.display_text);

    try {
      if (!path.startsWith("/") || path.startsWith("//") ||
          /[\\\\\\s]/.test(path)) {
        throw new Error("Use a relative Business Registration path without spaces or backslashes.");
      }

      const target = new URL(path, "https://3bigha.invalid");

      if (target.origin !== "https://3bigha.invalid" ||
          target.pathname !== "/onboarding/business" ||
          target.hash) {
        throw new Error("Use /onboarding/business?registration=1. Other destinations require a separate workflow review.");
      }

      for (const [name, value] of target.searchParams.entries()) {
        if (name !== "registration" || value !== "1") {
          throw new Error("Only registration=1 belongs in this path. The trigger and business identity are added automatically.");
        }
      }

      if (target.searchParams.getAll("registration").length > 1) {
        throw new Error("Include registration=1 only once.");
      }

      target.searchParams.set("registration", "1");
      target.searchParams.set("redirectTrigger", key);

      if (redirectForm.target_business_identity_key) {
        target.searchParams.set("businessIdentity", redirectForm.target_business_identity_key);
      }

      return { target: target.pathname + target.search, error: "" };
    } catch (error) {
      return {
        target: "",
        error: error instanceof Error ? error.message : "Invalid registration destination.",
      };
    }
  }

  async function saveRedirect(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setMessage("");

    const editing = redirectForm.id !== null;
    const original = editing
      ? redirectRows.find(row => row.id === redirectForm.id)
      : null;

    if (editing && !original) {
      setMessage("The original rule is unavailable. Refresh before saving.");
      return;
    }

    const key = original?.trigger_key ||
      slug(redirectForm.trigger_key || redirectForm.display_text);
    const displayText = redirectForm.display_text.trim();

    if (!key || !displayText) {
      setMessage("Enter display text and a valid trigger key.");
      return;
    }

    if (!Number.isSafeInteger(redirectForm.sort_order)) {
      setMessage("Display order must be a whole number.");
      return;
    }

    if (redirectRows.some(row =>
      row.id !== redirectForm.id && row.trigger_key === key
    )) {
      setMessage("This trigger key already exists. Use Edit beside the existing rule.");
      return;
    }

    const preview = previewRedirectRule();
    if (preview.error) {
      setMessage(preview.error);
      return;
    }

    if (redirectForm.target_business_identity_key) {
      const target = identities.find(row =>
        row.identity_key === redirectForm.target_business_identity_key
      );
      if (!target) {
        setMessage("The target identity no longer exists. Choose a valid identity or No preselection.");
        return;
      }

      if (redirectForm.is_active && redirectForm.redirect_after_selection &&
          (!target.is_active ||
           !(target.registration_scopes || []).includes("business_identity"))) {
        setMessage("An active redirect requires an active business-registration identity, or No preselection.");
        return;
      }
    }

    setBusy(true);
    try {
      const values = {
        display_text: displayText,
        description: redirectForm.description.trim() || null,
        target_registration_path: redirectForm.target_registration_path.trim(),
        redirect_after_selection: redirectForm.redirect_after_selection,
        business_reason: redirectForm.business_reason.trim() || null,
        target_business_identity_key: redirectForm.target_business_identity_key || null,
        sort_order: redirectForm.sort_order,
        is_active: redirectForm.is_active,
      };

      const request = editing
        ? supabase.from("registration_redirect_rules")
            .update(values).eq("id", redirectForm.id)
        : supabase.from("registration_redirect_rules")
            .insert({ ...values, trigger_key: key });

      const { data, error } = await request.select("id").single();
      if (error) throw error;
      if (!data) throw new Error("No saved rule returned. Refresh and check before retrying.");

      resetRedirectForm();
      setMessage(editing ? "Registration redirect rule updated." : "Registration redirect rule added.");

      try {
        await load();
      } catch {
        setMessage("Rule saved, but the list could not refresh. Reload before making another change.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message :
        (error as { message?: string })?.message || "Could not save the redirect rule.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(
    table:
      | "registration_legal_constitutions"
      | "registration_business_sectors"
      | "registration_redirect_rules",
    keyColumn: "key" | "id",
    keyValue: string | number,
    active: boolean
  ) {
    const { error } = await supabase
      .from(table)
      .update({ is_active: !active })
      .eq(keyColumn, keyValue);

    if (error) return setMessage(error.message);
    await load();
  }

  return (
    <section className="registrationMaster">
      <div className="masterHeader">
        <div>
          <div className="eyebrow">CRS-4 Constitutional Control</div>
          <h2>Constitutional Registration Master</h2>
          <p>
            Registration choices, ordering, eligibility and redirects
            are controlled here. Registration pages must consume this
            data rather than carry their own lists.
          </p>
        </div>
      </div>

      {message ? (
        <div className="masterMessage" role="status">
          {message}
        </div>
      ) : null}

      <div className="stats">
        <Stat label="Legal constitutions" value={legalRows.length} />
        <Stat label="Business sectors" value={sectorRows.length} />
        <Stat
          label="Business identities"
          value={activeBusinessIdentities.length}
        />
        <Stat
          label="Business personal roles"
          value={activePersonalRoles.length}
        />
        <Stat
          label="Individual skills"
          value={activeIndividualSkills.length}
        />
        <Stat label="Redirect rules" value={redirectRows.length} />
      </div>

      <details open>
        <summary>Legal Constitutions</summary>
        <p className="note">
          Manage the legal form of a business, not its trade or company name.
          Examples include Sole Proprietorship, Partnership Firm and Private
          Limited Company. Check the existing list before adding an entry.
        </p>
        <p><strong>
          {editingLegalKey ? "Editing an existing constitution" : "Add a legal constitution"}
        </strong></p>
        <form className="formGrid" onSubmit={saveLegal}>
          <label>
            Name *
            <input
              required
              value={legalForm.label}
              onChange={(e) =>
                setLegalForm({
                  ...legalForm,
                  label: e.target.value,

                })
              }
            />
          <small>Enter the legal form. Example: Sole Proprietorship. Do not enter a particular business or company name.</small></label>

          <label>
            Permanent key
            <input
              value={legalForm.key || slug(legalForm.label)}
              disabled={busy || Boolean(editingLegalKey)}
              onChange={(e) =>
                setLegalForm({
                  ...legalForm,
                  key: slug(e.target.value),
                })
              }
            />
          <small>Permanent system identifier. Example: sole_proprietorship. Suggested from the name until customised; locked when editing.</small></label>

          <label>
            Display order
            <input
              type="number"
              value={legalForm.sort_order}
              onChange={(e) =>
                setLegalForm({
                  ...legalForm,
                  sort_order: Number(e.target.value),
                })
              }
            />
          <small>Lower numbers appear first. Example: 100 appears before 200. Use whole numbers and leave gaps for future entries.</small></label>

          <label className="wide">
            Description
            <textarea rows={3} style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 6, padding: 10, border: "1px solid #cbd5e1", borderRadius: 9, font: "inherit" }}
              value={legalForm.description}
              onChange={(e) =>
                setLegalForm({
                  ...legalForm,
                  description: e.target.value,
                })
              }
            />
          <small>Explain this choice simply. Example for Sole Proprietorship: A business owned by one individual.</small></label>
          <div className="wide">
            <MasterDescriptionAi
              kind="legal_constitution"
              context={{ name: legalForm.label, key: legalForm.key }}
              currentValue={legalForm.description}
              disabled={busy}
              onApply={value => setLegalForm(current => ({ ...current, description: value }))}
            />
          </div>

          <label className="check" style={{ flexWrap: "wrap" }}>
            <input
              type="checkbox"
              checked={legalForm.is_active}
              onChange={(e) =>
                setLegalForm({
                  ...legalForm,
                  is_active: e.target.checked,
                })
              }
            />
            Active
          <small style={{ flexBasis: "100%" }}>Marks this catalogue entry as active. Review registration usage before deactivating an existing option. This does not delete the entry.</small></label>

          <button disabled={busy}>
            {busy ? "Saving…" : editingLegalKey ? "Save changes" : "Add constitution"}
          </button>
          {editingLegalKey && (
            <button type="button" className="secondary" disabled={busy}
              onClick={() => { resetLegalForm(); setMessage(""); }}>
              Cancel editing
            </button>
          )}
        </form>

        <div className="compactRows">
          {legalRows.map((row) => (
            <div key={row.key} className={!row.is_active ? "muted" : ""}>
              <span>
                <strong>{row.label}</strong>
                <small>
                  {row.key} · order {row.sort_order}
                </small>
              </span>
              <span className="inlineActions">
                <button
                  type="button"
                  className="secondary"
                  disabled={busy}
                  onClick={() => {
                    setEditingLegalKey(row.key);
                    setMessage("");
                    setLegalForm({
                      key: row.key,
                      label: row.label,
                      description: row.description || "",
                      sort_order: row.sort_order,
                      is_active: row.is_active,
                    });
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    void toggle(
                      "registration_legal_constitutions",
                      "key",
                      row.key,
                      row.is_active
                    )
                  }
                >
                  {row.is_active ? "Deactivate" : "Activate"}
                </button>
              </span>
            </div>
          ))}
        </div>
      </details>

      <details>
        <summary>Business Sectors</summary>
        <p className="note">
          Group businesses by their main activities. Sectors are separate from
          legal constitutions and work identities. Check the existing entries first.
        </p>
        <div className="masterMessage" role="status" aria-live="polite">
          <strong>{editingSectorKey ? "Edit business sector" : "AI sector assistant"}</strong>
          <div>{sectorAi.aiMessage}</div>
          {!editingSectorKey && (
            <button type="button" className="secondary" style={{ marginTop: 10 }}
              disabled={busy || sectorAi.aiBusy || sectorForm.title.trim().length < 3}
              onClick={sectorAi.regenerate}>
              {sectorAi.aiBusy ? "Preparing suggestions…" : "Retry AI / regenerate description"}
            </button>
          )}
        </div>
        {sectorDuplicates.length > 0 && (
          <p className="note">
            Possible existing sector: {sectorDuplicates.map(row => row.title).join(", ")}.
            Use Edit rather than adding a duplicate.
          </p>
        )}
        <form className="formGrid" onSubmit={saveSector}>
          <label>
            Sector title *
            <input
              required
              value={sectorForm.title}
              onChange={(e) => sectorAi.changeField("title", e.target.value)}
            />
          <small>Enter a broad business activity, such as Construction or Equipment Rental. Do not enter a company name or legal constitution.</small></label>

          <label>
            Permanent key
            <input
              value={sectorForm.key}
              disabled={Boolean(editingSectorKey) || busy}
              onChange={(e) => sectorAi.changeField("key", slug(e.target.value))}
            />
          <small>Permanent system identifier. Example: construction. AI can suggest it; existing keys remain locked while editing.</small></label>

          <label>
            Symbol
            <input
              value={sectorForm.symbol}
              onChange={(e) => sectorAi.changeField("symbol", e.target.value)}
            />
          <small>Optional display symbol, such as a suitable emoji. Leave blank if no symbol is needed.</small></label>

          <label>
            Display order
            <input
              type="number"
              value={sectorForm.sort_order}
              onChange={(e) =>
                setSectorForm({
                  ...sectorForm,
                  sort_order: Number(e.target.value),
                })
              }
            />
          <small>Lower numbers appear first. Example: 100 appears before 200. Use whole numbers and leave gaps for future entries.</small></label>

          <label className="wide">
            Description
            <textarea rows={3} style={{ width: "100%", marginTop: 6, padding: 10, border: "1px solid #cbd5e1", borderRadius: 9, font: "inherit" }}
              value={sectorForm.description}
              onChange={(e) => sectorAi.changeField("description", e.target.value)}
            />
          <small>Explain which activities belong in this sector. Review the AI draft and adjust the wording before saving.</small></label>
          <div className="wide">
            <MasterDescriptionAi
              kind="business_sector"
              context={{ name: sectorForm.title, key: sectorForm.key }}
              currentValue={sectorForm.description}
              disabled={busy || sectorAi.aiBusy}
              onApply={value => sectorAi.changeField("description", value)}
            />
          </div>

          <label className="check" style={{ flexWrap: "wrap" }}>
            <input
              type="checkbox"
              checked={sectorForm.is_active}
              onChange={(e) =>
                setSectorForm({
                  ...sectorForm,
                  is_active: e.target.checked,
                })
              }
            />
            Active
          <small style={{ flexBasis: "100%" }}>Marks this sector as active. Review its registration usage and identity mappings before deactivating it. This does not delete the sector.</small></label>

          <button disabled={busy || sectorAi.aiBusy}>
            {busy ? "Saving…" : editingSectorKey ? "Save changes" : "Add sector"}
          </button>
          {editingSectorKey && (
            <button type="button" className="secondary" disabled={busy}
              onClick={() => { resetSectorForm(); setMessage(""); }}>
              Cancel editing
            </button>
          )}
        </form>

        <div className="compactRows">
          {sectorRows.map((row) => (
            <div key={row.key} className={!row.is_active ? "muted" : ""}>
              <span>
                <strong>
                  {row.symbol ? `${row.symbol} ` : ""}
                  {row.title}
                </strong>
                <small>
                  {row.key} · order {row.sort_order}
                </small>
              </span>
              <span className="inlineActions">
                <button
                  type="button"
                  className="secondary"
                  disabled={busy || sectorAi.aiBusy}
                  onClick={() => {
                    setEditingSectorKey(row.key);
                    setMessage("");
                    setSectorForm({
                      key: row.key,
                      title: row.title,
                      description: row.description || "",
                      symbol: row.symbol || "",
                      sort_order: row.sort_order,
                      is_active: row.is_active,
                    });
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    void toggle(
                      "registration_business_sectors",
                      "key",
                      row.key,
                      row.is_active
                    )
                  }
                >
                  {row.is_active ? "Deactivate" : "Activate"}
                </button>
              </span>
            </div>
          ))}
        </div>
      </details>

      <details>
        <summary>Business Identity ↔ Sector Mapping</summary>
        <p className="note">
          Connect a work identity to a business sector and its marketplace activities.
          Example: Civil Contractor → Construction &amp; Infrastructure → Services.
          A work identity may belong to more than one sector; add a separate mapping
          for each appropriate sector.
        </p>
        <p className="note">
          Registration uses these mappings to show identity choices and combine
          marketplace activities. This form does not grant administrator permissions
          or 3BOS operating capabilities.
        </p>
        <p><strong>{editingMapping ? "Edit existing mapping" : "Add identity-to-sector mapping"}</strong></p>

        {!editingMapping && (
          <MappingAiAssistant
            identityKey={mappingForm.identity_key}
            sectorKey={mappingForm.sector_key}
            modulesValue={mappingForm.nature_modules}
            disabled={busy}
            onApply={draft => {
              const identity = identities.find(row =>
                row.identity_key === mappingForm.identity_key
              );
              const sector = sectorRows.find(row => row.key === draft.sector_key);

              if (!identity?.is_active ||
                  !(identity.registration_scopes || []).includes("business_identity") ||
                  !sector?.is_active ||
                  !draft.nature_modules.length ||
                  !draft.nature_modules.every(module => mappingModules.includes(module))) {
                setMessage("The suggested mapping is no longer valid. Refresh and review the master data.");
                return;
              }

              if (mappingRows.some(row =>
                row.identity_key === mappingForm.identity_key &&
                row.sector_key === draft.sector_key
              )) {
                setMessage("This mapping already exists. Use its Edit button.");
                return;
              }

              setMappingForm(current => ({
                ...current,
                sector_key: draft.sector_key,
                nature_modules: draft.nature_modules.join(", "),
              }));
              setMessage("AI suggestion applied to the form only. Review the sector and activities, then click Add mapping if correct.");
            }}
          />
        )}
        <form className="formGrid" onSubmit={saveMapping}>
          <label>
            Business identity *
            <select
              required
              value={mappingForm.identity_key}
              disabled={Boolean(editingMapping) || busy}
              onChange={(e) =>
                setMappingForm({
                  ...mappingForm,
                  identity_key: e.target.value,
                })
              }
            >
              <option value="">Choose identity</option>
              {identities.filter(identity =>
                activeBusinessIdentities.some(active => active.identity_key === identity.identity_key) ||
                identity.identity_key === editingMapping?.identity_key
              ).map((identity) => (
                <option
                  key={identity.identity_key}
                  value={identity.identity_key}
                >
                  {identity.label}
                </option>
              ))}
            </select>
          <small>Choose an active identity that is enabled for business registration. Example: Civil Contractor. Identity and sector are locked during editing.</small></label>

          <label>
            Sector *
            <select
              required
              value={mappingForm.sector_key}
              disabled={Boolean(editingMapping) || busy}
              onChange={(e) =>
                setMappingForm({
                  ...mappingForm,
                  sector_key: e.target.value,
                })
              }
            >
              <option value="">Choose sector</option>
              {sectorRows.filter(sector =>
                sector.is_active || sector.key === editingMapping?.sector_key
              ).map((sector) => (
                <option key={sector.key} value={sector.key}>
                  {sector.title}
                </option>
              ))}
            </select>
          <small>Choose the relevant existing sector. Example: Construction & Infrastructure. To connect this identity to another sector, add a separate mapping.</small></label>

          <fieldset style={{ gridColumn: "1 / -1", border: "1px solid #cbd5e1", borderRadius: 10, padding: 14 }}>
            <legend>Marketplace activities</legend>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
              {mappingModules.map(module => (
                <label key={module} className="check">
                  <input type="checkbox"
                    disabled={busy}
                    checked={csv(mappingForm.nature_modules).includes(module)}
                    onChange={event => changeMappingModule(module, event.target.checked)} />
                  {module === "blog" ? "Blog / publishing" :
                    module.charAt(0).toUpperCase() + module.slice(1)}
                </label>
              ))}
            </div>
            <p className="note" style={{ marginBottom: 0 }}>
              Select only relevant activities. Example: Civil Contractor → Services;
              Builder / Developer → Property and Services; Blogger → Blog / publishing.
              More than one activity may apply. The Property key is property.
            </p>
            {csv(mappingForm.nature_modules).filter(module => !mappingModules.includes(module)).map(module => (
              <label key={module} className="check" style={{ marginTop: 10 }}>
                <input type="checkbox" checked disabled={busy}
                  onChange={event => changeMappingModule(module, event.target.checked)} />
                Existing unrecognised value: {module}. Preserved unless you deliberately remove it.
              </label>
            ))}
          </fieldset>

          <label>
            Display order
            <input
              type="number"
              value={mappingForm.sort_order}
              onChange={(e) =>
                setMappingForm({
                  ...mappingForm,
                  sort_order: Number(e.target.value),
                })
              }
            />
          <small>Controls this mapping's order in sector-based registration choices. Lower numbers appear first; use whole numbers.</small></label>

          <label className="check" style={{ flexWrap: "wrap" }}>
            <input
              type="checkbox"
              checked={mappingForm.is_active}
              onChange={(e) =>
                setMappingForm({
                  ...mappingForm,
                  is_active: e.target.checked,
                })
              }
            />
            Active
          <small style={{ flexBasis: "100%" }}>Active mappings are loaded by registration. Deactivating removes this mapping from that active set; it does not delete existing member profiles.</small></label>

          <button disabled={busy}>
            {busy ? "Saving…" : editingMapping ? "Save changes" : "Add mapping"}
          </button>
          {editingMapping && (
            <button type="button" className="secondary" disabled={busy}
              onClick={() => { resetMappingForm(); setMessage(""); }}>
              Cancel editing
            </button>
          )}
        </form>

        <div className="compactRows">
          {mappingRows.map((row) => {
            const identity =
              identities.find(
                (item) => item.identity_key === row.identity_key
              )?.label || row.identity_key;

            const sector =
              sectorRows.find(
                (item) => item.key === row.sector_key
              )?.title || row.sector_key;

            return (
              <div
                key={`${row.identity_key}:${row.sector_key}`}
                className={!row.is_active ? "muted" : ""}
              >
                <span>
                  <strong>{identity}</strong>
                  <small>
                    {sector} · {row.nature_modules.join(", ") || "No modules"}
                    {" · "}order {row.sort_order}
                  </small>
                </span>
                <button
                  type="button"
                  className="secondary"
                  disabled={busy}
                  onClick={() => {
                    setEditingMapping({ ...row, nature_modules: [...(row.nature_modules || [])] });
                    setMessage("");
                    setMappingForm({
                      identity_key: row.identity_key,
                      sector_key: row.sector_key,
                      nature_modules: row.nature_modules.join(", "),
                      sort_order: row.sort_order,
                      is_active: row.is_active,
                    });
                  }}
                >
                  Edit
                </button>
              </div>
            );
          })}
        </div>
      </details>

      <details>
        <summary>Business Redirect Rules</summary>
        <p className="note">
          Use these rules when an activity belongs in Business Registration
          rather than the individual-professional journey.
          Example: Supplies workers → Business Registration → Labour Contractor.
        </p>
        <p><strong>{redirectForm.id !== null ? "Edit redirect rule" : "Add redirect rule"}</strong></p>

        <div className="searchRow">
          <input
            placeholder="Search trigger, text or business reason"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span>{visibleRedirects.length} rules</span>
        </div>

        <form className="formGrid" onSubmit={saveRedirect}>
          <label>
            Display text *
            <input
              required
              value={redirectForm.display_text}
              onChange={(e) =>
                setRedirectForm({
                  ...redirectForm,
                  display_text: e.target.value,

                })
              }
            />
          <small>Short choice shown to the user. Example: Supplies workers. Describe the activity clearly.</small></label>

          <label>
            Trigger key *
            <input
              required
              value={redirectForm.trigger_key || slug(redirectForm.display_text)}
              disabled={redirectForm.id !== null || busy}
              onChange={(e) =>
                setRedirectForm({
                  ...redirectForm,
                  trigger_key: slug(e.target.value),
                })
              }
            />
          <small>Permanent identifier. Example: supplies_workers. Suggested from the display text until customised; locked when editing.</small></label>

          <label>
            Target registration path *
            <input
              required
              value={redirectForm.target_registration_path}
              onChange={(e) =>
                setRedirectForm({
                  ...redirectForm,
                  target_registration_path: e.target.value,
                })
              }
            />
          <small>Supported destination: /onboarding/business?registration=1. Do not paste a full website URL or add identity parameters here.</small></label>

          <label>
            Target business identity
            <select
              value={redirectForm.target_business_identity_key}
              onChange={(e) =>
                setRedirectForm({
                  ...redirectForm,
                  target_business_identity_key: e.target.value,
                })
              }
            >
              <option value="">No preselection</option>
              {identities.filter(identity =>
                activeBusinessIdentities.some(active => active.identity_key === identity.identity_key) ||
                identity.identity_key === redirectForm.target_business_identity_key
              ).map((identity) => (
                <option
                  key={identity.identity_key}
                  value={identity.identity_key}
                >
                  {identity.label}
                </option>
              ))}
            </select>
          <small>Optional identity to preselect in Business Registration. Example: Labour Contractor. Choose No preselection when the user should choose.</small></label>

          <label className="wide">
            User-facing description
            <textarea
              value={redirectForm.description}
              onChange={(e) =>
                setRedirectForm({
                  ...redirectForm,
                  description: e.target.value,
                })
              }
            />
          <small>Explain the choice to the user. Example: Choose this if you regularly supply or deploy workers or organised work teams.</small></label>
          <div className="wide">
            <MasterDescriptionAi
              kind="redirect_rule"
              context={{ name: redirectForm.display_text, key: redirectForm.trigger_key, targetIdentity: redirectForm.target_business_identity_key }}
              currentValue={redirectForm.description}
              disabled={busy}
              onApply={value => setRedirectForm(current => ({ ...current, description: value }))}
            />
          </div>

          <label className="wide">
            Constitutional / business reason
            <textarea
              value={redirectForm.business_reason}
              onChange={(e) =>
                setRedirectForm({
                  ...redirectForm,
                  business_reason: e.target.value,
                })
              }
            />
          <small>Explain why the business pathway applies. This reason is stored in the user's registration metadata; do not put confidential internal notes here.</small></label>

          <label>
            Display order
            <input
              type="number"
              value={redirectForm.sort_order}
              onChange={(e) =>
                setRedirectForm({
                  ...redirectForm,
                  sort_order: Number(e.target.value),
                })
              }
            />
          <small>Lower numbers appear first. Example: 10 appears before 20. Use whole numbers and leave gaps for later rules.</small></label>

          <label className="check" style={{ flexWrap: "wrap" }}>
            <input
              type="checkbox"
              checked={redirectForm.redirect_after_selection}
              onChange={(e) =>
                setRedirectForm({
                  ...redirectForm,
                  redirect_after_selection: e.target.checked,
                })
              }
            />
            Redirect immediately
          <small style={{ flexBasis: "100%" }}>When checked, selection saves available progress and opens Business Registration. When unchecked, this handler returns without saving progress or redirecting; it does not schedule a later redirect.</small></label>

          <label className="check" style={{ flexWrap: "wrap" }}>
            <input
              type="checkbox"
              checked={redirectForm.is_active}
              onChange={(e) =>
                setRedirectForm({
                  ...redirectForm,
                  is_active: e.target.checked,
                })
              }
            />
            Active
          <small style={{ flexBasis: "100%" }}>Active rules are loaded by registration. An inactive rule is excluded from that active list. Deactivation does not delete the rule.</small></label>

          <div className="wide" style={{ padding: 14, border: "1px solid #93c5fd", borderRadius: 10, background: "#eff6ff" }}>
            <strong>Rule preview</strong>
            <p style={{ margin: "6px 0" }}>
              User choice: {redirectForm.display_text.trim() || "Enter display text above"}.
            </p>
            <p style={{ margin: "6px 0" }}>
              {!redirectForm.is_active
                ? "Inactive: this rule is excluded from the active registration rules."
                : redirectForm.redirect_after_selection
                  ? "Active: selecting this choice saves available progress and opens Business Registration."
                  : "Active but redirect disabled: selecting this choice performs no redirect in the current handler."}
            </p>
            {previewRedirectRule().error
              ? <p style={{ color: "#b91c1c" }}>{previewRedirectRule().error}</p>
              : <code style={{ display: "block", overflowWrap: "anywhere" }}>{previewRedirectRule().target}</code>}
            <small>Preview only. It does not navigate, save progress or create a rule.</small>
          </div>
          <button disabled={busy}>
            {busy ? "Saving…" : redirectForm.id !== null ? "Save rule changes" : "Add redirect rule"}
          </button>
          {redirectForm.id !== null && (
            <button type="button" className="secondary" disabled={busy}
              onClick={() => { resetRedirectForm(); setMessage(""); }}>
              Cancel editing
            </button>
          )}
        </form>

        <div className="compactRows">
          {visibleRedirects.map((row) => (
            <div key={row.id} className={!row.is_active ? "muted" : ""}>
              <span>
                <strong>{row.display_text}</strong>
                <small>
                  {row.trigger_key} → {row.target_registration_path}
                  {row.target_business_identity_key
                    ? ` → ${row.target_business_identity_key}`
                    : ""}
                </small>
                {row.business_reason ? <p>{row.business_reason}</p> : null}
              </span>

              <span className="inlineActions">
                <button
                  type="button"
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    setRedirectForm({
                      id: row.id,
                      trigger_key: row.trigger_key,
                      display_text: row.display_text,
                      description: row.description || "",
                      target_registration_path:
                        row.target_registration_path,
                      redirect_after_selection:
                        row.redirect_after_selection,
                      business_reason: row.business_reason || "",
                      target_business_identity_key:
                        row.target_business_identity_key || "",
                      sort_order: row.sort_order,
                      is_active: row.is_active,
                    })
                  }
                >
                  Edit
                </button>

                <button
                  type="button"
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    void toggle(
                      "registration_redirect_rules",
                      "id",
                      row.id,
                      row.is_active
                    )
                  }
                >
                  {row.is_active ? "Deactivate" : "Activate"}
                </button>
              </span>
            </div>
          ))}
        </div>
      </details>

      <details>
        <summary>Registration Preview & Usage</summary>

        <div className="previewGrid">
          <Preview
            title="Business identities"
            rows={activeBusinessIdentities.map((x) => x.label)}
          />
          <Preview
            title="Business personal roles"
            rows={activePersonalRoles.map((x) => x.label)}
          />
          <Preview
            title="Individual skilled professionals"
            rows={activeIndividualSkills.map((x) => x.label)}
          />
          <Preview
            title="Active redirect rules"
            rows={redirectRows
              .filter((x) => x.is_active)
              .map((x) => x.display_text)}
          />
        </div>
      </details>

      <style jsx>{`
        .registrationMaster {
          background: #fff;
          border: 1px solid #dbe4ee;
          border-radius: 18px;
          padding: 18px;
          margin-bottom: 24px;
        }
        .masterHeader h2 {
          margin: 4px 0 6px;
        }
        .masterHeader p {
          color: #64748b;
          max-width: 900px;
          margin: 0;
        }
        .eyebrow {
          font-size: 12px;
          font-weight: 900;
          color: #2563eb;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .masterMessage {
          padding: 12px;
          margin: 14px 0;
          border-radius: 10px;
          background: #eff6ff;
          border: 1px solid #93c5fd;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 10px;
          margin: 16px 0;
        }
        details {
          border-top: 1px solid #e2e8f0;
          padding: 14px 0;
        }
        summary {
          cursor: pointer;
          font-weight: 900;
          font-size: 16px;
        }
        .formGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
          margin-top: 14px;
          padding: 14px;
          background: #f8fafc;
          border-radius: 12px;
        }
        label {
          font-size: 13px;
          font-weight: 800;
        }
        input,
        select,
        textarea {
          width: 100%;
          display: block;
          margin-top: 6px;
          border: 1px solid #cbd5e1;
          border-radius: 9px;
          padding: 10px;
          background: white;
        }
        textarea {
          min-height: 76px;
        }
        .wide {
          grid-column: 1 / -1;
        }
        .check {
          display: flex;
          align-items: center;
          gap: 7px;
        }
        .check input {
          width: auto;
          margin: 0;
        }
        button {
          border: 0;
          border-radius: 9px;
          padding: 10px 14px;
          background: #2563eb;
          color: white;
          font-weight: 800;
          cursor: pointer;
        }
        .secondary {
          color: #334155;
          background: white;
          border: 1px solid #cbd5e1;
        }
        .compactRows {
          display: grid;
          gap: 8px;
          margin-top: 12px;
        }
        .compactRows > div {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          border: 1px solid #e2e8f0;
          border-radius: 11px;
          padding: 12px;
        }
        .compactRows strong,
        .compactRows small {
          display: block;
        }
        .compactRows small {
          color: #64748b;
          margin-top: 3px;
        }
        .compactRows p {
          color: #475569;
          margin: 5px 0 0;
          font-size: 13px;
        }
        .inlineActions {
          display: flex;
          align-items: center;
          gap: 7px;
          flex-shrink: 0;
        }
        .muted {
          opacity: 0.55;
          background: #f8fafc;
        }
        .searchRow {
          display: flex;
          gap: 10px;
          align-items: center;
          margin-top: 12px;
        }
        .searchRow input {
          flex: 1;
          margin: 0;
        }
        .previewGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
          gap: 12px;
          margin-top: 14px;
        }
        @media (max-width: 640px) {
          .compactRows > div {
            display: block;
          }
          .inlineActions {
            margin-top: 10px;
          }
        }
      `}</style>
    </section>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: 12,
      }}
    >
      <strong style={{ display: "block", fontSize: 22 }}>{value}</strong>
      <span style={{ color: "#64748b", fontSize: 12 }}>{label}</span>
    </div>
  );
}

function Preview({
  title,
  rows,
}: {
  title: string;
  rows: string[];
}) {
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: 12,
      }}
    >
      <strong>{title}</strong>
      <div style={{ marginTop: 8, display: "grid", gap: 4 }}>
        {rows.length ? (
          rows.slice(0, 12).map((row) => (
            <small key={row} style={{ color: "#475569" }}>
              {row}
            </small>
          ))
        ) : (
          <small style={{ color: "#94a3b8" }}>No active entries</small>
        )}

        {rows.length > 12 ? (
          <small style={{ color: "#64748b", fontWeight: 800 }}>
            +{rows.length - 12} more
          </small>
        ) : null}
      </div>
    </div>
  );
}
