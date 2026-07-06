"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type DealRoomRow = Record<string, any>;

type AnalyticsDealRoomRow = DealRoomRow & {
  _stage: string;
  _unread: boolean;
  _ndaPending: boolean;
  _lastActivity: any;
};

type ApiEnvelope<T> = {
  ok?: boolean;
  message?: string;
  error?: string;
  data?: T;
};

function normalizeList(json: any): DealRoomRow[] {
  if (!json) return [];
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json)) return json;
  return [];
}

function fmtDateTime(value: unknown) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(String(value)));
  } catch {
    return String(value);
  }
}

function getStatus(row: DealRoomRow) {
  return String(row.status || "active");
}

function getStatusLabel(status: string) {
  const s = String(status || "").toLowerCase();

  if (["open", "active", "in_progress"].includes(s)) return "Active";
  if (s === "pending") return "Pending";
  if (["closed", "completed"].includes(s)) return "Closed";
  if (["cancelled", "rejected"].includes(s)) return "Cancelled";

  return status || "—";
}

function getStageLabel(stage: string) {
  const s = String(stage || "").toLowerCase();

  if (s === "in_progress") return "In Progress";
  if (s === "due_diligence") return "Due Diligence";
  if (s === "term_sheet") return "Term Sheet";
  if (s === "discussion") return "Discussion";
  if (s === "interest") return "Interest";
  if (s === "closed") return "Closed";
  if (s === "completed") return "Completed";
  if (s === "cancelled") return "Cancelled";
  if (s === "rejected") return "Rejected";
  if (s === "pending") return "Pending";
  if (s === "active") return "Active";
  if (s === "open") return "Open";

  return stage || "—";
}

function getTitle(row: DealRoomRow) {
  return (
    row.title ||
    row.opportunity_title ||
    row.investment_opportunities?.title ||
    row.opportunity_snapshot?.opportunity_title ||
    row.opportunity_snapshot?.title ||
    "Investment Deal Room"
  );
}

function getSubtitle(row: DealRoomRow) {
  return (
    row.opportunity_snapshot?.sector ||
    row.opportunity_snapshot?.location ||
    row.location ||
    row.city ||
    row.state ||
    row.opportunity_slug ||
    row.investment_opportunities?.slug ||
    row.opportunity_title ||
    row.investment_opportunities?.title ||
    "—"
  );
}

function getInvestorLabel(row: DealRoomRow) {
  return (
    row.investor_name ||
    row.buyer_name ||
    row.investor_email ||
    row.investor_user_id ||
    "—"
  );
}

function getLastActivity(row: DealRoomRow) {
  return row.last_message_at || row.updated_at || row.created_at || null;
}

function hasUnreadForBuilder(row: DealRoomRow) {
  const lastMessageAt = String(row.last_message_at || "").trim();
  const lastReadAt = String(row.builder_last_read_at || "").trim();

  if (!lastMessageAt) return false;
  if (!lastReadAt) return true;

  const lastMessageTime = Date.parse(lastMessageAt);
  const lastReadTime = Date.parse(lastReadAt);

  if (!Number.isFinite(lastMessageTime) || !Number.isFinite(lastReadTime)) {
    return false;
  }

  return lastMessageTime > lastReadTime;
}

function statusClasses(status: string) {
  switch (String(status).toLowerCase()) {
    case "open":
    case "active":
    case "in_progress":
      return "border-green-200 bg-green-50 text-green-700";
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "closed":
    case "completed":
      return "border-gray-200 bg-gray-50 text-gray-700";
    case "cancelled":
    case "rejected":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-blue-200 bg-blue-50 text-blue-700";
  }
}

