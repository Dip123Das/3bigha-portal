// app/dashboard/procurement-inbox-actions/page.tsx

"use client";

import { useEffect, useState } from "react";
import ProcurementCommandCenterNav from "@/app/components/procurement/ProcurementCommandCenterNav";
import ProcurementInboxActionCard from "@/components/procurement/ProcurementInboxActionCard";

export default function ProcurementInboxActionsPage() {
  const [data, setData] = useState<any>(null);

    const [rerouting, setRerouting] =
    useState<any>(null);

  useEffect(() => {
    fetch("/api/ai/procurement-inbox-actions")
      .then((r) => r.json())
      .then(setData);

    fetch("/api/ai/procurement-emergency-rerouting")
      .then((r) => r.json())
      .then(setRerouting);
  }, []);

  return (
    <main className="min-h-screen bg-[#f6f7fb] p-6">
      <div className="w-full">
        <div className="overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-slate-950 via-violet-950 to-indigo-950 p-10 text-white shadow-2xl">
          <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-5 py-2 text-xs font-black uppercase tracking-[0.18em]">
            Autonomous Inbox Execution Workspace
          </div>

          <h1 className="mt-6 text-5xl font-black">
            AI Procurement Inbox Actions
          </h1>

          <p className="mt-4 max-w-3xl text-base font-medium text-slate-200">
            Autonomous procurement conversation execution,
            inbox recovery, escalation and workflow
            acceleration intelligence.
          </p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/10 px-6 py-4 text-sm font-bold text-slate-100">
            {data?.executiveDirective}
          </div>
        </div>

        <div className="mt-8">
          <ProcurementCommandCenterNav />
        </div>

                <div className="mt-8 rounded-[2rem] border border-rose-200 bg-rose-50 p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-black text-rose-900">
                Emergency Procurement Rerouting Engine
              </h2>

              <p className="mt-1 text-sm font-semibold text-rose-700">
                Autonomous supplier replacement and backup procurement routing.
              </p>
            </div>

            <div className="rounded-2xl border border-white bg-white px-5 py-3 text-sm font-black text-rose-700">
              Active Reroutes: {(rerouting?.routes || []).length}
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {(rerouting?.routes || []).map((item: any) => (
              <div
                key={item.id}
                className="rounded-[1.5rem] border border-white bg-white p-5"
              >
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${
                      item.severity === "Critical"
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : item.severity === "High"
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-blue-200 bg-blue-50 text-blue-700"
                    }`}
                  >
                    {item.severity}
                  </span>

                  <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700">
                    {item.backupZone}
                  </span>
                </div>

                <div className="mt-4 text-xl font-black text-slate-950">
                  {item.category}
                </div>

                <div className="mt-4 grid gap-3">
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                    <div className="text-xs font-black uppercase tracking-[0.14em] text-rose-600">
                      Failed Supplier
                    </div>

                    <div className="mt-2 text-lg font-black text-rose-800">
                      {item.failedSupplier}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="text-xs font-black uppercase tracking-[0.14em] text-emerald-600">
                      Backup Supplier
                    </div>

                    <div className="mt-2 text-lg font-black text-emerald-800">
                      {item.backupSupplier}
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                  {item.estimatedRecovery}
                </div>

                <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
                  🤖 {item.aiAction}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="/dashboard/procurement-followup-agent"
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            Open Follow-up AI
          </a>

          <a
            href="/dashboard/procurement-mission-control"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800"
          >
            Open Work Desk
          </a>
        </div>

        <div className="mt-8 space-y-6">
          {(data?.actions || []).map((item: any) => (
            <ProcurementInboxActionCard
              key={item.id}
              item={item}
            />
          ))}
        </div>
      </div>
    </main>
  );
}