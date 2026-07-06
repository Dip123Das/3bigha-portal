// app/dashboard/procurement-memory-intelligence/page.tsx

"use client";

import { useEffect, useState } from "react";
import ProcurementCommandCenterNav from "@/app/components/procurement/ProcurementCommandCenterNav";
import MemoryInsightCard from "@/components/procurement/MemoryInsightCard";

export default function ProcurementMemoryIntelligencePage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/ai/procurement-memory-intelligence")
      .then((r) => r.json())
      .then(setData);
  }, []);

  return (
    <main className="min-h-screen bg-[#f6f7fb] p-6">
      <div className="w-full">
        <div className="overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-950 p-10 text-white shadow-2xl">
          <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-5 py-2 text-xs font-black uppercase tracking-[0.18em]">
            Procurement Memory Intelligence
          </div>

          <h1 className="mt-6 text-5xl font-black">
            AI Procurement Memory System
          </h1>

          <p className="mt-4 max-w-3xl text-base font-medium text-slate-200">
            Autonomous procurement memory graph,
            supplier continuity intelligence and
            workflow context preservation.
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
            Open Work Desk
          </a>

          <a
            href="/dashboard/procurement-negotiation-agent"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800"
          >
            Open Negotiation
          </a>

          <a
            href="/dashboard/procurement-supplier-reliability"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800"
          >
            Open Supplier Overview
          </a>
        </div>

        <div className="mt-8 space-y-6">
          {(data?.memories || []).map((item: any) => (
            <MemoryInsightCard
              key={item.id}
              item={item}
            />
          ))}
        </div>
      </div>
    </main>
  );
}