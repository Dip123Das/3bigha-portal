"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type OpportunityRow = Record<string, any>;
type DealRoomRow = Record<string, any>;

type ApiEnvelope<T> = {
  ok?: boolean;
  message?: string;
  error?: string;
  data?: T;
};

const NON_EDITABLE_KEYS = new Set([
  "id",
  "created_at",
  "updated_at",
  "deleted_at",
  "submitted_at",
  "approved_at",
  "rejected_at",
  "reviewed_at",
  "published_at",
  "owner_user_id",
  "created_by",
  "created_by_user_id",
  "updated_by",
  "reviewed_by",
  "review_notes",
  "status",
]);

function normalizeApiData<T>(json: any): T | null {
  if (!json) return null;
  if (json.data) return json.data as T;
  return json as T;
}

function isLikelyLongText(key: string, value: unknown) {
  if (typeof value !== "string") return false;

  const k = key.toLowerCase();
  return (
    value.length > 120 ||
    k.includes("description") ||
    k.includes("summary") ||
    k.includes("overview") ||
    k.includes("highlights") ||
    k.includes("notes") ||
    k.includes("risks") ||
    k.includes("use_of_funds") ||
    k.includes("business_model") ||
    k.includes("address")
  );
}

function humanize(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function parseInputValue(raw: string, original: unknown) {
  if (original === null || original === undefined) return raw;

  if (typeof original === "number") {
    if (raw.trim() === "") return null;
    const num = Number(raw);
    return Number.isNaN(num) ? raw : num;
  }

  if (typeof original === "boolean") {
    return raw === "true";
  }

  return raw;
}

function toInputString(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

export default function InvestorOpportunityDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = decodeURIComponent(String(params?.id || ""));

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expressingInterest, setExpressingInterest] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [record, setRecord] = useState<OpportunityRow | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [interestMessage, setInterestMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

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

        if (!cancelled) {
          setRecord(data);
          setForm(data);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Failed to load opportunity.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (id) load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const editableKeys = useMemo(() => {
    if (!record) return [];
    return Object.keys(record).filter((key) => !NON_EDITABLE_KEYS.has(key));
  }, [record]);

  const dirty = useMemo(() => {
    if (!record) return false;
    return editableKeys.some((key) => {
      const a = form[key];
      const b = record[key];
      return JSON.stringify(a) !== JSON.stringify(b);
    });
  }, [editableKeys, form, record]);

  async function reloadAfterMutation() {
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
      throw new Error(json?.error || "Failed to reload opportunity.");
    }

    const data = normalizeApiData<OpportunityRow>(json);
    if (!data) {
      throw new Error("Opportunity not found.");
    }

    setRecord(data);
    setForm(data);
  }

  async function handleSave() {
    if (!record) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload: Record<string, any> = {};

      for (const key of editableKeys) {
        if (JSON.stringify(form[key]) !== JSON.stringify(record[key])) {
          payload[key] = form[key];
        }
      }

      if (Object.keys(payload).length === 0) {
        setSuccess("No changes to save.");
        return;
      }

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
        throw new Error(json?.error || "Failed to save opportunity.");
      }

      await reloadAfterMutation();
      setSuccess(json?.message || "Opportunity updated successfully.");
    } catch (e: any) {
      setError(e?.message || "Failed to save opportunity.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitForReview() {
    if (!record) return;

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(
        `/api/investment/opportunities/${encodeURIComponent(id)}/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const json = (await res.json().catch(() => null)) as
        | ApiEnvelope<OpportunityRow>
        | null;

      if (!res.ok) {
        throw new Error(json?.error || "Failed to submit opportunity.");
      }

      await reloadAfterMutation();
      setSuccess(json?.message || "Opportunity submitted for review.");
    } catch (e: any) {
      setError(e?.message || "Failed to submit opportunity.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleExpressInterest() {
    if (!record?.id) return;

    setExpressingInterest(true);
    setError("");
    setSuccess("");

    try {
      const payload: Record<string, any> = {
        opportunityId: record.id,
      };

      if (interestMessage.trim()) {
        payload.initialMessage = interestMessage.trim();
      }

      const res = await fetch(`/api/investment/express-interest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = (await res.json().catch(() => null)) as
        | ApiEnvelope<DealRoomRow>
        | null;

      if (!res.ok) {
        throw new Error(json?.error || "Failed to express interest.");
      }

      const room = normalizeApiData<DealRoomRow>(json);

      if (!room?.id) {
        throw new Error("Deal room created, but no room id was returned.");
      }

      router.push(
        `/dashboard/investor/deal-rooms/${encodeURIComponent(String(room.id))}`
      );
    } catch (e: any) {
      setError(e?.message || "Failed to express interest.");
    } finally {
      setExpressingInterest(false);
    }
  }

  function updateField(key: string, value: any) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-600">Loading opportunity...</p>
        </div>
      </div>
    );
  }

  if (error && !record) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
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
              href="/dashboard/investor/opportunities"
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
            >
              Back to Opportunities
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const status = String(record?.status || "").trim();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-2">
            <Link
              href="/dashboard/investor/opportunities"
              className="text-sm font-medium text-gray-600 hover:text-black"
            >
              ← Back to Opportunities
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            {record?.title || record?.name || "Investment Opportunity"}
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full border border-gray-300 px-3 py-1 font-medium text-gray-700">
              Status: {status || "—"}
            </span>

            {record?.slug ? (
              <span className="text-gray-500">Slug: {String(record.slug)}</span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {status === "draft" ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving || submitting || expressingInterest || !dirty}
                className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Draft"}
              </button>

              <button
                onClick={handleSubmitForReview}
                disabled={saving || submitting || expressingInterest || status !== "draft"}
                className="rounded-xl border border-black px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit for Review"}
              </button>
            </>
          ) : null}

          {status === "approved" ? (
            <button
              onClick={handleExpressInterest}
              disabled={saving || submitting || expressingInterest}
              className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {expressingInterest ? "Opening Deal Room..." : "Express Interest"}
            </button>
          ) : null}
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

      {status !== "draft" && status !== "approved" ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          This opportunity is currently <span className="font-semibold">{status}</span>.
          Editing may be restricted depending on your API rules.
        </div>
      ) : null}

      {status === "approved" ? (
        <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-6">
          <h2 className="text-lg font-semibold text-green-900">
            This opportunity is approved
          </h2>
          <p className="mt-1 text-sm text-green-700">
            You can start a deal room with the builder by expressing interest.
          </p>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-green-900">
              Optional first message
            </label>
            <textarea
              value={interestMessage}
              onChange={(e) => setInterestMessage(e.target.value)}
              rows={4}
              placeholder="Write your interest message to the builder..."
              className="w-full rounded-xl border border-green-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={handleExpressInterest}
              disabled={expressingInterest}
              className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {expressingInterest ? "Opening Deal Room..." : "Express Interest"}
            </button>

            <Link
              href="/dashboard/investor/deal-rooms"
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
            >
              View My Deal Rooms
            </Link>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Opportunity Details
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {status === "draft"
              ? "Update the fields below and save the draft before submitting for review."
              : "View the opportunity details below."}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
          {editableKeys.length === 0 ? (
            <div className="md:col-span-2">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                No editable fields were found in this record.
              </div>
            </div>
          ) : null}

          {editableKeys.map((key) => {
            const originalValue = record?.[key];
            const value = form[key];
            const longText = isLikelyLongText(key, originalValue ?? value);
            const isBoolean = typeof originalValue === "boolean";
            const isNumber =
              typeof originalValue === "number" ||
              /amount|price|roi|equity|ticket|minimum|maximum|target|cap/i.test(
                key
              );
            const readOnly = status !== "draft";

            return (
              <div
                key={key}
                className={longText ? "md:col-span-2" : "md:col-span-1"}
              >
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {humanize(key)}
                </label>

                {isBoolean ? (
                  <select
                    value={toInputString(value)}
                    onChange={(e) => updateField(key, e.target.value === "true")}
                    disabled={readOnly}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none ring-0 focus:border-black disabled:bg-gray-50 disabled:text-gray-600"
                  >
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                ) : longText ? (
                  <textarea
                    value={toInputString(value)}
                    onChange={(e) => updateField(key, e.target.value)}
                    rows={6}
                    readOnly={readOnly}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none ring-0 focus:border-black read-only:bg-gray-50 read-only:text-gray-700"
                  />
                ) : (
                  <input
                    type={isNumber ? "number" : "text"}
                    step={isNumber ? "any" : undefined}
                    value={toInputString(value)}
                    onChange={(e) =>
                      updateField(key, parseInputValue(e.target.value, originalValue))
                    }
                    readOnly={readOnly}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none ring-0 focus:border-black read-only:bg-gray-50 read-only:text-gray-700"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Read-only Meta</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
          {record
            ? Object.keys(record)
                .filter((key) => !editableKeys.includes(key))
                .map((key) => (
                  <div key={key}>
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {humanize(key)}
                    </div>
                    <div className="mt-1 break-all text-sm text-gray-800">
                      {record[key] === null || record[key] === undefined
                        ? "—"
                        : typeof record[key] === "object"
                        ? JSON.stringify(record[key])
                        : String(record[key])}
                    </div>
                  </div>
                ))
            : null}
        </div>
      </div>
    </div>
  );
}