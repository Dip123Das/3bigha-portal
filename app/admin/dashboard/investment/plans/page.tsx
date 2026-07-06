"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type PlanCategory = "cash_investment" | "joint_venture_land" | "hybrid";
type PlanStatus = "active" | "inactive" | "draft";

type PlanRow = {
  id: string;
  title: string;
  category: PlanCategory;
  planType: string;
  shortDescription: string;
  highlightText: string;
  roiSummary: string;
  riskLevel: "Low" | "Moderate" | "High";
  publicLabel: string;
  status: PlanStatus;
  updatedAt: string;
};

type ApiEnvelope<T> = {
  ok?: boolean;
  message?: string;
  error?: string;
  data?: T;
};

type DbPlanRow = Record<string, any>;

function normalizeRiskLevel(value: unknown): PlanRow["riskLevel"] {
  const v = String(value || "").toLowerCase();
  if (v === "low") return "Low";
  if (v === "high") return "High";
  return "Moderate";
}

function normalizePlanRow(row: DbPlanRow): PlanRow {
  return {
    id: String(row.id),
    title: String(row.title || "Untitled Plan"),
    category: row.category as PlanCategory,
    planType: String(row.plan_type || ""),
    shortDescription: String(row.short_description || ""),
    highlightText: String(row.highlight_text || ""),
    roiSummary: String(row.roi_summary || ""),
    riskLevel: normalizeRiskLevel(row.risk_level),
    publicLabel: String(row.public_label || ""),
    status: (row.status || "draft") as PlanStatus,
    updatedAt: String(row.updated_at || row.created_at || new Date().toISOString()),
  };
}

function fmtDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
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

function categoryClasses(category: PlanCategory) {
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

function statusClasses(status: PlanStatus) {
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

function riskClasses(risk: PlanRow["riskLevel"]) {
  switch (risk) {
    case "Low":
      return "text-green-700";
    case "Moderate":
      return "text-amber-700";
    case "High":
      return "text-red-700";
    default:
      return "text-gray-700";
  }
}

type StatCardProps = {
  label: string;
  value: string | number;
  hint: string;
};

function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
        {label}
      </div>
      <div className="mt-3 text-3xl font-bold tracking-tight text-gray-900">
        {value}
      </div>
      <div className="mt-2 text-sm text-gray-500">{hint}</div>
    </div>
  );
}

