"use client";

import {
  generateOperationalAlerts,
} from "@/lib/intelligence/operationalHealthEngine";

const levelStyles = {
  info:
    "border-blue-200 bg-blue-50 text-blue-900",

  warning:
    "border-amber-200 bg-amber-50 text-amber-900",

  critical:
    "border-red-200 bg-red-50 text-red-900",
};

export default function OperationalHealthCenter() {

  const alerts =
    generateOperationalAlerts();

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Operational Intelligence
          </div>

          <h3 className="mt-1 text-lg font-black text-slate-950">
            Operational Health Center
          </h3>
        </div>

        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
          Live Alerts
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {alerts.length === 0 ? (
          <div className="rounded-2xl bg-emerald-50 px-4 py-6 text-sm font-semibold text-emerald-800">
            ✓ Operational workflows look healthy.
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-2xl border px-4 py-4 ${levelStyles[alert.level]}`}
            >
              <div className="text-sm font-black">
                {alert.level === "critical"
                  ? "🚨 "
                  : alert.level === "warning"
                  ? "⚠ "
                  : "ℹ "}
                {alert.title}
              </div>

              <div className="mt-2 text-xs leading-5">
                Suggested Action:
                {" "}
                {alert.recommendation}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
        Human-readable workflow health intelligence for construction and procurement continuity.
      </div>
    </section>
  );
}
