"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BuyerWorkMenu from "@/components/buyer/BuyerWorkMenu";

type AnyRow = Record<string, any>;

type ApiEnvelope<T> = {
  ok?: boolean;
  message?: string;
  error?: string;
  data?: T;
};

type CombinedInboxItem = {
  id: string;
  module: "investment";
  side: "investor" | "builder";
  title: string;
  subtitle: string;
  counterpartLabel: string;
  status: string;
  stage: string;
  unread: boolean;
  lastActivity: string | null;
  href: string;
  raw: AnyRow;
};

function normalizeList(json: any): AnyRow[] {
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

function getStatus(row: AnyRow) {
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

function getInvestmentTitle(row: AnyRow) {
  return (
    row.title ||
    row.opportunity_title ||
    row.investment_opportunities?.title ||
    row.opportunity_snapshot?.opportunity_title ||
    row.opportunity_snapshot?.title ||
    "Investment Deal Room"
  );
}

function getInvestmentSubtitle(row: AnyRow) {
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

function getInvestorLabel(row: AnyRow) {
  return (
    row.investor_name ||
    row.buyer_name ||
    row.investor_email ||
    row.investor_user_id ||
    "Investor"
  );
}

function getBuilderLabel(row: AnyRow) {
  return (
    row.promoter_name ||
    row.owner_name ||
    row.company_name ||
    row.business_name ||
    row.promoter_email ||
    row.builder_user_id ||
    "Builder"
  );
}

function getLastActivity(row: AnyRow) {
  return row.last_message_at || row.updated_at || row.created_at || null;
}

function hasUnreadForInvestor(row: AnyRow) {
  const lastMessageAt = String(row.last_message_at || "").trim();
  const lastReadAt = String(row.investor_last_read_at || "").trim();

  if (!lastMessageAt) return false;
  if (!lastReadAt) return true;

  const lastMessageTime = Date.parse(lastMessageAt);
  const lastReadTime = Date.parse(lastReadAt);

  if (!Number.isFinite(lastMessageTime) || !Number.isFinite(lastReadTime)) {
    return false;
  }

  return lastMessageTime > lastReadTime;
}

function hasUnreadForBuilder(row: AnyRow) {
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
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "closed":
    case "completed":
      return "border-slate-200 bg-slate-100 text-slate-700";
    case "cancelled":
    case "rejected":
      return "border-rose-200 bg-rose-50 text-rose-700";
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
      ? "border-emerald-200 bg-emerald-50"
      : tone === "amber"
      ? "border-amber-200 bg-amber-50"
      : tone === "slate"
      ? "border-slate-200 bg-slate-100"
      : "border-slate-200 bg-white";

  return (
    <div className={`rounded-3xl border p-4 shadow-sm ${toneClasses}`}>
      <BuyerWorkMenu />
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
        {value}
      </div>
      <div className="mt-1 text-xs text-slate-600">{subtext}</div>
    </div>
  );
}

export default function DashboardInboxPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [investmentInvestorItems, setInvestmentInvestorItems] = useState<AnyRow[]>([]);
  const [investmentBuilderItems, setInvestmentBuilderItems] = useState<AnyRow[]>([]);

  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState<"all" | "investment">("all");
  const [unreadOnly, setUnreadOnly] = useState(false);

  async function fetchInvestmentByRole(role: "investor" | "builder") {
    const params = new URLSearchParams();
    params.set("role", role);

    const res = await fetch(`/api/investment/deal-rooms?${params.toString()}`, {
      method: "GET",
      cache: "no-store",
    });

    const json = (await res.json().catch(() => null)) as
      | ApiEnvelope<AnyRow[]>
      | null;

    if (res.status === 401) {
      const returnTo = encodeURIComponent("/dashboard/inbox");
      router.push(`/login?next=${returnTo}`);
      return [];
    }

    if (!res.ok) {
      throw new Error(json?.error || `Failed to load ${role} investment inbox.`);
    }

    return normalizeList(json);
  }

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      const [investorRows, builderRows] = await Promise.all([
        fetchInvestmentByRole("investor"),
        fetchInvestmentByRole("builder"),
      ]);

      setInvestmentInvestorItems(investorRows);
      setInvestmentBuilderItems(builderRows);
    } catch (e: any) {
      setError(e?.message || "Failed to load inbox.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const investmentItems = useMemo<CombinedInboxItem[]>(() => {
    const investorMapped: CombinedInboxItem[] = investmentInvestorItems.map((row) => ({
      id: `investment-investor-${String(row.id)}`,
      module: "investment",
      side: "investor",
      title: getInvestmentTitle(row),
      subtitle: getInvestmentSubtitle(row),
      counterpartLabel: getBuilderLabel(row),
      status: getStatus(row),
      stage: String(row.stage || row.status || "active"),
      unread: hasUnreadForInvestor(row),
      lastActivity: getLastActivity(row),
      href: `/dashboard/investor/deal-rooms/${encodeURIComponent(String(row.id))}`,
      raw: row,
    }));

    const builderMapped: CombinedInboxItem[] = investmentBuilderItems.map((row) => ({
      id: `investment-builder-${String(row.id)}`,
      module: "investment",
      side: "builder",
      title: getInvestmentTitle(row),
      subtitle: getInvestmentSubtitle(row),
      counterpartLabel: getInvestorLabel(row),
      status: getStatus(row),
      stage: String(row.stage || row.status || "active"),
      unread: hasUnreadForBuilder(row),
      lastActivity: getLastActivity(row),
      href: `/dashboard/builder/deal-rooms/${encodeURIComponent(String(row.id))}`,
      raw: row,
    }));

    return [...investorMapped, ...builderMapped].sort((a, b) => {
      const aTime = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
      const bTime = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
      return bTime - aTime;
    });
  }, [investmentInvestorItems, investmentBuilderItems]);

  const allItems = useMemo(() => {
    return investmentItems;
  }, [investmentItems]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    return allItems.filter((item) => {
      if (moduleFilter !== "all" && item.module !== moduleFilter) return false;
      if (unreadOnly && !item.unread) return false;

      if (!q) return true;

      return (
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.counterpartLabel.toLowerCase().includes(q) ||
        item.status.toLowerCase().includes(q) ||
        item.stage.toLowerCase().includes(q) ||
        item.side.toLowerCase().includes(q) ||
        String(item.raw?.id || "")
          .toLowerCase()
          .includes(q) ||
        String(item.raw?.opportunity_id || "")
          .toLowerCase()
          .includes(q)
      );
    });
  }, [allItems, search, moduleFilter, unreadOnly]);

  const analytics = useMemo(() => {
    const total = allItems.length;
    const unread = allItems.filter((x) => x.unread).length;
    const active = allItems.filter(
      (x) =>
        !["closed", "completed", "cancelled", "rejected"].includes(
          String(x.stage || "").toLowerCase()
        )
    ).length;
    const investment = investmentItems.length;
    const investorSide = investmentItems.filter((x) => x.side === "investor").length;
    const builderSide = investmentItems.filter((x) => x.side === "builder").length;

    return {
      total,
      unread,
      active,
      investment,
      investorSide,
      builderSide,
    };
  }, [allItems, investmentItems]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-blue-50 shadow-sm">
        <div className="flex flex-col gap-5 px-5 py-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <div className="inline-flex rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
              Unified Inbox
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              All Conversations
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              View your latest investment discussions from one place and jump
              directly into the relevant room.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadAll}
              disabled={loading}
              className="inline-flex items-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-sm">
          <div className="font-semibold">Unable to load inbox</div>
          <div className="mt-1">{error}</div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total Threads"
          value={analytics.total}
          subtext="All loaded conversations"
        />
        <StatCard
          label="Unread"
          value={analytics.unread}
          subtext="Threads needing your attention"
          tone="amber"
        />
        <StatCard
          label="Active"
          value={analytics.active}
          subtext="Ongoing conversation flow"
          tone="green"
        />
        <StatCard
          label="Investment"
          value={analytics.investment}
          subtext="Investment deal-room threads"
        />
        <StatCard
          label="Investor + Builder"
          value={analytics.investorSide + analytics.builderSide}
          subtext={`${analytics.investorSide} investor side • ${analytics.builderSide} builder side`}
          tone="slate"
        />
      </div>

      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Search & Filters
            </h2>
            <p className="text-sm text-slate-500">
              Search by title, counterpart, stage, status, or identifiers.
            </p>
          </div>

          <div className="text-xs text-slate-500">
            Showing {filteredItems.length} of {analytics.total} threads •{" "}
            {analytics.unread} unread
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Search
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, counterpart, stage, status, id, or opportunity id"
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Module
            </label>
            <select
              value={moduleFilter}
              onChange={(e) =>
                setModuleFilter(e.target.value as "all" | "investment")
              }
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">All Loaded Modules</option>
              <option value="investment">Investment</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Quick Toggle
            </label>
            <button
              type="button"
              onClick={() => setUnreadOnly((v) => !v)}
              className={`w-full rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                unreadOnly
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
              }`}
            >
              {unreadOnly ? "Unread Only: On" : "Unread Only: Off"}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
            Investment: {analytics.investment}
          </div>

          <div className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
            Unread: {analytics.unread}
          </div>

          <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            Active: {analytics.active}
          </div>

          <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
            Investor Side: {analytics.investorSide}
          </div>

          <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
            Builder Side: {analytics.builderSide}
          </div>
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
        <div className="rounded-t-[1.75rem] border-b border-slate-200 bg-slate-50 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-950">
            Inbox Threads
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Open any conversation to continue from the correct module workspace.
          </p>
        </div>

        {loading ? (
          <div className="px-5 py-14 text-center text-sm text-slate-500">
            Loading inbox...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="px-5 py-14">
            <div className="mx-auto max-w-md text-center">
              <div className="text-base font-semibold text-slate-950">
                No conversations found
              </div>
              <p className="mt-2 text-sm text-slate-500">
                As investment conversations become active, they will appear
                here automatically.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 p-4 md:p-5">
            {filteredItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="block rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                        {item.title}
                      </h3>

                      {item.unread ? (
                        <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          Unread
                        </span>
                      ) : null}

                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {item.module === "investment" ? "Investment" : item.module}
                      </span>

                      <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                        {item.side === "investor" ? "Investor Side" : "Builder Side"}
                      </span>

                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(
                          item.status
                        )}`}
                      >
                        {getStatusLabel(item.status)}
                      </span>

                      <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                        Stage: {getStageLabel(item.stage)}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-600">{item.subtitle}</p>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="min-h-[84px] rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                          Counterpart
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">
                          {item.counterpartLabel}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {item.side === "investor" ? "Builder / promoter" : "Investor"}
                        </div>
                      </div>

                      <div className="min-h-[84px] rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                          Last Activity
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">
                          {fmtDateTime(item.lastActivity)}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {item.unread ? "Unread updates available" : "Up to date"}
                        </div>
                      </div>

                      <div className="min-h-[84px] rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                          Stage
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">
                          {getStageLabel(item.stage)}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Current conversation progression
                        </div>
                      </div>

                      <div className="min-h-[84px] rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                          Open
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">
                          Continue thread
                        </div>
                        <div className="mt-1 text-xs text-slate-500">Open →</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-600">
          Next Connection
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          This inbox already combines the full Investment side. The next full-file
          step is to plug in your existing RFQ inbox source and Direct chat source
          into the same card structure.
        </p>
      </div>
    </div>
  );
}
