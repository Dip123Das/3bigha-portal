"use client";

import { useMemo } from "react";

import { calculateProcurementReadiness } from "@/lib/construction-cost/procurement-readiness-engine";
import { generateProcurementTimeline } from "@/lib/construction-cost/procurement-timeline-engine";
import {
  calculateProcurementHealthSummary,
  generateProcurementAutonomousActions,
  generateProcurementExecutionInsights,
} from "@/lib/construction-cost/procurement-execution-engine";
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

  const criticalPathCount = executionInsights.filter(
    (item) => item.criticalPath,
  ).length;

  const highStoppageRiskCount = executionInsights.filter(
    (item) => item.siteStoppageRisk === "high",
  ).length;

  const blockedStageCount = stages.filter(
    (stage) => stage.blocks.length > 0,
  ).length;

  const procurementHealth = useMemo(
    () => calculateProcurementHealthSummary(executionInsights),
    [executionInsights],
  );

  const autonomousActions = useMemo(
    () => generateProcurementAutonomousActions(executionInsights),
    [executionInsights],
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

      <div className="mt-5 rounded-2xl bg-white p-4 shadow-sm">
        <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
          Procurement Health & Delay Forecast
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <div>
            <div className="text-2xl font-black text-emerald-700">
              {procurementHealth.healthScore}%
            </div>
            <div className="text-xs font-bold text-slate-600">
              {procurementHealth.healthStatus}
            </div>
          </div>

          <div>
            <div className="text-2xl font-black text-orange-700">
              {procurementHealth.delayRiskPercent}%
            </div>
            <div className="text-xs font-bold text-slate-600">
              delay risk
            </div>
          </div>

          <div>
            <div className="text-2xl font-black text-red-700">
              {procurementHealth.estimatedTimelineSlipDays}
            </div>
            <div className="text-xs font-bold text-slate-600">
              possible slip days
            </div>
          </div>

          <div className="text-xs font-semibold leading-5 text-slate-700">
            {procurementHealth.recoverySuggestion}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="text-xs font-black uppercase text-slate-500">
            Critical Path
          </div>
          <div className="mt-1 text-2xl font-black text-red-700">
            {criticalPathCount}
          </div>
          <div className="mt-1 text-xs font-bold text-slate-600">
            stages can affect full site schedule
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="text-xs font-black uppercase text-slate-500">
            Blocked Stages
          </div>
          <div className="mt-1 text-2xl font-black text-orange-700">
            {blockedStageCount}
          </div>
          <div className="mt-1 text-xs font-bold text-slate-600">
            stages control next work packages
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="text-xs font-black uppercase text-slate-500">
            Site Stoppage Risk
          </div>
          <div className="mt-1 text-2xl font-black text-indigo-700">
            {highStoppageRiskCount}
          </div>
          <div className="mt-1 text-xs font-bold text-slate-600">
            high-risk procurement stage
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

                <div className="flex flex-wrap gap-2">
                  {insight.criticalPath && (
                    <div className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-800">
                      Critical path
                    </div>
                  )}

                  <div className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-800">
                    {insight.commandAction}
                  </div>
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

                <div className="rounded-xl bg-white p-3 sm:col-span-2">
                  <span className="font-black text-red-700">
                    Delay impact:
                  </span>{" "}
                  {insight.delayImpact} Site stoppage risk:{" "}
                  <span className="font-black uppercase">
                    {insight.siteStoppageRisk}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5 rounded-2xl border border-emerald-100 bg-white p-4">
        <div className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
          Autonomous Procurement Actions
        </div>

        <div className="mt-1 text-base font-black text-slate-950">
          Next actions for site manager, contractor and procurement team
        </div>

        <div className="mt-4 grid gap-3">
          {autonomousActions.length > 0 ? (
            autonomousActions.map((item) => (
              <div
                key={item.key}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-slate-950">
                      {item.title}
                    </div>
                    <div className="mt-1 text-xs font-bold text-slate-600">
                      Owner: {item.owner}
                    </div>
                  </div>

                  <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase text-emerald-800">
                    {item.priority}
                  </div>
                </div>

                <div className="mt-3 rounded-xl bg-white p-3 text-xs font-semibold leading-5 text-slate-700">
                  {item.action}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-600">
              No urgent autonomous action needed now.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
