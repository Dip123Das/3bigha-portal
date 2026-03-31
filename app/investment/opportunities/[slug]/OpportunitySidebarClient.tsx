"use client";

import { useState } from "react";
import ExpressInterestButton from "@/app/components/investment/ExpressInterestButton";

type Props = {
  opportunityId: string;
  title: string;
  visibility?: string | null;
  location?: string | null;
  minInvestment?: number | null;
  maxInvestment?: number | null;
  expectedHoldingMonths?: number | null;
  riskLevel?: string | null;
  builderName?: string | null;
  builderRole?: string | null;
  builderActiveOpportunities?: number;
  builderActiveDealRooms?: number;
};

function StatusPill({ status }: { status: "checking" | "open" | "engaged" }) {
  if (status === "checking") {
    return (
      <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
        Checking Status...
      </span>
    );
  }

  if (status === "engaged") {
    return (
      <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
        Already Engaged
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
      Open for Interest
    </span>
  );
}

function InitialBadge({ name }: { name?: string | null }) {
  const first = (name || "B").trim().charAt(0).toUpperCase() || "B";

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white shadow-sm">
      {first}
    </div>
  );
}

export default function OpportunitySidebarClient({
  opportunityId,
  title,
  visibility,
  location,
  minInvestment,
  maxInvestment,
  expectedHoldingMonths,
  riskLevel,
  builderName,
  builderRole,
  builderActiveOpportunities = 0,
  builderActiveDealRooms = 0,
}: Props) {
  const [status, setStatus] = useState<"checking" | "open" | "engaged">(
    "checking"
  );

  return (
    <div className="space-y-6 lg:sticky lg:top-24">
      <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#0f172a,#1e293b)] p-5 text-white">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                Live Status
              </div>
              <h2 className="mt-1 text-lg font-semibold">Investment Snapshot</h2>
            </div>
            <StatusPill status={status} />
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-1 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Risk Profile
              </div>
              <div className="mt-1 text-sm font-semibold capitalize text-slate-900">
                {riskLevel || "medium"}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Location
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {location || "Not specified"}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Public Visibility
              </div>
              <div className="mt-1 text-sm font-semibold capitalize text-slate-900">
                {visibility || "public"}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
            <p className="text-sm leading-6 text-slate-600">
              Express interest to open or continue a secure deal room discussion
              for this opportunity.
            </p>
          </div>

          <ExpressInterestButton
            opportunityId={opportunityId}
            opportunityTitle={title}
            minInvestment={minInvestment}
            maxInvestment={maxInvestment}
            expectedHoldingMonths={expectedHoldingMonths}
            riskLevel={riskLevel}
            onStatusChange={setStatus}
          />

          <p className="text-center text-xs text-slate-500">
            Applications and deal room access are handled automatically.
          </p>
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <InitialBadge name={builderName} />
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Builder Credibility
            </div>
            <h3 className="mt-1 truncate text-lg font-semibold text-slate-950">
              {builderName || "Builder"}
            </h3>
            <div className="mt-2 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
              {builderRole || "builder"}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Active Opportunities
            </div>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              {builderActiveOpportunities}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Active Deal Rooms
            </div>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              {builderActiveDealRooms}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
          <p className="text-sm leading-6 text-slate-600">
            This is an early credibility snapshot. Continue due diligence inside
            the secure deal room before making any investment commitment.
          </p>
        </div>
      </div>
    </div>
  );
}