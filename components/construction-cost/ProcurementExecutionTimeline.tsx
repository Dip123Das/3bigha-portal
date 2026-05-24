"use client";

import { useMemo } from "react";

import { calculateProcurementReadiness } from "@/lib/construction-cost/procurement-readiness-engine";
import { generateProcurementTimeline } from "@/lib/construction-cost/procurement-timeline-engine";
import { generateProcurementExecutionInsights } from "@/lib/construction-cost/procurement-execution-engine";
import ProcurementStageCard from "@/components/construction-cost/ProcurementStageCard";

type Props = {
  builtUpAreaSqFt: number;
  floorCount: number;
  estimatedRooms: number;
  estimatedBathrooms: number;
  estimatedKitchenCount: number;
};

export default function ProcurementExecutionTimeline({
  builtUpAreaSqFt,
  floorCount,
  estimatedRooms,
  estimatedBathrooms,
  estimatedKitchenCount,
}: Props) {
  const stages = useMemo(() => generateProcurementTimeline(), []);

const executionInsights = useMemo(
  () => generateProcurementExecutionInsights(stages),
  [stages],
);

  const readiness = useMemo(
    () =>
      calculateProcurementReadiness({
        builtUpAreaSqFt,
        floorCount,
        estimatedRooms,
        estimatedBathrooms,
        estimatedKitchenCount,
      }),
    [
      builtUpAreaSqFt,
      floorCount,
      estimatedRooms,
      estimatedBathrooms,
      estimatedKitchenCount,
    ],
  );

  return (
    <section className="mt-5 rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-indigo-700">
            Procurement Execution Timeline
          </div>

          <div className="mt-1 text-lg font-black text-slate-950">
            What to buy first, next and later
          </div>

          <div className="mt-1 text-sm font-semibold text-slate-600">
            Converts drawing and BOQ intelligence into a simple execution order
            for contractors, builders and procurement teams.
          </div>
        </div>

        <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
          <div className="text-xs font-black uppercase text-slate-500">
            Readiness
          </div>

          <div className="mt-1 text-xl font-black text-indigo-700">
            {readiness.score}%
          </div>

          <div className="text-xs font-bold text-slate-600">
            {readiness.status}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {stages.map((stage, index) => (
          <ProcurementStageCard
            key={stage.key}
            stage={stage}
            index={index}
          />
        ))}
      </div>

      <div className="mt-5 rounded-2xl bg-white p-4">
        <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
          AI Procurement Notes
        </div>

        <ul className="mt-3 space-y-2 text-sm font-semibold leading-6 text-slate-700">
          {readiness.notes.map((note) => (
            <li key={note}>• {note}</li>
          ))}
        </ul>
      </div>

      <div className="mt-5 rounded-2xl border border-indigo-100 bg-white p-4">
        <div className="text-xs font-black uppercase tracking-[0.16em] text-indigo-700">
          Procurement Execution Engine
        </div>

        <div className="mt-1 text-base font-black text-slate-950">
          RFQ, vendor matching, material arrival and risk guidance
        </div>

        <div className="mt-4 grid gap-3">
          {executionInsights.map((insight) => (
            <div
              key={insight.stageKey}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-slate-950">
                    {insight.rfqTitle}
                  </div>

                  <div className="mt-1 text-xs font-bold text-slate-600">
                    {insight.sequenceLabel} • {insight.vendorCategory}
                  </div>
                </div>

                <div className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-800">
                  {insight.commandAction}
                </div>
              </div>

              <div className="mt-3 grid gap-2 text-xs font-semibold leading-5 text-slate-700 sm:grid-cols-2">
                <div className="rounded-xl bg-white p-3">
                  <span className="font-black text-emerald-700">
                    Arrival plan:
                  </span>{" "}
                  {insight.arrivalPlan}
                </div>

                <div className="rounded-xl bg-white p-3">
                  <span className="font-black text-orange-700">
                    Risk warning:
                  </span>{" "}
                  {insight.riskWarning}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
