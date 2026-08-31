"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import MasterDescriptionAi from "./MasterDataAssistants";

type IdentityOption = {
  id: string;
  identity_key: string;
  label: string;
  registration_scopes?: string[];
  is_active: boolean;
};

type CapabilityRow = {
  capability_key: string;
  label: string;
  capability_group: string;
  description: string | null;
  default_path: string | null;
  sort_order: number;
  is_active: boolean;
};

type CapabilityMappingRow = {
  identity_key: string;
  capability_key: string;
  sort_order: number;
  is_active: boolean;
};

const slug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export default function OperatingCapabilityMasterSections({
  identities,
}: {
  identities: IdentityOption[];
}) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [capabilities, setCapabilities] = useState<CapabilityRow[]>([]);
  const [mappings, setMappings] = useState<CapabilityMappingRow[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const [editingCapabilityKey, setEditingCapabilityKey] =
    useState<string | null>(null);
  const [editingMapping, setEditingMapping] =
    useState<CapabilityMappingRow | null>(null);

  const [capabilityForm, setCapabilityForm] = useState({
    capability_key: "",
    label: "",
    capability_group: "commerce",
    description: "",
    default_path: "",
    sort_order: 1000,
    is_active: true,
  });

  const [mappingForm, setMappingForm] = useState({
    identity_key: "",
    capability_key: "",
    sort_order: 1000,
    is_active: true,
  });

  const load = useCallback(async () => {
    const [capabilityResult, mappingResult] = await Promise.all([
      supabase
        .from("bos_operating_capabilities")
        .select("*")
        .order("capability_group")
        .order("sort_order")
        .order("label"),
      supabase
        .from("identity_bos_operating_capabilities")
        .select("*")
        .order("identity_key")
        .order("sort_order"),
    ]);

    const firstError = capabilityResult.error || mappingResult.error;
    if (firstError) throw firstError;

    setCapabilities((capabilityResult.data || []) as CapabilityRow[]);
    setMappings((mappingResult.data || []) as CapabilityMappingRow[]);
  }, [supabase]);

  useEffect(() => {
    load().catch((error) =>
      setMessage(
        error?.message ||
          "Could not load 3BOS Operating Capability Master."
      )
    );
  }, [load]);

  function resetCapabilityForm() {
    setEditingCapabilityKey(null);
    setCapabilityForm({
      capability_key: "",
      label: "",
      capability_group: "commerce",
      description: "",
      default_path: "",
      sort_order: 1000,
      is_active: true,
    });
  }

  function resetMappingForm() {
    setEditingMapping(null);
    setMappingForm({
      identity_key: "",
      capability_key: "",
      sort_order: 1000,
      is_active: true,
    });
  }

  function validateProductionPath(value: string) {
    const path = value.trim();
    if (!path) return "";

    try {
      if (!path.startsWith("/") || path.startsWith("//") ||
          /[\\\\\\s]/.test(path)) {
        return "Use an internal relative route beginning with / and containing no spaces or backslashes.";
      }

      const target = new URL(path, "https://3bigha.invalid");
      if (target.origin !== "https://3bigha.invalid" || target.hash) {
        return "Use an internal 3Bigha route without a domain or fragment.";
      }
      if (!target.pathname.startsWith("/dashboard/") &&
          !target.pathname.startsWith("/vendor/")) {
        return "Capability routes must currently begin with /dashboard/ or /vendor/. Leave blank if no production page exists.";
      }
      return "";
    } catch {
      return "Enter a valid internal route or leave it blank.";
    }
  }

  async function saveCapability(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setMessage("");

    const label = capabilityForm.label.trim();
    const key = editingCapabilityKey ||
      slug(capabilityForm.capability_key || label);
    const group = slug(capabilityForm.capability_group);
    const path = capabilityForm.default_path.trim();

    if (!label || !key || !group) {
      setMessage("Enter a capability name, permanent key and capability group.");
      return;
    }
    if (!Number.isSafeInteger(capabilityForm.sort_order)) {
      setMessage("Display order must be a whole number.");
      return;
    }

    const duplicate = capabilities.find(row =>
      row.capability_key !== editingCapabilityKey &&
      (row.capability_key === key ||
       row.label.trim().toLowerCase() === label.toLowerCase())
    );
    if (duplicate) {
      setMessage("A capability with this name or permanent key already exists. Use its Edit button.");
      return;
    }

    const pathError = validateProductionPath(path);
    if (pathError) {
      setMessage(pathError);
      return;
    }

    const original = editingCapabilityKey
      ? capabilities.find(row => row.capability_key === editingCapabilityKey)
      : null;

    if (editingCapabilityKey && !original) {
      setMessage("The original capability is unavailable. Refresh before saving.");
      return;
    }

    if (path && path !== (original?.default_path || "") &&
        !window.confirm(
          "Have you verified that this exact production route exists and is accessible to the intended vendor? Choose Cancel if it has not been verified."
        )) return;

    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Your session has expired. Sign in again.");

      const values = {
        label,
        capability_group: group,
        description: capabilityForm.description.trim() || null,
        default_path: path || null,
        sort_order: capabilityForm.sort_order,
        is_active: capabilityForm.is_active,
        updated_at: new Date().toISOString(),
        updated_by: auth.user.id,
      };

      const request = editingCapabilityKey
        ? supabase.from("bos_operating_capabilities")
            .update(values).eq("capability_key", editingCapabilityKey)
        : supabase.from("bos_operating_capabilities")
            .insert({
              capability_key: key,
              ...values,
              created_by: auth.user.id,
            });

      const { data, error } = await request.select("capability_key").single();
      if (error) throw error;
      if (!data) throw new Error("No saved capability returned. Refresh before retrying.");

      const wasEditing = Boolean(editingCapabilityKey);
      resetCapabilityForm();
      setMessage(wasEditing ? "Operating capability updated." : "Operating capability added.");

      try {
        await load();
      } catch {
        setMessage("Capability saved, but the list could not refresh. Reload before making another change.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message :
        (error as { message?: string })?.message || "Could not save the capability.");
    } finally {
      setBusy(false);
    }
  }

  async function saveMapping(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setMessage("");

    const identityKey = editingMapping?.identity_key ||
      mappingForm.identity_key;
    const capabilityKey = editingMapping?.capability_key ||
      mappingForm.capability_key;

    if (!identityKey || !capabilityKey) {
      setMessage("Choose both an identity and a 3BOS capability.");
      return;
    }
    if (!Number.isSafeInteger(mappingForm.sort_order)) {
      setMessage("Display order must be a whole number.");
      return;
    }

    const identity = identities.find(row => row.identity_key === identityKey);
    const capability = capabilities.find(row =>
      row.capability_key === capabilityKey
    );

    if (!identity || !capability) {
      setMessage("The selected identity or capability is unavailable. Refresh before saving.");
      return;
    }

    if (mappingForm.is_active && (!identity.is_active || !capability.is_active)) {
      setMessage("An active mapping requires both an active identity and an active capability.");
      return;
    }

    if (!editingMapping && mappings.some(row =>
      row.identity_key === identityKey &&
      row.capability_key === capabilityKey
    )) {
      setMessage("This capability mapping already exists. Use its Edit button.");
      return;
    }

    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Your session has expired. Sign in again.");

      const values = {
        sort_order: mappingForm.sort_order,
        is_active: mappingForm.is_active,
        updated_at: new Date().toISOString(),
        updated_by: auth.user.id,
      };

      const request = editingMapping
        ? supabase.from("identity_bos_operating_capabilities")
            .update(values)
            .eq("identity_key", editingMapping.identity_key)
            .eq("capability_key", editingMapping.capability_key)
        : supabase.from("identity_bos_operating_capabilities")
            .insert({
              identity_key: identityKey,
              capability_key: capabilityKey,
              ...values,
              created_by: auth.user.id,
            });

      const { data, error } = await request
        .select("identity_key,capability_key").single();

      if (error) throw error;
      if (!data) throw new Error("No saved mapping returned. Refresh before retrying.");

      const wasEditing = Boolean(editingMapping);
      resetMappingForm();
      setMessage(wasEditing ? "Capability mapping updated." : "Capability mapping added.");

      try {
        await load();
      } catch {
        setMessage("Mapping saved, but the list could not refresh. Reload before making another change.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message :
        (error as { message?: string })?.message || "Could not save the capability mapping.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleCapability(row: CapabilityRow) {
    const { error } = await supabase
      .from("bos_operating_capabilities")
      .update({
        is_active: !row.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("capability_key", row.capability_key);

    if (error) return setMessage(error.message);
    await load();
  }

  async function toggleMapping(row: CapabilityMappingRow) {
    const { error } = await supabase
      .from("identity_bos_operating_capabilities")
      .update({
        is_active: !row.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("identity_key", row.identity_key)
      .eq("capability_key", row.capability_key);

    if (error) return setMessage(error.message);
    await load();
  }

  const activeBusinessIdentities = identities.filter(
    (identity) =>
      identity.is_active &&
      (identity.registration_scopes || []).includes("business_identity")
  );

  const identityLabel = (key: string) =>
    identities.find((identity) => identity.identity_key === key)?.label || key;

  const capabilityLabel = (key: string) =>
    capabilities.find((capability) => capability.capability_key === key)?.label ||
    key;

  const groupedMappings = identities
    .map((identity) => ({
      identity,
      mappings: mappings.filter(
        (mapping) => mapping.identity_key === identity.identity_key
      ),
    }))
    .filter((group) => group.mappings.length > 0);

  return (
    <section className="operatingMaster">
      <div className="masterHeader">
        <div>
          <div className="eyebrow">BOS-OC1 Constitutional Control</div>
          <h2>3BOS Operating Capability Master</h2>
          <p>
            Identity Master defines who the business is. This section defines
            which internal 3BOS operating tools that canonical identity may use.
            New identities receive no operating capability until Master Admin
            maps them here.
          </p>
        </div>
      </div>

      {message ? (
        <div className="masterMessage" role="status">
          {message}
        </div>
      ) : null}

      <div className="stats">
        <Stat label="Capabilities" value={capabilities.length} />
        <Stat
          label="Active capabilities"
          value={capabilities.filter((row) => row.is_active).length}
        />
        <Stat label="Identity mappings" value={mappings.length} />
        <Stat
          label="Mapped identities"
          value={groupedMappings.length}
        />
      </div>

      <details open>
        <summary>Operating Capabilities</summary>
        <p className="note">
          Define an internal 3BOS tool once, then map it explicitly to appropriate
          business identities. Example: Inventory belongs to the commerce group.
          Creating a capability does not grant it to any identity.
        </p>
        <p><strong>{editingCapabilityKey ? "Edit operating capability" : "Add operating capability"}</strong></p>
        <form className="formGrid" onSubmit={saveCapability}>
          <label>
            Capability name *
            <input
              required
              value={capabilityForm.label}
              onChange={(e) =>
                setCapabilityForm({
                  ...capabilityForm,
                  label: e.target.value,

                })
              }
            />
          <small>Name the internal tool in plain language. Example: Inventory or Project Costing.</small></label>

          <label>
            Permanent key
            <input
              value={capabilityForm.capability_key || slug(capabilityForm.label)}
              disabled={Boolean(editingCapabilityKey) || busy}
              onChange={(e) =>
                setCapabilityForm({
                  ...capabilityForm,
                  capability_key: slug(e.target.value),
                })
              }
            />
          <small>Permanent system identifier. Example: inventory_operations. Suggested from the name and locked during editing.</small></label>

          <label>
            Capability group *
            <input
              required
              list="capability-group-suggestions"
              value={capabilityForm.capability_group}
              onChange={(e) =>
                setCapabilityForm({
                  ...capabilityForm,
                  capability_group: e.target.value,
                })
              }
              placeholder="commerce, production, project"
            />
            <datalist id="capability-group-suggestions">
              <option value="commerce" />
              <option value="production" />
              <option value="project" />
            </datalist>
          <small>Groups related tools in the runtime projection. Existing examples: commerce, production and project. Use a stable lowercase group.</small></label>

          <label>
            Display order
            <input
              type="number"
              value={capabilityForm.sort_order}
              onChange={(e) =>
                setCapabilityForm({
                  ...capabilityForm,
                  sort_order: Number(e.target.value),
                })
              }
            />
          <small>Lower numbers appear first within runtime projections and admin lists. Use whole numbers and leave gaps.</small></label>

          <label className="wide">
            Plain-language description
            <textarea rows={3} style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 6, padding: 10, border: "1px solid #cbd5e1", borderRadius: 9, font: "inherit" }}
              value={capabilityForm.description}
              onChange={(e) =>
                setCapabilityForm({
                  ...capabilityForm,
                  description: e.target.value,
                })
              }
            />
          <small>Explain what the internal tool enables. Use the AI assistant below for a reviewable draft.</small></label>
          <div className="wide">
            <MasterDescriptionAi
              kind="operating_capability"
              context={{ name: capabilityForm.label, key: capabilityForm.capability_key, group: capabilityForm.capability_group }}
              currentValue={capabilityForm.description}
              disabled={busy}
              onApply={value => setCapabilityForm(current => ({ ...current, description: value }))}
            />
          </div>

          <label className="wide">
            Existing production route
            <input
              value={capabilityForm.default_path}
              onChange={(e) =>
                setCapabilityForm({
                  ...capabilityForm,
                  default_path: e.target.value,
                })
              }
              placeholder="/dashboard/vendor/inventory"
            />
            <small>
              Leave blank until a real production page exists. This prevents
              dead navigation.
            </small>
          <small>Optional verified production route opened for this capability. Leave blank until the exact live page exists.</small></label>

          <label className="check" style={{ flexWrap: "wrap" }}>
            <input
              type="checkbox"
              checked={capabilityForm.is_active}
              onChange={(e) =>
                setCapabilityForm({
                  ...capabilityForm,
                  is_active: e.target.checked,
                })
              }
            />
            Active
          <small style={{ flexBasis: "100%" }}>Only active capabilities can appear in the runtime projection. Deactivation also makes active mappings ineffective without deleting them.</small></label>

          <button disabled={busy}>
            {busy ? "Saving…" : editingCapabilityKey ? "Save changes" : "Add capability"}
          </button>
          {editingCapabilityKey && (
            <button type="button" className="secondary" disabled={busy}
              onClick={() => { resetCapabilityForm(); setMessage(""); }}>
              Cancel editing
            </button>
          )}
        </form>

        <div className="compactRows">
          {capabilities.map((row) => (
            <div
              key={row.capability_key}
              className={!row.is_active ? "muted" : ""}
            >
              <span>
                <strong>{row.label}</strong>
                <small>
                  {row.capability_key} · {row.capability_group} · order{" "}
                  {row.sort_order}
                  {row.default_path ? ` · ${row.default_path}` : ""}
                </small>
              </span>
              <span className="inlineActions">
                <button
                  type="button"
                  className="secondary"
                  disabled={busy}
                  onClick={() => {
                    setEditingCapabilityKey(row.capability_key);
                    setMessage("");
                    setCapabilityForm({
                      capability_key: row.capability_key,
                      label: row.label,
                      capability_group: row.capability_group,
                      description: row.description || "",
                      default_path: row.default_path || "",
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
                  onClick={() => void toggleCapability(row)}
                >
                  {row.is_active ? "Deactivate" : "Activate"}
                </button>
              </span>
            </div>
          ))}
        </div>
      </details>

      <details open>
        <summary>Identity → 3BOS Operating Capabilities</summary>
        <p className="note">
          Map capabilities explicitly. Do not infer them from identity spelling,
          family or marketplace modules. Example: Manufacturer → Inventory,
          Product Costing, Bill of Materials and Production Operations.
          Each mapping is an auditable operating-tool decision.
        </p>
        <p><strong>{editingMapping ? "Edit capability mapping" : "Add capability mapping"}</strong></p>

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
          <small>Choose the business identity that should receive the internal tool. The identity is locked during editing.</small></label>

          <label>
            3BOS capability *
            <select
              required
              value={mappingForm.capability_key}
              disabled={Boolean(editingMapping) || busy}
              onChange={(e) =>
                setMappingForm({
                  ...mappingForm,
                  capability_key: e.target.value,
                })
              }
            >
              <option value="">Choose capability</option>
              {capabilities
                .filter((row) =>
                  row.is_active ||
                  row.capability_key === editingMapping?.capability_key
                )
                .map((row) => (
                  <option
                    key={row.capability_key}
                    value={row.capability_key}
                  >
                    {row.label}
                  </option>
                ))}
            </select>
          <small>Choose one active operating capability. Add a separate mapping for every additional tool.</small></label>

          <label>
            Order
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
          <small>Controls this identity's capability order in the runtime projection. Lower whole numbers appear first.</small></label>

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
          <small style={{ flexBasis: "100%" }}>Only active mappings are loaded by the runtime projection. Deactivation preserves the record but removes effective access.</small></label>

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

        <div className="identityGroups">
          {groupedMappings.map(({ identity, mappings: identityMappings }) => (
            <article key={identity.identity_key}
              className={!identity.is_active ? "muted" : ""}>
              <header>
                <strong>{identity.label}</strong>
                <small>
                  {identity.identity_key}
                  {!identity.is_active ? " · inactive identity" : ""}
                </small>
              </header>

              <div className="compactRows">
                {identityMappings.map(mapping => {
                  const capability = capabilities.find(row =>
                    row.capability_key === mapping.capability_key
                  );

                  return (
                    <div key={mapping.identity_key + ":" + mapping.capability_key}
                      className={!mapping.is_active ? "muted" : ""}>
                      <span>
                        <strong>{capability?.label || mapping.capability_key}</strong>
                        <small>
                          {mapping.capability_key} · order {mapping.sort_order}
                          {!capability?.is_active ? " · inactive capability" : ""}
                          {!mapping.is_active ? " · inactive mapping" : ""}
                        </small>
                      </span>
                      <button type="button" className="secondary" disabled={busy}
                        onClick={() => {
                          setEditingMapping({ ...mapping });
                          setMessage("");
                          setMappingForm({
                            identity_key: mapping.identity_key,
                            capability_key: mapping.capability_key,
                            sort_order: mapping.sort_order,
                            is_active: mapping.is_active,
                          });
                        }}>
                        Edit
                      </button>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </details>

      <style jsx>{`
        .operatingMaster {
          margin-top: 24px;
          padding: 18px;
          border: 1px solid #dbe3ee;
          border-radius: 16px;
          background: #fff;
        }
        .masterHeader h2 {
          margin: 4px 0;
        }
        .masterHeader p,
        .note {
          color: #64748b;
          line-height: 1.55;
        }
        .eyebrow {
          font-size: 12px;
          font-weight: 900;
          color: #2563eb;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .masterMessage {
          margin: 12px 0;
          padding: 10px 12px;
          border: 1px solid #93c5fd;
          border-radius: 10px;
          background: #eff6ff;
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
          margin: 14px 0;
        }
        .wide {
          grid-column: 1 / -1;
        }
        label {
          font-size: 13px;
          font-weight: 800;
        }
        input,
        select {
          display: block;
          width: 100%;
          margin-top: 6px;
          padding: 10px;
          border: 1px solid #cbd5e1;
          border-radius: 9px;
          background: #fff;
        }
        label small {
          display: block;
          margin-top: 5px;
          color: #64748b;
          font-weight: 500;
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
          align-self: end;
          border: 0;
          border-radius: 9px;
          padding: 10px 14px;
          background: #2563eb;
          color: #fff;
          font-weight: 800;
          cursor: pointer;
        }
        .secondary {
          background: #fff;
          color: #334155;
          border: 1px solid #cbd5e1;
        }
        .compactRows {
          display: grid;
          gap: 8px;
        }
        .compactRows > div {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
        }
        .compactRows strong,
        .compactRows small,
        .identityGroups strong,
        .identityGroups small {
          display: block;
        }
        .compactRows small,
        .identityGroups small {
          margin-top: 3px;
          color: #64748b;
        }
        .muted,
        .inactive {
          opacity: 0.55;
        }
        .inlineActions,
        .chips {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
        }
        .identityGroups {
          display: grid;
          gap: 10px;
          margin-top: 14px;
        }
        .identityGroups article {
          padding: 12px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
        }
        .identityGroups article header {
          margin-bottom: 9px;
        }
        .chip {
          padding: 7px 10px;
          background: #eef2ff;
          color: #3730a3;
          border: 1px solid #c7d2fe;
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: 12,
        background: "#f8fafc",
      }}
    >
      <strong style={{ display: "block", fontSize: 20 }}>{value}</strong>
      <span style={{ color: "#64748b", fontSize: 12 }}>{label}</span>
    </div>
  );
}
