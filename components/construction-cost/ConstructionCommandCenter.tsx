"use client";

import type { ConstructionCommandCenter as ConstructionCommandCenterType } from "@/lib/construction-cost/construction-command-center";

type Props = {
  commandCenter: ConstructionCommandCenterType | null;
  loading?: boolean;
};

export default function ConstructionCommandCenter({ commandCenter, loading = false }: Props) {
  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="font-black text-slate-950">AI Construction Operations</div>
        <p className="mt-2 text-sm text-slate-500">Loading construction command intelligence...</p>
      </div>
    );
  }

  if (!commandCenter) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="font-black text-slate-950">AI Construction Operations</div>
        <p className="mt-2 text-sm text-slate-500">No command data available.</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            AI Construction Operations
          </div>
          <h3 className="mt-1 text-xl font-black text-slate-950">
            Work Desk
          </h3>
        </div>

        <div className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black uppercase text-white">
          {commandCenter.missionStatus.replaceAll("_", " ")}
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-700">
        {commandCenter.commandSummary}
      </p>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 p-4">
          <div className="text-2xl font-black">{commandCenter.alertsCount}</div>
          <div className="text-xs font-bold uppercase text-slate-500">Alerts</div>
        </div>
        <div className="rounded-2xl border border-slate-100 p-4">
          <div className="text-2xl font-black">{commandCenter.urgentAlertsCount}</div>
          <div className="text-xs font-bold uppercase text-slate-500">Urgent</div>
        </div>
        <div className="rounded-2xl border border-slate-100 p-4">
          <div className="text-sm font-black capitalize">
            {commandCenter.materialReadiness.replaceAll("_", " ")}
          </div>
          <div className="text-xs font-bold uppercase text-slate-500">Material</div>
        </div>
        <div className="rounded-2xl border border-slate-100 p-4">
          <div className="text-2xl font-black">{commandCenter.verificationConfidence}%</div>
          <div className="text-xs font-bold uppercase text-slate-500">Verification</div>
        </div>
      </div>

      <div className="mt-5">
        <div className="text-sm font-black text-slate-900">Command actions</div>
        <div className="mt-3 space-y-2">
          {commandCenter.commandActions.length ? (
            commandCenter.commandActions.map((action) => (
              <div key={action} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                {action}
              </div>
            ))
          ) : (
            <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              No urgent command action required.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
