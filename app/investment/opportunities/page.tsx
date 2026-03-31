"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type OpportunityRow = {
  id: string;
  slug: string | null;
  title: string | null;
  description: string | null;
  opportunity_type: string | null;
  source_type: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  visibility: string | null;
  status: string | null;
  min_investment: number | null;
  max_investment: number | null;
  expected_holding_months: number | null;
  risk_level: "low" | "medium" | "high" | null;
  cover_image_url: string | null;
  created_at: string | null;
};

type ApiResponse = {
  ok: boolean;
  data?: OpportunityRow[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
};

function formatINR(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "Not specified";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatDate(value?: string | null) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getOpportunityHref(item: OpportunityRow) {
  return `/investment/opportunities/${encodeURIComponent(item.slug || item.id)}`;
}

function getLocationText(item: OpportunityRow) {
  return [item.city, item.state, item.country].filter(Boolean).join(", ");
}

function getRiskBadgeClass(risk?: string | null) {
  if (risk === "low") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (risk === "high") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function SkeletonCard() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="h-5 w-28 animate-pulse rounded bg-slate-200" />
      <div className="mt-4 h-7 w-3/4 animate-pulse rounded bg-slate-200" />
      <div className="mt-3 h-4 w-full animate-pulse rounded bg-slate-100" />
      <div className="mt-2 h-4 w-11/12 animate-pulse rounded bg-slate-100" />
      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
      </div>
      <div className="mt-4 h-4 w-1/2 animate-pulse rounded bg-slate-100" />
    </div>
  );
}

function OpportunityCard({ item }: { item: OpportunityRow }) {
  const title = item.title || "Untitled Opportunity";
  const desc =
    item.description?.trim() ||
    "Explore this investment opportunity and review the full deal details before expressing interest.";
  const location = getLocationText(item);

  return (
    <Link
      href={getOpportunityHref(item)}
      className="group block overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
    >
      <div className="relative h-44 w-full overflow-hidden bg-slate-100">
        {item.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.cover_image_url}
            alt={title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 text-sm font-medium text-slate-500">
            Investment Opportunity
          </div>
        )}

        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          {item.opportunity_type ? (
            <span className="rounded-full border border-white/60 bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 backdrop-blur">
              {item.opportunity_type}
            </span>
          ) : null}

          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${getRiskBadgeClass(
              item.risk_level
            )}`}
          >
            {item.risk_level ? `${item.risk_level} risk` : "medium risk"}
          </span>
        </div>
      </div>

      <div className="p-5">
        <h2 className="line-clamp-2 text-xl font-semibold tracking-tight text-slate-900">
          {title}
        </h2>

        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
          {desc}
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Minimum Investment
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {formatINR(item.min_investment)}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Maximum Investment
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {formatINR(item.max_investment)}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
          {location ? <span>📍 {location}</span> : null}
          {item.expected_holding_months ? (
            <span>⏳ {item.expected_holding_months} months</span>
          ) : null}
          {item.created_at ? <span>🗓 {formatDate(item.created_at)}</span> : null}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">
            View full opportunity
          </span>
          <span className="text-lg text-slate-400 transition group-hover:translate-x-1">
            →
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function InvestmentOpportunitiesPage() {
  const [items, setItems] = useState<OpportunityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  async function loadOpportunities(targetPage = 1) {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      params.set("page", String(targetPage));
      params.set("limit", "12");
      params.set("sort", "latest");

      const res = await fetch(`/api/investment/opportunities?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      const json: ApiResponse = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to load opportunities.");
      }

      setItems(Array.isArray(json.data) ? json.data : []);
      setPage(json.pagination?.page || targetPage);
      setTotalPages(json.pagination?.totalPages || 1);
      setTotal(json.pagination?.total || 0);
    } catch (err: any) {
      setError(err?.message || "Failed to load opportunities.");
      setItems([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOpportunities(1);
  }, []);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;

    return items.filter((item) => {
      const haystack = [
        item.title,
        item.description,
        item.opportunity_type,
        item.city,
        item.state,
        item.country,
        item.risk_level,
        item.source_type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [items, search]);

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Investment Marketplace
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  Discover public investment opportunities
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                  Explore active opportunities, review the investment profile,
                  and move into a secure deal room after expressing interest.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Total Active
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-slate-900">
                    {total}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Showing
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-slate-900">
                    {filteredItems.length}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title, type, location, risk..."
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />

              <button
                type="button"
                onClick={() => setSearch("")}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={() => loadOpportunities(page)}
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-10 text-center">
            <div className="text-lg font-semibold text-red-700">
              Failed to load opportunities
            </div>
            <p className="mt-2 text-sm text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => loadOpportunities(1)}
              className="mt-5 rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
              📈
            </div>
            <h2 className="mt-4 text-xl font-semibold text-slate-900">
              No active opportunities available
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Once public investment opportunities are activated, they will appear here.
            </p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
              🔍
            </div>
            <h2 className="mt-4 text-xl font-semibold text-slate-900">
              No matching opportunities found
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Try a different keyword for title, type, location, or risk profile.
            </p>
            <button
              type="button"
              onClick={() => setSearch("")}
              className="mt-5 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Reset Search
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Active Opportunities
                </h2>
                <p className="text-sm text-slate-600">
                  Page {page} of {totalPages}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((item) => (
                <OpportunityCard key={item.id} item={item} />
              ))}
            </div>

            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => loadOpportunities(page - 1)}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>

              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700">
                {page} / {totalPages}
              </div>

              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => loadOpportunities(page + 1)}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}