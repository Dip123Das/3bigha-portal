// app/dashboard/procurement-supplier-reliability/page.tsx

"use client";

import { useEffect, useState } from "react";
import ProcurementCommandCenterNav from "@/app/components/procurement/ProcurementCommandCenterNav";
import SupplierReliabilityCard from "@/components/procurement/SupplierReliabilityCard";

export default function ProcurementSupplierReliabilityPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/ai/procurement-supplier-reliability")
      .then((r) => r.json())
      .then(setData);
  }, []);

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

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="/dashboard/procurement-mission-control"
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            Open Mission Control
          </a>

          <a
            href="/dashboard/procurement-inbox-actions"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800"
          >
            Open Inbox AI
          </a>

          <a
            href="/dashboard/procurement-negotiation-agent"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800"
          >
            Open Negotiation AI
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