export default function AdminInvestmentPlansPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<
    "all" | PlanCategory
  >("all");
  const [statusFilter, setStatusFilter] = useState<"all" | PlanStatus>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [plans, setPlans] = useState<PlanRow[]>([]);

  async function loadPlans() {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      if (categoryFilter !== "all") {
        params.set("category", categoryFilter);
      }

      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      if (search.trim()) {
        params.set("q", search.trim());
      }

      const qs = params.toString();
      const res = await fetch(
        `/api/admin/investment/plans${qs ? `?${qs}` : ""}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const json = (await res.json().catch(() => null)) as
        | ApiEnvelope<DbPlanRow[]>
        | null;

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load plans.");
      }

      const rows = Array.isArray(json?.data) ? json.data : [];
      setPlans(rows.map(normalizePlanRow));
    } catch (e: any) {
      setError(e?.message || "Failed to load plans.");
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPlans();
  }, [categoryFilter, statusFilter]);

  const filteredPlans = useMemo(() => {
    const q = search.trim().toLowerCase();

    return plans.filter((plan) => {
      if (!q) return true;

      return (
        plan.title.toLowerCase().includes(q) ||
        plan.planType.toLowerCase().includes(q) ||
        plan.shortDescription.toLowerCase().includes(q) ||
        plan.highlightText.toLowerCase().includes(q) ||
        plan.publicLabel.toLowerCase().includes(q) ||
        plan.id.toLowerCase().includes(q)
      );
    });
  }, [plans, search]);

  const counts = useMemo(() => {
    return {
      total: plans.length,
      active: plans.filter((x) => x.status === "active").length,
      inactive: plans.filter((x) => x.status === "inactive").length,
      draft: plans.filter((x) => x.status === "draft").length,
    };
  }, [plans]);

  return (
    <main className="w-full px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
            Plan Master
          </div>

          <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-900">
            Builder Project Participation Plans
          </h1>

          <p className="mt-4 max-w-4xl text-sm leading-7 text-gray-600">
            Create and manage the platform-approved plans that builders can
            later attach to their projects. These plans will support cash
            investment, joint venture land contribution, and hybrid
            participation structures with standardized public highlights,
            policy language, risk notes, and return summaries.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/dashboard/investment"
            className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:text-black"
          >
            ← Investment Home
          </Link>

          <button
            type="button"
            onClick={loadPlans}
            disabled={loading}
            className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>

          <Link
            href="/admin/dashboard/investment/plans/new"
            className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + Create New Plan
          </Link>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          label="Total Plans"
          value={counts.total}
          hint="All configured participation plans"
        />
        <StatCard
          label="Active"
          value={counts.active}
          hint="Currently available for builder usage"
        />
        <StatCard
          label="Inactive"
          value={counts.inactive}
          hint="Retained but not available for use"
        />
        <StatCard
          label="Draft"
          value={counts.draft}
          hint="Prepared but not yet activated"
        />
      </div>

      <div className="mb-8 rounded-3xl border border-gray-200 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-6 text-white shadow-sm">
        <div className="max-w-4xl">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
            Strategic Coverage
          </div>

          <h2 className="mt-3 text-2xl font-bold tracking-tight">
            One master system for money investors, land contributors, and hybrid participants
          </h2>

          <p className="mt-3 text-sm leading-7 text-gray-200">
            This plan master will later power the builder project investment
            layer. Builders will choose approved plans here first, then attach
            them to eligible projects and selected units for public discovery
            and deal-room conversion.
          </p>
        </div>
      </div>

      <div className="mb-8 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Search plans
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  loadPlans();
                }
              }}
              placeholder="Search by title, type, label, description, or id"
              className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(
                  e.target.value as "all" | PlanCategory
                )
              }
              className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
            >
              <option value="all">All Categories</option>
              <option value="cash_investment">Cash Investment</option>
              <option value="joint_venture_land">Joint Venture Land</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "all" | PlanStatus)
              }
              className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Plan Library</h2>
          <p className="mt-1 text-sm text-gray-500">
            Executive view of all approved or draft participation plans.
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="px-6 py-12 text-center">
              <div className="text-base font-semibold text-gray-900">
                Loading plans...
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Please wait while the plan master is being loaded.
              </p>
            </div>
          ) : filteredPlans.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="text-base font-semibold text-gray-900">
                No plans found
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Try changing your filters or create a new plan.
              </p>
            </div>
          ) : (
            filteredPlans.map((plan) => (
              <div
                key={plan.id}
                className="grid grid-cols-1 gap-5 px-6 py-6 xl:grid-cols-[1.5fr_1fr_1fr_180px]"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${categoryClasses(
                        plan.category
                      )}`}
                    >
                      {categoryLabel(plan.category)}
                    </span>

                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(
                        plan.status
                      )}`}
                    >
                      {plan.status}
                    </span>
                  </div>

                  <h3 className="mt-4 text-xl font-bold tracking-tight text-gray-900">
                    {plan.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-gray-600">
                    {plan.shortDescription}
                  </p>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-gray-50 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Public Highlight
                      </div>
                      <div className="mt-2 text-sm font-medium text-gray-900">
                        {plan.highlightText}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-gray-50 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        ROI / Return Summary
                      </div>
                      <div className="mt-2 text-sm font-medium text-gray-900">
                        {plan.roiSummary}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Plan Type
                  </div>
                  <div className="mt-2 text-sm font-semibold text-gray-900">
                    {plan.planType}
                  </div>

                  <div className="mt-5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Public Label
                  </div>
                  <div className="mt-2 text-sm text-gray-900">
                    {plan.publicLabel}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Risk Level
                  </div>
                  <div className={`mt-2 text-sm font-semibold ${riskClasses(plan.riskLevel)}`}>
                    {plan.riskLevel}
                  </div>

                  <div className="mt-5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Last Updated
                  </div>
                  <div className="mt-2 text-sm text-gray-900">
                    {fmtDate(plan.updatedAt)}
                  </div>

                  <div className="mt-5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Plan ID
                  </div>
                  <div className="mt-2 break-all text-sm text-gray-900">
                    {plan.id}
                  </div>
                </div>

                <div className="flex flex-col gap-3 xl:items-end">
                  <Link
                    href={`/admin/dashboard/investment/plans/${encodeURIComponent(
                      plan.id
                    )}`}
                    className="inline-flex items-center justify-center rounded-2xl bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                  >
                    Edit Plan
                  </Link>

                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 opacity-60"
                    disabled
                  >
                    {plan.status === "active" ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-6">
        <div className="text-sm font-semibold text-gray-900">
          Note
        </div>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          This page is now connected to the real Plan Master API for listing.
          The next step is to wire the create and edit pages to the same backend
          without disturbing your existing investment opportunity review flow.
        </p>
      </div>
    </main>
  );
}