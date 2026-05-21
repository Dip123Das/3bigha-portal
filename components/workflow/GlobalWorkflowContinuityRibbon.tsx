"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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

function timeAgoLabel(updatedAt: number) {
  const diff = Date.now() - Number(updatedAt || 0);
  const mins = Math.max(0, Math.floor(diff / 60000));

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function buildResumeInsight(workflow: WorkflowState) {
  const q = String(workflow.query || "").toLowerCase();
  const module = String(workflow.module || "all").toLowerCase();
  const ageHours = (Date.now() - Number(workflow.updatedAt || 0)) / 3600000;

  if (ageHours > 48) {
    return {
      urgency: "Follow-up due",
      badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
      insight: "This workflow is aging. Resume it before buyer/vendor momentum drops.",
      primaryLabel: "Resume",
      primaryHref: workflow.href,
    };
  }

  if (/cement|tmt|rod|brick|sand|stone|steel/.test(q) || module === "materials") {
    return {
      urgency: "Procurement active",
      badgeClass: "border-blue-200 bg-blue-50 text-blue-700",
      insight: "Material workflow detected. Best next step: create RFQ or compare nearby suppliers.",
      primaryLabel: "Create RFQ",
      primaryHref: workflow.rfqHref,
    };
  }

  if (/land|plot|flat|house|property/.test(q) || module === "property") {
    return {
      urgency: "Property journey",
      badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
      insight: "Property workflow detected. Continue discovery, then check construction or investment options.",
      primaryLabel: "Resume",
      primaryHref: workflow.href,
    };
  }

  if (/mason|rajmistri|contractor|plumber|electrician/.test(q) || module === "services") {
    return {
      urgency: "Hiring workflow",
      badgeClass: "border-violet-200 bg-violet-50 text-violet-700",
      insight: "Service workflow detected. Compare vendors or create a hiring RFQ.",
      primaryLabel: "Find Vendors",
      primaryHref: workflow.vendorHref,
    };
  }

  if (/jcb|rental|rent|machine/.test(q) || module === "rentals") {
    return {
      urgency: "Rental workflow",
      badgeClass: "border-orange-200 bg-orange-50 text-orange-700",
      insight: "Rental workflow detected. Check availability and vendor response quickly.",
      primaryLabel: "Resume",
      primaryHref: workflow.href,
    };
  }

  return {
    urgency: "Workflow ready",
    badgeClass: "border-slate-200 bg-slate-100 text-slate-700",
    insight: "Resume this marketplace workflow or move it into RFQ, vendor discovery, or price intelligence.",
    primaryLabel: "Resume",
    primaryHref: workflow.href,
  };
}

export default function GlobalWorkflowContinuityRibbon() {
  const pathname = usePathname();
  const [workflow, setWorkflow] = useState<WorkflowState | null>(null);
  const [collapsed, setCollapsed] = useState(false);

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

  const insight = useMemo(
    () => (workflow ? buildResumeInsight(workflow) : null),
    [workflow]
  );

  if (!workflow || pathname?.startsWith("/search") || !insight) return null;

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="fixed bottom-3 right-3 z-[70] rounded-full border border-blue-200 bg-white/95 px-4 py-2 text-xs font-black text-blue-700 shadow-xl backdrop-blur"
      >
        Resume AI Workflow
      </button>
    );
  }

  return (
    <div className="fixed bottom-3 left-3 right-3 z-[70] rounded-2xl border border-blue-200 bg-white/95 p-2.5 shadow-xl backdrop-blur md:left-auto md:right-5 md:w-[500px]">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-[11px] font-black uppercase tracking-[0.14em] text-blue-700">
                AI Resume Intelligence
              </div>

              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${insight.badgeClass}`}
              >
                {insight.urgency}
              </span>

              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                {timeAgoLabel(workflow.updatedAt)}
              </span>
            </div>

            <div className="mt-1 truncate text-xs font-black text-slate-950 md:text-sm">
              {workflow.title}
            </div>

            <div className="mt-1 text-xs font-semibold leading-5 text-slate-500">
              {insight.insight}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black text-slate-500"
          >
            Hide
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto">
          <Link
            href={insight.primaryHref}
            className="rounded-full bg-slate-950 px-3 py-2 text-xs font-black text-white"
          >
            {insight.primaryLabel}
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