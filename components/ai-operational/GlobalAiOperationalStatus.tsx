"use client";

import Link from "next/link";

type Props = {
  battlefieldPulse?: string;
  procurementPressure?: string;
  economicStress?: string;
  supplyChainRisk?: string;
  orchestrationState?: string;
};

function getBadgeColor(value?: string) {
  switch (value) {
    case "critical":
    case "critical_alert":
    case "systemic_risk":
    case "market_protection_mode":
      return "bg-red-100 text-red-700 border-red-200";

    case "high_pressure":
    case "stress":
    case "stressed":
    case "overloaded":
      return "bg-orange-100 text-orange-700 border-orange-200";

    case "attention":
    case "strained":
    case "tightening":
    case "repair_needed":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";

    default:
      return "bg-green-100 text-green-700 border-green-200";
  }
}

function Badge({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div
      className={`rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap ${getBadgeColor(
        value
      )}`}
    >
      {label}: {value || "stable"}
    </div>
  );
}

export default function GlobalAiOperationalStatus({
  battlefieldPulse,
  procurementPressure,
  economicStress,
  supplyChainRisk,
  orchestrationState,
}: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-sm font-semibold text-slate-900">
            AI Operational Status
          </div>

          <div className="text-xs text-slate-500 mt-1">
            Live marketplace operational intelligence
          </div>
        </div>

        <Link
          href="/dashboard/procurement-war-room"
          className="text-xs font-medium text-blue-600 hover:text-blue-700"
        >
          Open War Room →
        </Link>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        <Badge
          label="Battlefield"
          value={battlefieldPulse}
        />

        <Badge
          label="Procurement"
          value={procurementPressure}
        />

        <Badge
          label="Economy"
          value={economicStress}
        />

        <Badge
          label="Supply"
          value={supplyChainRisk}
        />

        <Badge
          label="Orchestrator"
          value={orchestrationState}
        />
      </div>
    </div>
  );
}