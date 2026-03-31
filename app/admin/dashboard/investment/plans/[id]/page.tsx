"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type PlanCategory = "cash_investment" | "joint_venture_land" | "hybrid";
type PlanStatus = "draft" | "active" | "inactive";
type RiskLevel = "low" | "moderate" | "high";

type FormState = {
  title: string;
  slug: string;
  category: PlanCategory;
  planType: string;
  shortDescription: string;
  highlightText: string;
  publicLabel: string;
  roiSummary: string;
  riskLevel: RiskLevel;
  status: PlanStatus;
  lockInSummary: string;
  exitSummary: string;
  defaultTerms: string;
  defaultDisclaimer: string;
  policyNote: string;
  builderCustomisationNote: string;

  minTicketSize: string;
  targetReturnSummary: string;
  revenueShareNote: string;
  profitShareNote: string;

  landContributionNote: string;
  areaShareNote: string;
  builderObligationNote: string;
  landownerObligationNote: string;

  hybridStructureNote: string;
};

type ApiEnvelope<T> = {
  ok?: boolean;
  message?: string;
  error?: string;
  data?: T;
};

type DbPlanRow = Record<string, any>;

function mapDbRowToForm(row: DbPlanRow): FormState {
  return {
    title: String(row.title || ""),
    slug: String(row.slug || ""),
    category: (row.category || "cash_investment") as PlanCategory,
    planType: String(row.plan_type || ""),
    shortDescription: String(row.short_description || ""),
    highlightText: String(row.highlight_text || ""),
    publicLabel: String(row.public_label || ""),
    roiSummary: String(row.roi_summary || ""),
    riskLevel: (row.risk_level || "moderate") as RiskLevel,
    status: (row.status || "draft") as PlanStatus,
    lockInSummary: String(row.lock_in_summary || ""),
    exitSummary: String(row.exit_summary || ""),
    defaultTerms: String(row.default_terms || ""),
    defaultDisclaimer: String(row.default_disclaimer || ""),
    policyNote: String(row.policy_note || ""),
    builderCustomisationNote: String(row.builder_customisation_note || ""),
    minTicketSize: String(row.min_ticket_size || ""),
    targetReturnSummary: String(row.target_return_summary || ""),
    revenueShareNote: String(row.revenue_share_note || ""),
    profitShareNote: String(row.profit_share_note || ""),
    landContributionNote: String(row.land_contribution_note || ""),
    areaShareNote: String(row.area_share_note || ""),
    builderObligationNote: String(row.builder_obligation_note || ""),
    landownerObligationNote: String(row.landowner_obligation_note || ""),
    hybridStructureNote: String(row.hybrid_structure_note || ""),
  };
}

const FALLBACK_PLAN: FormState = {
  title: "",
  slug: "",
  category: "cash_investment",
  planType: "",
  shortDescription: "",
  highlightText: "",
  publicLabel: "",
  roiSummary: "",
  riskLevel: "moderate",
  status: "draft",
  lockInSummary: "",
  exitSummary: "",
  defaultTerms: "",
  defaultDisclaimer: "",
  policyNote: "",
  builderCustomisationNote: "",
  minTicketSize: "",
  targetReturnSummary: "",
  revenueShareNote: "",
  profitShareNote: "",
  landContributionNote: "",
  areaShareNote: "",
  builderObligationNote: "",
  landownerObligationNote: "",
  hybridStructureNote: "",
};

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function categoryBadgeClasses(category: PlanCategory) {
  switch (category) {
    case "cash_investment":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "joint_venture_land":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "hybrid":
      return "border-violet-200 bg-violet-50 text-violet-700";
    default:
      return "border-gray-200 bg-gray-50 text-gray-700";
  }
}

function categoryLabel(category: PlanCategory) {
  switch (category) {
    case "cash_investment":
      return "Cash Investment";
    case "joint_venture_land":
      return "Joint Venture Land";
    case "hybrid":
      return "Hybrid";
    default:
      return category;
  }
}

function statusBadgeClasses(status: PlanStatus) {
  switch (status) {
    case "active":
      return "border-green-200 bg-green-50 text-green-700";
    case "inactive":
      return "border-red-200 bg-red-50 text-red-700";
    case "draft":
    default:
      return "border-gray-200 bg-gray-50 text-gray-700";
  }
}

