"use client";

import type { ConstructionAlert } from "@/lib/construction-cost/construction-alert-engine";

type Props = {
  alerts: ConstructionAlert[];
  loading?: boolean;
};

const severityClass: Record<string, string> = {
  low: "bg-emerald-50 text-emerald-800 border-emerald-100",
  medium: "bg-amber-50 text-amber-800 border-amber-100",
  high: "bg-orange-50 text-orange-800 border-orange-100",
  critical: "bg-red-50 text-red-800 border-red-100",
};

export default function ConstructionAlertsPanel({ alerts, loading = false }: Props) {
  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="font-black text-slate-950">Construction Alerts</div>
        <p className="mt-2 text-sm text-slate-500">Checking AI construction alerts...</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            AI Construction Alerts
          </div>
          <h3 className="mt-1 text-xl font-black text-slate-950">
            Delay & Site Warning Panel
          </h3>
        </div>

        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
          {alerts.length} alert{alerts.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {alerts.length ? (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-2xl border p-4 ${
                severityClass[alert.severity] || severityClass.low
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-black">{alert.title}</div>
                <span className="rounded-full bg-white/70 px-2 py-1 text-[11px] font-black uppercase">
                  {alert.severity}
                </span>
              </div>
              <p className="mt-1 text-sm leading-6">{alert.message}</p>
              <div className="mt-3 rounded-xl bg-white/60 px-3 py-2 text-sm font-semibold">
                {alert.recommendedAction}
              </div>
              <div className="mt-2 text-xs font-bold opacity-80">
                {alert.ownerNotificationRequired ? "Owner notification required" : "Internal monitoring"} ·{" "}
                {alert.automationReady ? "Automation-ready" : "Manual review"}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
            No urgent construction alert detected.
          </div>
        )}
      </div>
    </div>
  );
}
