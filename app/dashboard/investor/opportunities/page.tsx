"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type OpportunityRow = Record<string, any>;

type ApiEnvelope<T> = {
  ok?: boolean;
  message?: string;
  error?: string;
  data?: T;
};

function normalizeList(json: any): OpportunityRow[] {
  if (!json) return [];
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json)) return json;
  return [];
}

function fmtDate(value: unknown) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(String(value)));
  } catch {
    return String(value);
  }
}

function getTitle(row: OpportunityRow) {
  return (
    row.title ||
    row.name ||
    row.opportunity_title ||
    row.project_name ||
    "Untitled Opportunity"
  );
}

function getStatus(row: OpportunityRow) {
  return String(row.status || "draft");
}

function getSubtitle(row: OpportunityRow) {
  return (
    row.location ||
    row.city ||
    row.state ||
    row.sector ||
    row.category ||
    row.asset_type ||
    "—"
  );
}

function getAmount(row: OpportunityRow) {
  const candidates = [
    row.target_amount,
    row.raise_amount,
    row.ask_amount,
    row.minimum_investment,
    row.ticket_size,
    row.amount,
  ];

  const value = candidates.find(
    (v) => typeof v === "number" || (typeof v === "string" && v.trim() !== "")
  );

  if (value === undefined || value === null || value === "") return "—";

  const num = Number(value);
  if (Number.isNaN(num)) return String(value);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

function getCreatedAt(row: OpportunityRow) {
  return row.created_at || row.updated_at || null;
}

function statusClasses(status: string) {
  switch (status) {
    case "pending_review":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "approved":
      return "border-green-200 bg-green-50 text-green-700";
    case "rejected":
      return "border-red-200 bg-red-50 text-red-700";
    case "changes_requested":
    case "sent_back":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "draft":
    default:
      return "border-gray-200 bg-gray-50 text-gray-700";
  }
}

export default function InvestorOpportunitiesPage() {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [items, setItems] = useState<OpportunityRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  async function load() {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/investment/opportunities", {
        method: "GET",
        cache: "no-store",
      });

      const json = (await res.json().catch(() => null)) as
        | ApiEnvelope<OpportunityRow[]>
        | null;

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load opportunities.");
      }

      setItems(normalizeList(json));
    } catch (e: any) {
      setError(e?.message || "Failed to load opportunities.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreateNewDraft() {
    setCreating(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        title: "Untitled Investment Opportunity",
        status: "draft",
      };

      const res = await fetch("/api/investment/opportunities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = (await res.json().catch(() => null)) as
        | ApiEnvelope<OpportunityRow>
        | null;

      if (!res.ok) {
        throw new Error(json?.error || "Failed to create draft opportunity.");
      }

      const row = json?.data || null;
      if (!row?.id) {
        throw new Error("Draft created but id was not returned.");
      }

      window.location.href = `/dashboard/investor/opportunities/${encodeURIComponent(
        String(row.id)
      )}`;
    } catch (e: any) {
      setError(e?.message || "Failed to create draft opportunity.");
    } finally {
      setCreating(false);
    }
  }

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items.filter((row) => {
      const status = getStatus(row);
      const title = getTitle(row).toLowerCase();
      const subtitle = getSubtitle(row).toLowerCase();
      const slug = String(row.slug || "").toLowerCase();

      const matchesStatus =
        statusFilter === "all" ? true : status === statusFilter;

      const matchesSearch =
        !q ||
        title.includes(q) ||
        subtitle.includes(q) ||
        slug.includes(q) ||
        String(row.id || "").toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [items, search, statusFilter]);

  const counts = useMemo(() => {
    const draft = items.filter((x) => getStatus(x) === "draft").length;
    const pending = items.filter((x) => getStatus(x) === "pending_review").length;
    const approved = items.filter((x) => getStatus(x) === "approved").length;
    const rejected = items.filter((x) => getStatus(x) === "rejected").length;

    return {
      all: items.length,
      draft,
      pending_review: pending,
      approved,
      rejected,
    };
  }, [items]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Investor Opportunities
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Create, edit, review approved opportunities, and move into deal rooms.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/investor/deal-rooms"
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
          >
            View Deal Rooms
          </Link>

          <button
            onClick={load}
            disabled={loading || creating}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>

          <button
            onClick={handleCreateNewDraft}
            disabled={creating || loading}
            className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? "Creating..." : "+ New Opportunity"}
          </button>
        </div>
      </div>

      {success ? (
        <div className="mb-4 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {success}
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Total
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{counts.all}</div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Draft
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {counts.draft}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Pending Review
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {counts.pending_review}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Approved
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {counts.approved}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Rejected
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {counts.rejected}
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Search
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, slug, sector, city, state, or id"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
            >
              <option value="all">All</option>
              <option value="draft">Draft</option>
              <option value="pending_review">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="changes_requested">Changes Requested</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Opportunity
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Sector / Location
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Updated
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-gray-500"
                  >
                    Loading opportunities...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-gray-500"
                  >
                    No opportunities found.
                  </td>
                </tr>
              ) : (
                filteredItems.map((row) => {
                  const status = getStatus(row);

                  return (
                    <tr
                      key={String(row.id)}
                      className="border-b border-gray-100 last:border-b-0"
                    >
                      <td className="px-4 py-4 align-top">
                        <div className="font-semibold text-gray-900">
                          {getTitle(row)}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          ID: {String(row.id)}
                        </div>
                        {row.slug ? (
                          <div className="mt-1 text-xs text-gray-500">
                            Slug: {String(row.slug)}
                          </div>
                        ) : null}
                      </td>

                      <td className="px-4 py-4 align-top text-sm text-gray-700">
                        {getSubtitle(row)}
                      </td>

                      <td className="px-4 py-4 align-top text-sm text-gray-700">
                        {getAmount(row)}
                      </td>

                      <td className="px-4 py-4 align-top">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(
                            status
                          )}`}
                        >
                          {status}
                        </span>
                      </td>

                      <td className="px-4 py-4 align-top text-sm text-gray-700">
                        {fmtDate(getCreatedAt(row))}
                      </td>

                      <td className="px-4 py-4 align-top text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Link
                            href={`/dashboard/investor/opportunities/${encodeURIComponent(
                              String(row.id)
                            )}`}
                            className="inline-flex rounded-xl border border-black px-4 py-2 text-sm font-semibold text-black"
                          >
                            {status === "draft"
                              ? "Open Draft"
                              : status === "approved"
                              ? "View / Express Interest"
                              : "View"}
                          </Link>

                          {status === "approved" ? (
                            <Link
                              href="/dashboard/investor/deal-rooms"
                              className="inline-flex rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
                            >
                              Deal Rooms
                            </Link>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}