"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type WorkflowState = {
  query: string;
  module: string;
  stage: string;
  title: string;
  href: string;
  rfqHref: string;
  vendorHref: string;
  priceHref: string;
  updatedAt: number;
};

export default function GlobalWorkflowContinuityRibbon() {
  const [workflow, setWorkflow] = useState<WorkflowState | null>(null);

  useEffect(() => {
    function readWorkflow() {
      try {
        const raw = window.localStorage.getItem("3bigha_active_workflow");
        if (!raw) {
          setWorkflow(null);
          return;
        }

        const parsed = JSON.parse(raw) as WorkflowState;
        const ageMs = Date.now() - Number(parsed.updatedAt || 0);

        if (!parsed.query || ageMs > 7 * 24 * 60 * 60 * 1000) {
          window.localStorage.removeItem("3bigha_active_workflow");
          setWorkflow(null);
          return;
        }

        setWorkflow(parsed);
      } catch {
        setWorkflow(null);
      }
    }

    readWorkflow();
    window.addEventListener("storage", readWorkflow);
    window.addEventListener("focus", readWorkflow);

    return () => {
      window.removeEventListener("storage", readWorkflow);
      window.removeEventListener("focus", readWorkflow);
    };
  }, []);

  if (!workflow) return null;

  return (
    <div className="fixed bottom-3 left-3 right-3 z-[70] rounded-2xl border border-blue-200 bg-white/95 p-3 shadow-2xl backdrop-blur md:left-auto md:right-5 md:w-[520px]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="text-[11px] font-black uppercase tracking-[0.14em] text-blue-700">
            AI Workflow Continuity
          </div>
          <div className="mt-1 truncate text-sm font-black text-slate-950">
            {workflow.title}
          </div>
          <div className="mt-1 text-xs font-semibold text-slate-500">
            Stage: {workflow.stage} • Module: {workflow.module}
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto">
          <Link href={workflow.href} className="rounded-full bg-slate-950 px-3 py-2 text-xs font-black text-white">
            Resume
          </Link>
          <Link href={workflow.rfqHref} className="rounded-full bg-blue-600 px-3 py-2 text-xs font-black text-white">
            RFQ
          </Link>
          <Link href={workflow.vendorHref} className="rounded-full bg-emerald-600 px-3 py-2 text-xs font-black text-white">
            Vendors
          </Link>
          <Link href={workflow.priceHref} className="rounded-full bg-violet-600 px-3 py-2 text-xs font-black text-white">
            Price
          </Link>
        </div>
      </div>
    </div>
  );
}