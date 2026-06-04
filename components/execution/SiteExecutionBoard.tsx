"use client";

import {
  loadSiteExecution,
  updateSiteStage,
  type SiteExecutionStage,
} from "@/lib/execution/siteExecutionMemory";

import { useEffect, useState } from "react";

const STAGES: Array<{
  id: SiteExecutionStage;
  label: string;
}> = [
  {
    id: "land_ready",
    label: "Land Ready",
  },
  {
    id: "foundation",
    label: "Foundation",
  },
  {
    id: "column_casting",
    label: "Column Casting",
  },
  {
    id: "brick_work",
    label: "Brick Work",
  },
  {
    id: "roof_casting",
    label: "Roof Casting",
  },
  {
    id: "electrical",
    label: "Electrical",
  },
  {
    id: "plumbing",
    label: "Plumbing",
  },
  {
    id: "plaster",
    label: "Plaster",
  },
  {
    id: "flooring",
    label: "Flooring",
  },
  {
    id: "painting",
    label: "Painting",
  },
  {
    id: "completed",
    label: "Project Completed",
  },
];

export default function SiteExecutionBoard() {
  const [items, setItems] = useState(
    loadSiteExecution()
  );

  useEffect(() => {
    setItems(loadSiteExecution());
  }, []);

  function getStatus(
    stage: SiteExecutionStage
  ) {
    return (
      items.find(
        (x) => x.stage === stage
      )?.status || "pending"
    );
  }

  function cycleStage(
    stage: SiteExecutionStage
  ) {
    const current =
      getStatus(stage);

    const next =
      current === "pending"
        ? "running"
        : current === "running"
        ? "completed"
        : "pending";

    updateSiteStage(stage, next);

    setItems(loadSiteExecution());
  }

  return (
    <section className="rounded-3xl border border-blue-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-blue-700">
            Site Execution
          </div>

          <h3 className="mt-1 text-lg font-black text-slate-950">
            Construction Progress
          </h3>
        </div>

        <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">
          Live Workflow
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {STAGES.map((stage) => {
          const status =
            getStatus(stage.id);

          return (
            <button
              key={stage.id}
              type="button"
              onClick={() =>
                cycleStage(stage.id)
              }
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                status === "completed"
                  ? "border-emerald-200 bg-emerald-50"
                  : status === "running"
                  ? "border-blue-200 bg-blue-50"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="text-sm font-bold text-slate-900">
                {status === "completed"
                  ? "✓ "
                  : status === "running"
                  ? "• "
                  : "○ "}
                {stage.label}
              </div>

              <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {status}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
        Simple human-readable construction execution continuity.
        Tap stages to update operational progress.
      </div>
    </section>
  );
}
