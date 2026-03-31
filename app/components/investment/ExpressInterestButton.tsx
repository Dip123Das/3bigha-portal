"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  opportunityId: string;
  opportunityTitle?: string | null;
  minInvestment?: number | null;
  maxInvestment?: number | null;
  expectedHoldingMonths?: number | null;
  riskLevel?: string | null;
  onStatusChange?: (status: "checking" | "open" | "engaged") => void;
};

type ExpressInterestResponse = {
  ok: boolean;
  error?: string;
  message?: string;
  application_id?: string;
  application_already_existed?: boolean;
  deal_room_id?: string;
  deal_room_already_existed?: boolean;
};

type DealRoomRow = {
  id: string;
  opportunity_id?: string | null;
  status?: string | null;
  stage?: string | null;
};

type DealRoomsListResponse = {
  ok?: boolean;
  data?: DealRoomRow[];
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

export default function ExpressInterestButton({
  opportunityId,
  opportunityTitle,
  minInvestment,
  maxInvestment,
  expectedHoldingMonths,
  riskLevel,
  onStatusChange,
}: Props) {
  const router = useRouter();

  const [checkingExisting, setCheckingExisting] = useState(true);
  const [existingDealRoomId, setExistingDealRoomId] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [proposedAmount, setProposedAmount] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkExistingDealRoom() {
      try {
        setCheckingExisting(true);
        onStatusChange?.("checking");
        setError("");

        const res = await fetch("/api/investment/deal-rooms?status=open", {
          method: "GET",
          cache: "no-store",
        });

        if (res.status === 401) {
          if (!cancelled) {
            setExistingDealRoomId(null);
            onStatusChange?.("open");
          }
          return;
        }

        const json: DealRoomsListResponse = await res.json();

        if (!res.ok || !json?.ok) {
          if (!cancelled) {
            setExistingDealRoomId(null);
            onStatusChange?.("open");
          }
          return;
        }

        const rooms = Array.isArray(json.data) ? json.data : [];
        const matched = rooms.find(
          (room) =>
            !!room?.id &&
            String(room?.opportunity_id || "") === String(opportunityId)
        );

        if (!cancelled) {
          const id = matched?.id || null;
          setExistingDealRoomId(id);
          onStatusChange?.(id ? "engaged" : "open");
        }
      } catch {
        if (!cancelled) {
          setExistingDealRoomId(null);
          onStatusChange?.("open");
        }
      } finally {
        if (!cancelled) {
          setCheckingExisting(false);
        }
      }
    }

    checkExistingDealRoom();

    return () => {
      cancelled = true;
    };
  }, [opportunityId, onStatusChange]);

  useEffect(() => {
    if (!showForm) return;

    if (!proposedAmount && minInvestment && Number(minInvestment) > 0) {
      setProposedAmount(String(minInvestment));
    }
  }, [showForm, minInvestment, proposedAmount]);

  const investmentRangeText = useMemo(() => {
    const minText = formatINR(minInvestment);
    const maxText = formatINR(maxInvestment);

    if (
      minInvestment !== null &&
      minInvestment !== undefined &&
      maxInvestment !== null &&
      maxInvestment !== undefined
    ) {
      return `${minText} – ${maxText}`;
    }

    if (minInvestment !== null && minInvestment !== undefined) {
      return `From ${minText}`;
    }

    if (maxInvestment !== null && maxInvestment !== undefined) {
      return `Up to ${maxText}`;
    }

    return "Not specified";
  }, [minInvestment, maxInvestment]);

  async function handleSubmit() {
    try {
      setSubmitting(true);
      setError("");

      const normalizedProposedAmount = proposedAmount.trim();
      const proposedAmountPayload =
        normalizedProposedAmount && Number(normalizedProposedAmount) > 0
          ? normalizedProposedAmount
          : null;

      const res = await fetch("/api/investment/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          opportunity_id: opportunityId,
          message: note.trim() || null,
          proposed_amount: proposedAmountPayload,
        }),
      });

      const json: ExpressInterestResponse = await res.json();

        if (res.status === 401) {
          const returnTo = encodeURIComponent(window.location.pathname);
          router.push(`/login?next=${returnTo}`);
          return;
        }

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to express interest.");
      }

      if (!json.deal_room_id) {
        throw new Error("Deal room was not created.");
      }

      setExistingDealRoomId(json.deal_room_id);
      onStatusChange?.("engaged");
      setShowForm(false);
      setNote("");
      setProposedAmount("");
      setError("");

      router.push(`/dashboard/investor/deal-rooms/${json.deal_room_id}`);

      router.push(`/dashboard/investor/deal-rooms/${json.deal_room_id}`);
      router.refresh();
      return;
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleGoToDealRoom() {
    if (!existingDealRoomId) return;
    router.push(`/dashboard/investor/deal-rooms/${existingDealRoomId}`);
    router.refresh();
  }

  return (
    <div className="mt-6">
      {checkingExisting ? (
        <div className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-center text-sm font-medium text-slate-500">
          Checking status...
        </div>
      ) : existingDealRoomId ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            You already have an active discussion for this opportunity.
          </div>

          <button
            type="button"
            onClick={handleGoToDealRoom}
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Go to Deal Room
          </button>
        </div>
      ) : !showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Express Interest
        </button>
      ) : (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Express Interest
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              Review the opportunity snapshot below. You can adjust the proposed
              amount before continuing to the deal room.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Investment Range
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {investmentRangeText}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Risk Profile
              </div>
              <div className="mt-1 text-sm font-semibold capitalize text-slate-900">
                {riskLevel || "Not specified"}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Suggested Starting Amount
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {formatINR(minInvestment)}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Expected Holding
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {expectedHoldingMonths
                  ? `${expectedHoldingMonths} months`
                  : "Not specified"}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Proposed Amount (optional)
            </label>
            <input
              type="number"
              min="0"
              value={proposedAmount}
              onChange={(e) => setProposedAmount(e.target.value)}
              placeholder={
                minInvestment ? String(minInvestment) : "e.g. 750000"
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
            <p className="mt-1 text-xs text-slate-500">
              This field is prefilled from the minimum investment when available.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Note (optional)
            </label>
            <textarea
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={`I am interested in ${
                opportunityTitle || "this opportunity"
              } and would like to discuss further.`}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Processing..." : "Continue to Deal Room"}
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setShowForm(false);
                setError("");
                setNote("");
                setProposedAmount("");
              }}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}