function riskTextClasses(risk: RiskLevel) {
  switch (risk) {
    case "low":
      return "text-green-700";
    case "moderate":
      return "text-amber-700";
    case "high":
      return "text-red-700";
    default:
      return "text-gray-700";
  }
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-sm leading-6 text-gray-500">{subtitle}</p>
        ) : null}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-2 block text-sm font-semibold text-gray-700">
      {children}
      {required ? <span className="ml-1 text-red-600">*</span> : null}
    </label>
  );
}

export default function AdminInvestmentEditPlanPage() {
  const [planId, setPlanId] = useState("");

  const [form, setForm] = useState<FormState>(FALLBACK_PLAN);
  const [autoSlugTouched, setAutoSlugTouched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onTitleChange(value: string) {
    setForm((prev) => ({
      ...prev,
      title: value,
      slug: autoSlugTouched ? prev.slug : makeSlug(value),
    }));
  }

  async function loadPlan() {
    if (!planId) {
      setLoading(false);
      setError("Plan id missing from URL.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(
        `/api/admin/investment/plans/${encodeURIComponent(planId)}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const json = (await res.json().catch(() => null)) as
        | ApiEnvelope<DbPlanRow>
        | null;

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load plan.");
      }

      const row = json?.data;
      if (!row) {
        throw new Error("Plan not found.");
      }

      setForm(mapDbRowToForm(row));
    } catch (e: any) {
      setError(e?.message || "Failed to load plan.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdatePlan() {
    if (!planId) {
      setError("Plan id missing from URL.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(
        `/api/admin/investment/plans/${encodeURIComponent(planId)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to update plan.");
      }

      setSuccess("Plan updated successfully.");
      await loadPlan();
    } catch (e: any) {
      setError(e?.message || "Failed to update plan.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return;

    const parts = window.location.pathname.split("/").filter(Boolean);
    const id = parts[parts.length - 1] || "";

    if (!id) {
      setError("Plan id missing from URL.");
      setLoading(false);
      return;
    }

    setPlanId(id);

    (async () => {
      try {
        const res = await fetch(
          `/api/admin/investment/plans/${encodeURIComponent(id)}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json?.error || "Failed to load plan.");
        }

        if (!json?.data) {
          throw new Error("Plan not found.");
        }

        setForm(mapDbRowToForm(json.data));
      } catch (e: any) {
        setError(e?.message || "Failed to load plan.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const previewBadges = useMemo(() => {
    return [
      categoryLabel(form.category),
      form.status ? form.status.toUpperCase() : "DRAFT",
      form.riskLevel ? `Risk: ${form.riskLevel}` : "Risk: moderate",
    ];
  }, [form.category, form.status, form.riskLevel]);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-base font-semibold text-gray-900">
            Loading plan...
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Please wait while the plan details are being loaded.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
            Edit Participation Plan
          </div>

          <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-900">
            Update Builder Project Participation Plan
          </h1>

          <p className="mt-4 max-w-4xl text-sm leading-7 text-gray-600">
            Refine the approved executive structure of this participation plan
            without disturbing the broader investment workflow. This page is
            prepared for plan editing across cash investment, joint venture land
            participation, and hybrid models.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/dashboard/investment/plans"
            className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:text-black"
          >
            ← Back to Plans
          </Link>

          <button
            type="button"
            onClick={loadPlan}
            disabled={saving}
            className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-60"
          >
            Refresh
          </button>

          <button
            type="button"
            onClick={handleUpdatePlan}
            disabled={saving}
            className="rounded-2xl bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Updating..." : "Update Plan"}
          </button>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <div className="rounded-3xl border border-gray-200 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-6 text-white shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
            Editing Context
          </div>

          <h2 className="mt-3 text-2xl font-bold tracking-tight">
            Controlled master-plan refinement
          </h2>

          <p className="mt-3 text-sm leading-7 text-gray-200">
            This edit screen preserves central platform control over how builders
            and future public users see project participation structures. It is
            designed to keep the plan library standardized, attractive, and
            ready for builder-project integration.
          </p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            Live Plan Snapshot
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {previewBadges.map((item) => {
              const categoryText = categoryLabel(form.category);
              const statusText = form.status.toUpperCase();
              const riskText = `Risk: ${form.riskLevel}`;

              const classes =
                item === categoryText
                  ? categoryBadgeClasses(form.category)
                  : item === statusText
                  ? statusBadgeClasses(form.status)
                  : "border-gray-200 bg-gray-50 text-gray-700";

              return (
                <span
                  key={item}
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${classes}`}
                >
                  {item}
                </span>
              );
            })}
          </div>

          <div className="mt-5">
            <div className="text-xl font-bold tracking-tight text-gray-900">
              {form.title || "Untitled Participation Plan"}
            </div>
            <div className="mt-2 break-all text-sm text-gray-500">
              {form.slug || "plan-slug-preview"}
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-gray-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Plan ID
            </div>
            <div className="mt-2 break-all text-sm font-medium text-gray-900">
              {planId || "no-id"}
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-gray-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Public Label
            </div>
            <div className="mt-2 text-sm font-medium text-gray-900">
              {form.publicLabel || "Investment Opportunity"}
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-gray-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Highlight Text
            </div>
            <div className="mt-2 text-sm font-medium text-gray-900">
              {form.highlightText ||
                "Executive public highlight will appear here"}
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-gray-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              ROI / Return Summary
            </div>
            <div className="mt-2 text-sm font-medium text-gray-900">
              {form.roiSummary || "Return summary preview"}
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-gray-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Risk Level
            </div>
            <div className={`mt-2 text-sm font-semibold ${riskTextClasses(form.riskLevel)}`}>
              {form.riskLevel}
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {success}
        </div>
      ) : null}

      <div className="space-y-6">
        <SectionCard
          title="Core Identity"
          subtitle="Update the main plan identity, category, and public-facing positioning."
        >
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div>
              <FieldLabel required>Plan Title</FieldLabel>
              <input
                type="text"
                value={form.title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="Example: Landowner Profit Share JV"
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <FieldLabel required>Slug</FieldLabel>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => {
                  setAutoSlugTouched(true);
                  setField("slug", makeSlug(e.target.value));
                }}
                placeholder="example-plan-slug"
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <FieldLabel required>Category</FieldLabel>
              <select
                value={form.category}
                onChange={(e) =>
                  setField("category", e.target.value as PlanCategory)
                }
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              >
                <option value="cash_investment">Cash Investment</option>
                <option value="joint_venture_land">Joint Venture Land</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>

            <div>
              <FieldLabel required>Plan Type</FieldLabel>
              <input
                type="text"
                value={form.planType}
                onChange={(e) => setField("planType", e.target.value)}
                placeholder="Example: profit_share_jv / fixed_return / area_share_jv"
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <FieldLabel required>Public Label</FieldLabel>
              <input
                type="text"
                value={form.publicLabel}
                onChange={(e) => setField("publicLabel", e.target.value)}
                placeholder="Example: Joint Venture Opportunity"
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <FieldLabel required>Status</FieldLabel>
              <select
                value={form.status}
                onChange={(e) => setField("status", e.target.value as PlanStatus)}
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <FieldLabel required>Short Description</FieldLabel>
              <textarea
                value={form.shortDescription}
                onChange={(e) => setField("shortDescription", e.target.value)}
                rows={4}
                placeholder="Write a crisp executive summary of the plan..."
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Public Presentation"
          subtitle="Control how this plan appears later on builder-project and public-facing discovery screens."
        >
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div>
              <FieldLabel required>Highlight Text</FieldLabel>
              <input
                type="text"
                value={form.highlightText}
                onChange={(e) => setField("highlightText", e.target.value)}
                placeholder="Example: Land contribution with structured profit participation"
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <FieldLabel required>ROI / Return Summary</FieldLabel>
              <input
                type="text"
                value={form.roiSummary}
                onChange={(e) => setField("roiSummary", e.target.value)}
                placeholder="Example: Profit share at project monetisation"
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <FieldLabel required>Risk Level</FieldLabel>
              <select
                value={form.riskLevel}
                onChange={(e) => setField("riskLevel", e.target.value as RiskLevel)}
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              >
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <FieldLabel>Builder Customisation Note</FieldLabel>
              <input
                type="text"
                value={form.builderCustomisationNote}
                onChange={(e) =>
                  setField("builderCustomisationNote", e.target.value)
                }
                placeholder="Example: Builder may customise public summary within policy limits"
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <FieldLabel>Lock-in Summary</FieldLabel>
              <textarea
                value={form.lockInSummary}
                onChange={(e) => setField("lockInSummary", e.target.value)}
                rows={3}
                placeholder="Example: Minimum 18-month structured participation horizon"
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <FieldLabel>Exit Summary</FieldLabel>
              <textarea
                value={form.exitSummary}
                onChange={(e) => setField("exitSummary", e.target.value)}
                rows={3}
                placeholder="Example: Exit on defined sale / monetisation / allocation event"
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Cash Investment Structure"
          subtitle="Use these values for money-based participation plans or hybrid structures that include capital contribution."
        >
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div>
              <FieldLabel>Minimum Ticket Size</FieldLabel>
              <input
                type="text"
                value={form.minTicketSize}
                onChange={(e) => setField("minTicketSize", e.target.value)}
                placeholder="Example: ₹10,00,000"
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <FieldLabel>Target Return Summary</FieldLabel>
              <input
                type="text"
                value={form.targetReturnSummary}
                onChange={(e) => setField("targetReturnSummary", e.target.value)}
                placeholder="Example: 14%–18% structured annual target"
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <FieldLabel>Revenue Share Note</FieldLabel>
              <textarea
                value={form.revenueShareNote}
                onChange={(e) => setField("revenueShareNote", e.target.value)}
                rows={3}
                placeholder="Example: Investor may receive a pre-agreed share from project revenue"
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <FieldLabel>Profit Share Note</FieldLabel>
              <textarea
                value={form.profitShareNote}
                onChange={(e) => setField("profitShareNote", e.target.value)}
                rows={3}
                placeholder="Example: Net realised profit distributed as per plan structure"
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Joint Venture Land Contribution"
          subtitle="Critical for landowners and adjacent land contributors who participate by contributing land instead of cash."
        >
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div>
              <FieldLabel>Land Contribution Note</FieldLabel>
              <textarea
                value={form.landContributionNote}
                onChange={(e) => setField("landContributionNote", e.target.value)}
                rows={4}
                placeholder="Example: Landowner contributes land parcel as the core participation asset"
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <FieldLabel>Area Share Note</FieldLabel>
              <textarea
                value={form.areaShareNote}
                onChange={(e) => setField("areaShareNote", e.target.value)}
                rows={4}
                placeholder="Example: Landowner receives a defined developed area allocation"
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <FieldLabel>Builder Obligation Note</FieldLabel>
              <textarea
                value={form.builderObligationNote}
                onChange={(e) =>
                  setField("builderObligationNote", e.target.value)
                }
                rows={4}
                placeholder="Example: Builder to undertake approvals, development, marketing, and monetisation"
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <FieldLabel>Landowner Obligation Note</FieldLabel>
              <textarea
                value={form.landownerObligationNote}
                onChange={(e) =>
                  setField("landownerObligationNote", e.target.value)
                }
                rows={4}
                placeholder="Example: Landowner to provide valid title, cooperation, and execution support"
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Hybrid Structure"
          subtitle="Use this when the plan combines capital contribution with land or strategic participation."
        >
          <div>
            <FieldLabel>Hybrid Structure Note</FieldLabel>
            <textarea
              value={form.hybridStructureNote}
              onChange={(e) => setField("hybridStructureNote", e.target.value)}
              rows={5}
              placeholder="Example: Combines capital contribution, land input, and defined upside sharing in a single structure"
              className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Terms, Policy & Disclaimer"
          subtitle="Refine the standard platform-controlled legal framing and public disclosure language."
        >
          <div className="grid grid-cols-1 gap-5">
            <div>
              <FieldLabel>Default Terms & Conditions</FieldLabel>
              <textarea
                value={form.defaultTerms}
                onChange={(e) => setField("defaultTerms", e.target.value)}
                rows={6}
                placeholder="Write the master terms and conditions for this participation plan..."
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <FieldLabel>Policy Note</FieldLabel>
              <textarea
                value={form.policyNote}
                onChange={(e) => setField("policyNote", e.target.value)}
                rows={4}
                placeholder="Write platform policy note and compliance positioning..."
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <FieldLabel>Default Disclaimer</FieldLabel>
              <textarea
                value={form.defaultDisclaimer}
                onChange={(e) => setField("defaultDisclaimer", e.target.value)}
                rows={5}
                placeholder="Write investment / JV risk and legal disclaimer..."
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/admin/dashboard/investment/plans"
          className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:text-black"
        >
          ← Back to Plans
        </Link>

        <button
          type="button"
          onClick={loadPlan}
          disabled={saving}
          className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-60"
        >
          Refresh
        </button>

        <button
          type="button"
          onClick={handleUpdatePlan}
          disabled={saving}
          className="rounded-2xl bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Updating..." : "Update Plan"}
        </button>
      </div>

      <div className="mt-8 rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-6">
        <div className="text-sm font-semibold text-gray-900">Note</div>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          This page is now connected to the real Plan Master API for loading and
          updating. The next step is to connect the create page fully and then
          move to builder-project plan attachment without touching your already
          stable deal room and opportunity review flow.
        </p>
      </div>
    </main>
  );
}