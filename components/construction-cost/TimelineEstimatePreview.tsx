"use client";

import { useMemo } from "react";

import { estimateConstructionTimeline } from "@/lib/construction-cost/timeline-estimator";
import type { ConstructionGrade } from "@/lib/construction-cost/cost-config";

type Props = {
  builtUpAreaSqFt: number;
  floorCount?: number;
  grade?: ConstructionGrade;
  roomCount?: number;
  bathroomCount?: number;
  hasInteriorWork?: boolean;
};

function riskClassName(risk: string): string {
  if (risk === "high") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (risk === "medium") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

export default function TimelineEstimatePreview({
  builtUpAreaSqFt,
  floorCount = 1,
  grade = "standard",
  roomCount,
  bathroomCount,
  hasInteriorWork = false,
}: Props) {
  const timeline = useMemo(
    () =>
      estimateConstructionTimeline({
        builtUpAreaSqFt,
        floorCount,
        grade,
        roomCount,
        bathroomCount,
        hasInteriorWork,
      }),
    [
      builtUpAreaSqFt,
      floorCount,
      grade,
      roomCount,
      bathroomCount,
      hasInteriorWork,
    ],
  );

  return (
    <section className="rounded-3xl border border-purple-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-purple-700">
            AI Construction Timeline
          </p>

          <h2 className="mt-2 text-2xl font-black text-slate-950">
            Estimated project completion timeline
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Based on {timeline.builtUpAreaSqFt} sq.ft, {timeline.floorCount} floor
            {timeline.floorCount > 1 ? "s" : ""}, {timeline.roomCount} rooms,{" "}
            {timeline.bathroomCount} bathrooms and {timeline.grade} grade.
          </p>
        </div>

        <div className="rounded-2xl border border-purple-200 bg-purple-50 px-5 py-4 text-purple-900">
          <div className="text-xs font-black uppercase">Total Duration</div>
          <div className="mt-1 text-2xl font-black">
            {timeline.totalEstimatedWeeks} weeks
          </div>
          <div className="text-xs font-bold">
            approx {timeline.totalEstimatedDays} days
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {timeline.phases.map((phase) => (
          <div
            key={phase.key}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-sm font-black text-slate-950">
                  {phase.sequence}. {phase.label}
                </div>

                <div className="mt-1 text-xs leading-5 text-slate-600">
                  {phase.description}
                </div>

                <div className="mt-2 text-xs font-bold text-slate-500">
                  Dependency: {phase.dependency}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 sm:justify-end">
                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-800">
                  {phase.estimatedDays} days
                </span>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-black ${riskClassName(
                    phase.riskLevel,
                  )}`}
                >
                  {phase.riskLevel} risk
                </span>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-white bg-white px-3 py-2 text-xs leading-5 text-slate-600">
              <b className="text-slate-800">Vendor:</b> {phase.vendorCategory}
              <br />
              <b className="text-slate-800">Note:</b> {phase.note}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="text-sm font-black text-amber-900">
          Timeline assumptions
        </div>

        <ul className="mt-2 space-y-1 text-xs font-semibold leading-5 text-amber-800">
          {timeline.assumptions.slice(0, 4).map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}