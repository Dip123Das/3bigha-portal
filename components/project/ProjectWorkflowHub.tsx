"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  clearProjectWorkflow,
  loadProjectWorkflow,
  type ProjectWorkflowData,
  type ProjectWorkflowStage,
} from "@/lib/project/projectWorkflowMemory";

const STAGE_LABELS: Record<ProjectWorkflowStage, string> = {
  "land-calculation": "Area Calculated",
  "construction-estimation": "Cost Estimated",
  "material-planning": "Material Planning",
  rfq: "RFQ",
  "vendor-selection": "Vendor Selection",
  procurement: "Procurement",
  execution: "Execution",
};

const STAGE_ORDER: ProjectWorkflowStage[] = [
  "land-calculation",
  "construction-estimation",
  "material-planning",
  "rfq",
  "vendor-selection",
  "procurement",
  "execution",
];

function formatNumber(value?: number) {
  if (!value || !Number.isFinite(value)) return "Not set";
  return value.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function getNextHref(workflow: ProjectWorkflowData) {
  const params = new URLSearchParams({
    area: String(Math.round(workflow.areaSqft || 0)),
    unit: "sqft",
    state: workflow.state || "",
    district: workflow.district || "",
    source: "project-workflow-hub",
  });

  if (workflow.currentStage === "land-calculation") {
    return `/construction-cost?${params.toString()}`;
  }

  if (workflow.currentStage === "construction-estimation") {
    return `/materials/rfq/new?${params.toString()}`;
  }

  if (workflow.currentStage === "material-planning") {
    return `/materials/rfq/new?${params.toString()}`;
  }

  if (workflow.currentStage === "rfq") {
    return `/dashboard/buyer/rfqs`;
  }

  if (workflow.currentStage === "vendor-selection") {
    return `/search?module=materials&q=construction materials`;
  }

  if (workflow.currentStage === "procurement") {
    return `/dashboard/procurement-os`;
  }

  return `/dashboard/construction-projects`;
}

function getNextAction(workflow: ProjectWorkflowData) {
  if (workflow.currentStage === "land-calculation") return "Estimate construction cost";
  if (workflow.currentStage === "construction-estimation") return "Generate material RFQ";
  if (workflow.currentStage === "material-planning") return "Create RFQ";
  if (workflow.currentStage === "rfq") return "Review RFQs";
  if (workflow.currentStage === "vendor-selection") return "Find vendors";
  if (workflow.currentStage === "procurement") return "Open procurement";
  return "Open project dashboard";
}

export default function ProjectWorkflowHub() {
  const [workflow, setWorkflow] = useState<ProjectWorkflowData | null>(null);

  useEffect(() => {
    setWorkflow(loadProjectWorkflow());

    const onStorage = () => setWorkflow(loadProjectWorkflow());
    window.addEventListener("storage", onStorage);

    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const progress = useMemo(() => {
    if (!workflow) return 0;
    const completed = new Set(workflow.completedStages);
    return Math.round((completed.size / STAGE_ORDER.length) * 100);
  }, [workflow]);

  if (!workflow) return null;

  return (
    <section className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-emerald-700">
            Continue Project
          </div>
          <h3 className="mt-1 text-lg font-black text-slate-950">
            {workflow.title}
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {formatNumber(workflow.areaSqft)} sqft · {workflow.district || "District not set"} · {workflow.state || "State not set"}
          </p>
        </div>

        <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
          {progress}% workflow ready
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-600"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {STAGE_ORDER.slice(0, 4).map((stage) => {
          const done = workflow.completedStages.includes(stage);
          const active = workflow.currentStage === stage;

          return (
            <div
              key={stage}
              className={`rounded-2xl border px-3 py-2 text-xs font-bold ${
                done
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : active
                  ? "border-blue-200 bg-blue-50 text-blue-800"
                  : "border-slate-200 bg-slate-50 text-slate-500"
              }`}
            >
              {done ? "✓ " : active ? "• " : "○ "}
              {STAGE_LABELS[stage]}
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <Link
          href={getNextHref(workflow)}
          className="rounded-2xl bg-slate-950 px-4 py-3 text-center text-sm font-bold text-white hover:bg-slate-800"
        >
          {getNextAction(workflow)}
        </Link>

        <button
          type="button"
          onClick={() => {
            clearProjectWorkflow();
            setWorkflow(null);
          }}
          className="rounded-2xl border px-4 py-3 text-sm font-bold text-slate-600 hover:border-red-300 hover:text-red-700"
        >
          Clear
        </button>
      </div>
    </section>
  );
}