function StatCard({
  label,
  value,
  subtext,
  tone = "default",
}: {
  label: string;
  value: number;
  subtext: string;
  tone?: "default" | "green" | "amber" | "slate";
}) {
  const toneClasses =
    tone === "green"
      ? "border-green-200 bg-green-50"
      : tone === "amber"
      ? "border-amber-200 bg-amber-50"
      : tone === "slate"
      ? "border-gray-200 bg-gray-50"
      : "border-gray-200 bg-white";

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${toneClasses}`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="mt-3 text-3xl font-bold text-gray-900">{value}</div>
      <div className="mt-1 text-xs text-gray-500">{subtext}</div>
    </div>
  );
}

export default function BuilderDealRoomsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState<DealRoomRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  async function load(nextStatusFilter = statusFilter) {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.set("role", "builder");

      if (nextStatusFilter && nextStatusFilter !== "all") {
        params.set("status", nextStatusFilter);
      }

      const qs = `?${params.toString()}`;

      const res = await fetch(`/api/investment/deal-rooms${qs}`, {
        method: "GET",
        cache: "no-store",
      });

      const json = (await res.json().catch(() => null)) as
        | ApiEnvelope<DealRoomRow[]>
        | null;

      if (res.status === 401) {
        const returnTo = encodeURIComponent("/dashboard/builder/deal-rooms");
        router.push(`/login?next=${returnTo}`);
        return;
      }

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load deal rooms.");
      }

      setItems(normalizeList(json));
    } catch (e: any) {
      setError(e?.message || "Failed to load deal rooms.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(statusFilter);
  }, [statusFilter]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items.filter((row) => {
      const title = getTitle(row).toLowerCase();
      const subtitle = getSubtitle(row).toLowerCase();
      const investor = String(getInvestorLabel(row)).toLowerCase();
      const status = getStatus(row).toLowerCase();
      const stage = String(row.stage || "").toLowerCase();
      const id = String(row.id || "").toLowerCase();
      const opportunityId = String(row.opportunity_id || "").toLowerCase();
      const slug = String(row.opportunity_slug || "").toLowerCase();
      const nestedOpportunityTitle = String(
        row.investment_opportunities?.title || ""
      ).toLowerCase();
      const nestedOpportunitySlug = String(
        row.investment_opportunities?.slug || ""
      ).toLowerCase();

      if (!q) return true;

      return (
        title.includes(q) ||
        subtitle.includes(q) ||
        investor.includes(q) ||
        status.includes(q) ||
        stage.includes(q) ||
        id.includes(q) ||
        opportunityId.includes(q) ||
        slug.includes(q) ||
        nestedOpportunityTitle.includes(q) ||
        nestedOpportunitySlug.includes(q)
      );
    });
  }, [items, search]);

  const counts = useMemo(() => {
    return {
      pending: items.filter((x) => getStatus(x).toLowerCase() === "pending")
        .length,
      closed: items.filter((x) =>
        ["closed", "completed"].includes(getStatus(x).toLowerCase())
      ).length,
    };
  }, [items]);

  const analytics = useMemo(() => {
    const safeItems = Array.isArray(items) ? items : [];

    const normalized: AnalyticsDealRoomRow[] = safeItems.map((row) => {
      const stage = String(row.stage || row.status || "active").toLowerCase();
      const unread = hasUnreadForBuilder(row);

      const ndaRequired = Boolean(
        row?.nda_required ?? row?.is_nda_required ?? row?.nda_enabled ?? false
      );

      const ndaAccepted = Boolean(
        row?.builder_nda_accepted_at ?? row?.nda_accepted_at ?? false
      );

      const ndaPending = ndaRequired && !ndaAccepted;

      const lastActivity =
        row.last_message_at || row.updated_at || row.created_at || null;

      return {
        ...row,
        _stage: stage,
        _unread: unread,
        _ndaPending: ndaPending,
        _lastActivity: lastActivity,
      };
    });

    const total = normalized.length;

    const active = normalized.filter(
      (r) =>
        !["closed", "completed", "cancelled", "rejected"].includes(r._stage)
    ).length;

    const unreadRooms = normalized.filter((r) => r._unread).length;

    const ndaPendingRooms = normalized.filter((r) => r._ndaPending).length;

    const stageMap: Record<string, number> = {};
    normalized.forEach((r) => {
      stageMap[r._stage] = (stageMap[r._stage] || 0) + 1;
    });

    const stageDistribution = Object.entries(stageMap)
      .map(([stage, count]) => ({
        stage,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const recentActivity: AnalyticsDealRoomRow[] = [...normalized]
      .sort((a, b) => {
        const aTime = a._lastActivity ? new Date(a._lastActivity).getTime() : 0;
        const bTime = b._lastActivity ? new Date(b._lastActivity).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 5);

    return {
      total,
      active,
      unreadRooms,
      ndaPendingRooms,
      stageDistribution,
      recentActivity,
    };
  }, [items]);

  return (
    <div className="w-full px-4 py-8">
      <div className="mb-8 overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-indigo-50 shadow-sm">
        <div className="flex flex-col gap-6 px-6 py-7 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <div className="inline-flex rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
              Builder Hub
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900">
              Incoming Investment Interest
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              Manage investor conversations, track deal progress, and continue
              opportunity discussions from one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => load(statusFilter)}
              disabled={loading}
              className="inline-flex items-center rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>

            <Link
              href="/dashboard/inbox-v2"
              className="inline-flex items-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-black hover:text-black"
            >
              Unified Inbox
            </Link>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700 shadow-sm">
          <div className="font-semibold">Unable to load deal rooms</div>
          <div className="mt-1">{error}</div>
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total Rooms"
          value={analytics.total}
          subtext="All investor discussion rooms"
        />
        <StatCard
          label="Active"
          value={analytics.active}
          subtext="Ongoing deal conversations"
          tone="green"
        />
        <StatCard
          label="Pending"
          value={counts.pending}
          subtext="Waiting for next action"
          tone="amber"
        />
        <StatCard
          label="Unread"
          value={analytics.unreadRooms}
          subtext="Rooms needing builder attention"
        />
        <StatCard
          label="Closed"
          value={counts.closed}
          subtext="Completed or closed rooms"
          tone="slate"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                NDA Pending
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Rooms waiting for builder NDA action.
              </p>
            </div>
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-right">
              <div className="text-2xl font-bold text-red-700">
                {analytics.ndaPendingRooms}
              </div>
              <div className="text-xs font-medium text-red-600">
                Pending Rooms
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            {analytics.ndaPendingRooms > 0
              ? "Some investor rooms still need NDA completion before deeper negotiation."
              : "No NDA is currently pending in your builder deal rooms."}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900">
              Stage Distribution
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Overview of where your current deal flow stands.
            </p>
          </div>

          {analytics.stageDistribution.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
              No stage data available yet.
            </div>
          ) : (
            <div className="space-y-3">
              {analytics.stageDistribution.map((item) => (
                <div key={item.stage}>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-gray-700">
                      {getStageLabel(item.stage)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {item.count} ({item.percentage}%)
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-black"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900">
              Recent Activity
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Most recently active investor rooms.
            </p>
          </div>

          {analytics.recentActivity.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
              No recent activity yet.
            </div>
          ) : (
            <div className="space-y-3">
              {analytics.recentActivity.map((row) => (
                <Link
                  key={String(row.id)}
                  href={`/dashboard/builder/deal-rooms/${encodeURIComponent(
                    String(row.id)
                  )}`}
                  className="block rounded-2xl border border-gray-200 bg-gray-50 p-4 transition hover:border-gray-300 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-gray-900">
                        {getTitle(row)}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {getStageLabel(row._stage)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {row._unread ? (
                        <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                          Unread
                        </span>
                      ) : null}

                      <span className="text-xs font-semibold text-gray-400">
                        Open →
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-gray-500">
                    {fmtDateTime(row._lastActivity)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mb-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Search & Filters
            </h2>
            <p className="text-sm text-gray-500">
              Narrow rooms by investor, title, location, status, or stage.
            </p>
          </div>

          <div className="text-xs text-gray-500">
            Showing {filteredItems.length} of {analytics.total} rooms •{" "}
            {analytics.unreadRooms} unread • {analytics.ndaPendingRooms} NDA
            pending
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Search
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by investor, title, location, status, stage, or id"
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-black"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-black"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="closed">Closed</option>
              <option value="active">Active</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <div className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
            Active: {analytics.active}
          </div>

          <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
            Unread: {analytics.unreadRooms}
          </div>

          <div className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
            NDA Pending: {analytics.ndaPendingRooms}
          </div>

          <div className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700">
            Closed: {counts.closed}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">All Deal Rooms</h2>
          <p className="mt-1 text-sm text-gray-500">
            Open any room to continue the investor discussion, share files, and
            track progress.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-white">
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Deal Room
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Investor
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Opportunity
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Status
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Last Activity
                </th>
                <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-14 text-center text-sm text-gray-500"
                  >
                    Loading deal rooms...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14">
                    <div className="mx-auto max-w-md text-center">
                      <div className="text-base font-semibold text-gray-900">
                        No deal rooms found
                      </div>
                      <p className="mt-2 text-sm text-gray-500">
                        Once investors express interest in your opportunities,
                        those deal rooms will appear here.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((row) => {
                  const status = getStatus(row);
                  const unread = hasUnreadForBuilder(row);

                  return (
                    <tr
                      key={String(row.id)}
                      className="border-b border-gray-100 transition hover:bg-gray-50/80 last:border-b-0"
                    >
                      <td className="px-5 py-5 align-top">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-semibold text-gray-900">
                            {getTitle(row)}
                          </div>

                          {unread ? (
                            <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                              Unread
                            </span>
                          ) : null}

                          <span
                            className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusClasses(
                              status
                            )}`}
                          >
                            {getStatusLabel(status)}
                          </span>

                          <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">
                            Stage:{" "}
                            {getStageLabel(
                              String(row.stage || row.status || "active")
                            )}
                          </span>
                        </div>

                        <div className="mt-2 text-sm text-gray-600">
                          {getSubtitle(row)}
                        </div>

                        <div className="mt-3 space-y-1 text-xs text-gray-500">
                          <div>Room ID: {String(row.id)}</div>
                          {row.opportunity_id ? (
                            <div>Opportunity ID: {String(row.opportunity_id)}</div>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-5 py-5 align-top">
                        <div className="text-sm font-medium text-gray-900">
                          {getInvestorLabel(row)}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          Connected investor
                        </div>
                      </td>

                      <td className="px-5 py-5 align-top text-sm text-gray-700">
                        <div>
                          {row.opportunity_title ||
                            row.investment_opportunities?.title ||
                            getSubtitle(row)}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          Opportunity details
                        </div>
                      </td>

                      <td className="px-5 py-5 align-top">
                        <div className="flex flex-col items-start gap-2">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(
                              status
                            )}`}
                          >
                            {getStatusLabel(status)}
                          </span>

                          <span className="text-xs text-gray-500">
                            {getStageLabel(
                              String(row.stage || row.status || "active")
                            )}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-5 align-top text-sm text-gray-700">
                        <div>{fmtDateTime(getLastActivity(row))}</div>
                        <div className="mt-1 text-xs text-gray-500">
                          {unread ? "Unread investor activity" : "Up to date"}
                        </div>
                      </td>

                      <td className="px-5 py-5 align-top text-right">
                        <Link
                          href={`/dashboard/builder/deal-rooms/${encodeURIComponent(
                            String(row.id)
                          )}`}
                          className="inline-flex items-center rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                        >
                          Open Room
                        </Link>
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