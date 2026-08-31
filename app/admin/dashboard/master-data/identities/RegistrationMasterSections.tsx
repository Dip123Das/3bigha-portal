"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

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

  const [sectorForm, setSectorForm] = useState({
    key: "",
    title: "",
    description: "",
    symbol: "",
    sort_order: 1000,
    is_active: true,
  });

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

  async function saveSector(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const payload = {
      ...sectorForm,
      key: slug(sectorForm.key || sectorForm.title),
      title: sectorForm.title.trim(),
      description: sectorForm.description.trim() || null,
      symbol: sectorForm.symbol.trim() || null,
    };

    const { error } = await supabase
      .from("registration_business_sectors")
      .upsert(payload, { onConflict: "key" });

    setBusy(false);
    if (error) return setMessage(error.message);

    setSectorForm({
      key: "",
      title: "",
      description: "",
      symbol: "",
      sort_order: 1000,
      is_active: true,
    });
    setMessage("Business sector saved.");
    await load();
  }

  async function saveMapping(event: React.FormEvent) {
    event.preventDefault();

    if (!mappingForm.identity_key || !mappingForm.sector_key) {
      setMessage("Choose both an identity and a business sector.");
      return;
    }

    setBusy(true);
    setMessage("");

    const { error } = await supabase
      .from("registration_identity_sector_map")
      .upsert(
        {
          identity_key: mappingForm.identity_key,
          sector_key: mappingForm.sector_key,
          nature_modules: csv(mappingForm.nature_modules),
          sort_order: mappingForm.sort_order,
          is_active: mappingForm.is_active,
        },
        { onConflict: "identity_key,sector_key" }
      );

    setBusy(false);
    if (error) return setMessage(error.message);

    setMappingForm({
      identity_key: "",
      sector_key: "",
      nature_modules: "",
      sort_order: 1000,
      is_active: true,
    });
    setMessage("Identity-to-sector mapping saved.");
    await load();
  }

  async function saveRedirect(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const payload = {
      trigger_key: slug(
        redirectForm.trigger_key || redirectForm.display_text
      ),
      display_text: redirectForm.display_text.trim(),
      description: redirectForm.description.trim() || null,
      target_registration_path:
        redirectForm.target_registration_path.trim(),
      redirect_after_selection:
        redirectForm.redirect_after_selection,
      business_reason:
        redirectForm.business_reason.trim() || null,
      target_business_identity_key:
        redirectForm.target_business_identity_key || null,
      sort_order: redirectForm.sort_order,
      is_active: redirectForm.is_active,
    };

    const request = redirectForm.id
      ? supabase
          .from("registration_redirect_rules")
          .update(payload)
          .eq("id", redirectForm.id)
      : supabase
          .from("registration_redirect_rules")
          .insert(payload);

    const { error } = await request;

    setBusy(false);
    if (error) return setMessage(error.message);

    setRedirectForm({
      id: null,
      trigger_key: "",
      display_text: "",
      description: "",
      target_registration_path:
        "/onboarding/business?registration=1",
      redirect_after_selection: true,
      business_reason: "",
      target_business_identity_key: "",
      sort_order: 1000,
      is_active: true,
    });

    setMessage("Registration redirect rule saved.");
    await load();
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
            <input
              value={legalForm.description}
              onChange={(e) =>
                setLegalForm({
                  ...legalForm,
                  description: e.target.value,
                })
              }
            />
          <small>Explain this choice simply. Example for Sole Proprietorship: A business owned by one individual.</small></label>

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
        <form className="formGrid" onSubmit={saveSector}>
          <label>
            Sector title *
            <input
              required
              value={sectorForm.title}
              onChange={(e) =>
                setSectorForm({
                  ...sectorForm,
                  title: e.target.value,
                  key:
                    sectorForm.key ||
                    slug(e.target.value),
                })
              }
            />
          </label>

          <label>
            Permanent key
            <input
              value={sectorForm.key}
              onChange={(e) =>
                setSectorForm({
                  ...sectorForm,
                  key: slug(e.target.value),
                })
              }
            />
          </label>

          <label>
            Symbol
            <input
              value={sectorForm.symbol}
              onChange={(e) =>
                setSectorForm({
                  ...sectorForm,
                  symbol: e.target.value,
                })
              }
            />
          </label>

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
          </label>

          <label className="wide">
            Description
            <input
              value={sectorForm.description}
              onChange={(e) =>
                setSectorForm({
                  ...sectorForm,
                  description: e.target.value,
                })
              }
            />
          </label>

          <label className="check">
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
          </label>

          <button disabled={busy}>Save sector</button>
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
                  onClick={() =>
                    setSectorForm({
                      key: row.key,
                      title: row.title,
                      description: row.description || "",
                      symbol: row.symbol || "",
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

        <form className="formGrid" onSubmit={saveMapping}>
          <label>
            Business identity *
            <select
              required
              value={mappingForm.identity_key}
              onChange={(e) =>
                setMappingForm({
                  ...mappingForm,
                  identity_key: e.target.value,
                })
              }
            >
              <option value="">Choose identity</option>
              {activeBusinessIdentities.map((identity) => (
                <option
                  key={identity.identity_key}
                  value={identity.identity_key}
                >
                  {identity.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Sector *
            <select
              required
              value={mappingForm.sector_key}
              onChange={(e) =>
                setMappingForm({
                  ...mappingForm,
                  sector_key: e.target.value,
                })
              }
            >
              <option value="">Choose sector</option>
              {sectorRows.map((sector) => (
                <option key={sector.key} value={sector.key}>
                  {sector.title}
                </option>
              ))}
            </select>
          </label>

          <label>
            Marketplace modules
            <input
              placeholder="materials, services, rentals, property"
              value={mappingForm.nature_modules}
              onChange={(e) =>
                setMappingForm({
                  ...mappingForm,
                  nature_modules: e.target.value,
                })
              }
            />
          </label>

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
          </label>

          <label className="check">
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
          </label>

          <button disabled={busy}>Save mapping</button>
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
                  onClick={() =>
                    setMappingForm({
                      identity_key: row.identity_key,
                      sector_key: row.sector_key,
                      nature_modules: row.nature_modules.join(", "),
                      sort_order: row.sort_order,
                      is_active: row.is_active,
                    })
                  }
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
                  trigger_key:
                    redirectForm.trigger_key ||
                    slug(e.target.value),
                })
              }
            />
          </label>

          <label>
            Trigger key *
            <input
              required
              value={redirectForm.trigger_key}
              onChange={(e) =>
                setRedirectForm({
                  ...redirectForm,
                  trigger_key: slug(e.target.value),
                })
              }
            />
          </label>

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
          </label>

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
              {activeBusinessIdentities.map((identity) => (
                <option
                  key={identity.identity_key}
                  value={identity.identity_key}
                >
                  {identity.label}
                </option>
              ))}
            </select>
          </label>

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
          </label>

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
          </label>

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
          </label>

          <label className="check">
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
          </label>

          <label className="check">
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
          </label>

          <button disabled={busy}>
            {redirectForm.id ? "Save rule changes" : "Add redirect rule"}
          </button>
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
