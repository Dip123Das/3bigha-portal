"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type OpportunityRow = Record<string, any>;

type ApiEnvelope<T> = {
  ok?: boolean;
  message?: string;
  error?: string;
  data?: T;
};

function normalizeApiData<T>(json: any): T | null {
  if (!json) return null;
  if (json.data) return json.data as T;
  return json as T;
}

function humanize(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
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

function getTitle(row: OpportunityRow | null) {
  if (!row) return "Investment Opportunity";
  return (
    row.title ||
    row.name ||
    row.opportunity_title ||
    row.project_name ||
    "Untitled Opportunity"
  );
}

function getStatus(row: OpportunityRow | null) {
  return String(row?.status || "draft");
}

function getOwnerLabel(row: OpportunityRow | null) {
  if (!row) return "—";
  return (
    row.owner_name ||
    row.promoter_name ||
    row.company_name ||
    row.business_name ||
    row.owner_email ||
    row.created_by_email ||
    row.owner_user_id ||
    row.created_by ||
    "—"
  );
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

function stringifyValue(value: unknown) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

const REVIEW_NOTE_KEYS = [
  "review_notes",
  "admin_review_notes",
  "moderation_notes",
  "notes",
];

export default function AdminInvestmentOpportunityDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = decodeURIComponent(String(params?.id || ""));

  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [record, setRecord] = useState<OpportunityRow | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(
        `/api/investment/opportunities/${encodeURIComponent(id)}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const json = (await res.json().catch(() => null)) as
        | ApiEnvelope<OpportunityRow>
        | null;

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load opportunity.");
      }

      const data = normalizeApiData<OpportunityRow>(json);
      if (!data) {
        throw new Error("Opportunity not found.");
      }

      setRecord(data);

      const existingNotes =
        REVIEW_NOTE_KEYS.map((k) => data[k]).find(
          (v) => typeof v === "string" && v.trim()
        ) || "";

      setReviewNotes(String(existingNotes || ""));
    } catch (e: any) {
      setError(e?.message || "Failed to load opportunity.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    load();
  }, [id]);

  const metaKeys = useMemo(() => {
    if (!record) return [];
    return Object.keys(record);
  }, [record]);

  const reviewNotesKey = useMemo(() => {
    if (!record) return "review_notes";
    return REVIEW_NOTE_KEYS.find((k) => k in record) || "review_notes";
  }, [record]);

  async function handleReviewAction(
    nextStatus: "approved" | "rejected" | "changes_requested"
  ) {
    if (!record) return;

    setActing(true);
    setError("");
    setSuccess("");

    try {
      const payload: Record<string, any> = {
        status: nextStatus,
        [reviewNotesKey]: reviewNotes,
      };

      const res = await fetch(
        `/api/investment/opportunities/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const json = (await res.json().catch(() => null)) as
        | ApiEnvelope<OpportunityRow>
        | null;

      if (!res.ok) {
        throw new Error(json?.error || `Failed to update status to ${nextStatus}.`);
      }

      await load();
      setSuccess(
        json?.message ||
          (nextStatus === "approved"
            ? "Opportunity approved successfully."
            : nextStatus === "rejected"
            ? "Opportunity rejected successfully."
            : "Opportunity sent back successfully.")
      );
    } catch (e: any) {
      setError(e?.message || "Failed to update opportunity.");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div className="w-full px-4 py-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-600">Loading opportunity...</p>
        </div>
      </div>
    );
  }

  if (error && !record) {
    return (
      <div className="w-full px-4 py-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-lg font-semibold text-red-700">
            Unable to load opportunity
          </h1>
          <p className="mt-2 text-sm text-red-600">{error}</p>

          <div className="mt-4 flex gap-3">
            <button
              onClick={() => router.refresh()}
              className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white"
            >
              Refresh
            </button>

            <Link
              href="/admin/dashboard/investment/opportunities"
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
            >
              Back to Review List
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const status = getStatus(record);

  return (
    <div className="w-full px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2">
            <Link
              href="/admin/dashboard/investment/opportunities"
              className="text-sm font-medium text-gray-600 hover:text-black"
            >
              ← Back to Review List
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-gray-900">{getTitle(record)}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(
                status
              )}`}
            >
              {status}
            </span>

            <span className="text-sm text-gray-500">
              Owner: {getOwnerLabel(record)}
            </span>

            {record?.id ? (
              <span className="text-sm text-gray-500">ID: {String(record.id)}</span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={load}
            disabled={acting}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Refresh
          </button>

          <button
            onClick={() => handleReviewAction("changes_requested")}
            disabled={acting}
            className="rounded-xl border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {acting ? "Processing..." : "Send Back"}
          </button>

          <button
            onClick={() => handleReviewAction("rejected")}
            disabled={acting}
            className="rounded-xl border border-red-600 px-4 py-2 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {acting ? "Processing..." : "Reject"}
          </button>

          <button
            onClick={() => handleReviewAction("approved")}
            disabled={acting}
            className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {acting ? "Processing..." : "Approve"}
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

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Current Status
          </div>
          <div className="mt-3">
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(
                status
              )}`}
            >
              {status}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Owner
          </div>
          <div className="mt-3 text-sm font-medium text-gray-900">
            {getOwnerLabel(record)}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Last Updated
          </div>
          <div className="mt-3 text-sm font-medium text-gray-900">
            {fmtDateTime(record?.updated_at || record?.created_at)}
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Review Notes</h2>
          <p className="mt-1 text-sm text-gray-500">
            These notes will be sent along with your review action.
          </p>
        </div>

        <div className="p-6">
          <textarea
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            rows={6}
            placeholder="Write approval notes, rejection reason, or requested changes..."
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Opportunity Details
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Read-only review view of all available fields.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
          {metaKeys.length === 0 ? (
            <div className="md:col-span-2 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              No opportunity data found.
            </div>
          ) : (
            metaKeys.map((key) => {
              const value = record?.[key];
              const isLong =
                typeof value === "object" ||
                (typeof value === "string" && value.length > 120);

              return (
                <div
                  key={key}
                  className={isLong ? "md:col-span-2" : "md:col-span-1"}
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {humanize(key)}
                  </div>

                  {typeof value === "object" && value !== null ? (
                    <pre className="mt-2 overflow-x-auto rounded-xl bg-gray-50 p-3 text-xs text-gray-800">
                      {JSON.stringify(value, null, 2)}
                    </pre>
                  ) : (
                    <div className="mt-2 break-words text-sm text-gray-900">
                      {stringifyValue(value)}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}