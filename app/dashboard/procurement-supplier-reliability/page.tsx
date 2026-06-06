// app/dashboard/procurement-supplier-reliability/page.tsx

"use client";

import { useEffect, useState } from "react";
import ProcurementCommandCenterNav from "@/app/components/procurement/ProcurementCommandCenterNav";
import SupplierReliabilityCard from "@/components/procurement/SupplierReliabilityCard";
import { useMemo } from "react";

export default function ProcurementSupplierReliabilityPage() {
  const [data, setData] = useState<any>(null);

    const [collapseData, setCollapseData] =
    useState<any>(null);

  useEffect(() => {
    fetch("/api/ai/procurement-supplier-reliability")
      .then((r) => r.json())
      .then(setData);

    fetch("/api/ai/procurement-supplier-collapse")
      .then((r) => r.json())
      .then(setCollapseData);
  }, []);

    const collapseSuppliers = Array.isArray(
    collapseData?.suppliers
  )
    ? collapseData.suppliers
    : [];

  const criticalSuppliers = useMemo(() => {
    return collapseSuppliers.filter(
      (item: any) =>
        item.risk === "Critical"
    );
  }, [collapseSuppliers]);

  return (
    <main className="min-h-screen bg-[#f6f7fb] p-6">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-slate-950 via-emerald-950 to-blue-950 p-10 text-white shadow-2xl">
          <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-5 py-2 text-xs font-black uppercase tracking-[0.18em]">
            Supplier Reliability Intelligence
          </div>

          <h1 className="mt-6 text-5xl font-black">
            AI Supplier Reliability Engine
          </h1>

          <p className="mt-4 max-w-3xl text-base font-medium text-slate-200">
            Autonomous supplier reliability analysis,
            procurement continuity intelligence and
            vendor operational risk monitoring.
          </p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/10 px-6 py-4 text-sm font-bold text-slate-100">
            {data?.executiveDirective}
          </div>
        </div>

        <div className="mt-8">
          <ProcurementCommandCenterNav />
        </div>

                <div className="mt-8 proc-shell-xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-950">
                AI Supplier Collapse Predictor
              </h2>

              <p className="mt-1 text-sm font-semibold text-slate-500">
                Autonomous supplier silence, overload and collapse-risk forecasting.
              </p>
            </div>

            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-black text-rose-700">
              Critical Suppliers: {criticalSuppliers.length}
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {collapseSuppliers.map((item: any) => (
              <div
                key={item.id}
                className="proc-shell-muted"
              >
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${
                      item.risk === "Critical"
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : item.risk === "High"
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-blue-200 bg-blue-50 text-blue-700"
                    }`}
                  >
                    {item.risk}
                  </span>
                </div>

                <div className="mt-4 text-2xl font-black text-slate-950">
                  {item.supplier}
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <RiskStat
                    label="Collapse"
                    value={item.collapseRisk}
                  />

                  <RiskStat
                    label="Silence"
                    value={item.silenceRisk}
                  />

                  <RiskStat
                    label="Overload"
                    value={item.overloadRisk}
                  />
                </div>

                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                  {item.emergencyAction}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="/dashboard/procurement-mission-control"
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            Open Work Desk
          </a>

          <a
            href="/dashboard/procurement-inbox-actions"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800"
          >
            Open Inbox Help
          </a>

          <a
            href="/dashboard/procurement-negotiation-agent"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800"
          >
            Open Negotiation
          </a>
        </div>

        <div className="mt-8 space-y-6">
          {(data?.suppliers || []).map((item: any) => (
            <SupplierReliabilityCard
              key={item.id}
              item={item}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
function RiskStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>

      <div className="mt-2 text-3xl font-black text-slate-950">
        {value}
      </div>
    </div>
  );
}