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

  async function saveCapability(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const { data: auth } = await supabase.auth.getUser();
    const payload = {
      capability_key: slug(
        capabilityForm.capability_key || capabilityForm.label
      ),
      label: capabilityForm.label.trim(),
      capability_group: slug(capabilityForm.capability_group) || "business",
      description: capabilityForm.description.trim() || null,
      default_path: capabilityForm.default_path.trim() || null,
      sort_order: capabilityForm.sort_order,
      is_active: capabilityForm.is_active,
      updated_at: new Date().toISOString(),
      updated_by: auth.user?.id || null,
    };

    const { error } = await supabase
      .from("bos_operating_capabilities")
      .upsert(
        {
          ...payload,
          created_by: auth.user?.id || null,
        },
        { onConflict: "capability_key" }
      );

    setBusy(false);
    if (error) return setMessage(error.message);

    setCapabilityForm({
      capability_key: "",
      label: "",
      capability_group: "commerce",
      description: "",
      default_path: "",
      sort_order: 1000,
      is_active: true,
    });
    setMessage("3BOS operating capability saved.");
    await load();
  }

  async function saveMapping(event: React.FormEvent) {
    event.preventDefault();

    if (!mappingForm.identity_key || !mappingForm.capability_key) {
      setMessage("Choose both an identity and a 3BOS capability.");
      return;
    }

    setBusy(true);
    setMessage("");

    const { data: auth } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("identity_bos_operating_capabilities")
      .upsert(
        {
          identity_key: mappingForm.identity_key,
          capability_key: mappingForm.capability_key,
          sort_order: mappingForm.sort_order,
          is_active: mappingForm.is_active,
          updated_at: new Date().toISOString(),
          updated_by: auth.user?.id || null,
          created_by: auth.user?.id || null,
        },
        { onConflict: "identity_key,capability_key" }
      );

    setBusy(false);
    if (error) return setMessage(error.message);

    setMappingForm({
      identity_key: "",
      capability_key: "",
      sort_order: 1000,
      is_active: true,
    });
    setMessage("Identity-to-3BOS capability mapping saved.");
    await load();
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

  const groupedMappings = activeBusinessIdentities
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
          label="Mapped business identities"
          value={groupedMappings.length}
        />
      </div>

      <details open>
        <summary>Operating Capabilities</summary>
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
                  capability_key:
                    capabilityForm.capability_key || slug(e.target.value),
                })
              }
            />
          </label>

          <label>
            Permanent key
            <input
              value={capabilityForm.capability_key}
              onChange={(e) =>
                setCapabilityForm({
                  ...capabilityForm,
                  capability_key: slug(e.target.value),
                })
              }
            />
          </label>

          <label>
            Capability group *
            <input
              required
              value={capabilityForm.capability_group}
              onChange={(e) =>
                setCapabilityForm({
                  ...capabilityForm,
                  capability_group: e.target.value,
                })
              }
              placeholder="commerce, production, project"
            />
          </label>

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
          </label>

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
          </label>
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
          </label>

          <label className="check">
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
          </label>

          <button disabled={busy}>Save capability</button>
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
                  onClick={() =>
                    setCapabilityForm({
                      capability_key: row.capability_key,
                      label: row.label,
                      capability_group: row.capability_group,
                      description: row.description || "",
                      default_path: row.default_path || "",
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
          Map capabilities explicitly. Do not infer capability from identity
          spelling, family or marketplace module.
        </p>

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
            3BOS capability *
            <select
              required
              value={mappingForm.capability_key}
              onChange={(e) =>
                setMappingForm({
                  ...mappingForm,
                  capability_key: e.target.value,
                })
              }
            >
              <option value="">Choose capability</option>
              {capabilities
                .filter((row) => row.is_active)
                .map((row) => (
                  <option
                    key={row.capability_key}
                    value={row.capability_key}
                  >
                    {row.label}
                  </option>
                ))}
            </select>
          </label>

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

        <div className="identityGroups">
          {groupedMappings.map(({ identity, mappings: identityMappings }) => (
            <article key={identity.identity_key}>
              <header>
                <strong>{identity.label}</strong>
                <small>{identity.identity_key}</small>
              </header>

              <div className="chips">
                {identityMappings.map((mapping) => (
                  <button
                    key={`${mapping.identity_key}:${mapping.capability_key}`}
                    type="button"
                    className={mapping.is_active ? "chip" : "chip inactive"}
                    onClick={() => void toggleMapping(mapping)}
                    title={
                      mapping.is_active
                        ? "Click to deactivate"
                        : "Click to activate"
                    }
                  >
                    {capabilityLabel(mapping.capability_key)}
                  </button>
                ))}
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
