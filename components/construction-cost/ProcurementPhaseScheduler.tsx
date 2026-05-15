"use client";

import { useMemo, useState } from "react";

import { generateProcurementPhaseSchedule } from "@/lib/construction-cost/procurement-phase-engine";
import type { ConstructionGrade } from "@/lib/construction-cost/cost-config";
import type { ProcurementTriggerPriority } from "@/lib/construction-cost/procurement-phase-types";

type Props = {
  builtUpAreaSqFt: number;
  floorCount?: number;
  grade?: ConstructionGrade;
  roomCount?: number;
  bathroomCount?: number;
  hasInteriorWork?: boolean;
};

function priorityClassName(priority: ProcurementTriggerPriority): string {
  if (priority === "critical") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (priority === "high") {
    return "border-orange-200 bg-orange-50 text-orange-800";
  }

  if (priority === "medium") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function todayDateInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ProcurementPhaseScheduler({
  builtUpAreaSqFt,
  floorCount = 1,
  grade = "standard",
  roomCount,
  bathroomCount,
  hasInteriorWork = false,
}: Props) {
  const [projectStartDate, setProjectStartDate] = useState(todayDateInputValue());

  const schedule = useMemo(
    () =>
      generateProcurementPhaseSchedule({
        builtUpAreaSqFt,
        floorCount,
        grade,
        roomCount,
        bathroomCount,
        hasInteriorWork,
        projectStartDate,
      }),
    [
      builtUpAreaSqFt,
      floorCount,
      grade,
      roomCount,
      bathroomCount,
      hasInteriorWork,
      projectStartDate,
    ],
  );

  return (
    <section className="rounded-3xl border border-cyan-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">
            AI Procurement Phase Scheduler
          </p>

          <h2 className="mt-2 text-2xl font-black text-slate-950">
            Convert construction timeline into procurement triggers
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Automatically plan when to trigger materials, services, rentals and inspection RFQs.
          </p>
        </div>

        <label className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
          <div className="text-xs font-black uppercase text-cyan-800">
            Project Start Date
          </div>

          <input
            type="date"
            value={projectStartDate}
            onChange={(event) => setProjectStartDate(event.target.value)}
            className="mt-2 w-full rounded-xl border border-cyan-200 bg-white px-3 py-2 text-sm font-bold text-slate-950 outline-none"
          />
        </label>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-black uppercase text-slate-500">
            Project Start
          </div>
          <div className="mt-2 text-lg font-black text-slate-950">
            {schedule.projectStartDate}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-black uppercase text-slate-500">
            Estimated Completion
          </div>
          <div className="mt-2 text-lg font-black text-slate-950">
            {schedule.estimatedCompletionDate}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-black uppercase text-slate-500">
            Procurement Triggers
          </div>
          <div className="mt-2 text-lg font-black text-slate-950">
            {schedule.triggers.length}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {schedule.triggers.map((trigger) => (
          <div
            key={`${trigger.phaseKey}-${trigger.title}-${trigger.triggerDate}`}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-sm font-black text-slate-950">
                  {trigger.title}
                </div>

                <div className="mt-1 text-xs leading-5 text-slate-600">
                  {trigger.description}
                </div>

                <div className="mt-2 text-xs font-bold text-slate-500">
                  Trigger on {trigger.triggerDate} • Phase starts {trigger.phaseStartDate}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 sm:justify-end">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-black ${priorityClassName(
                    trigger.priority,
                  )}`}
                >
                  {trigger.priority}
                </span>

                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-800">
                  {trigger.rfqCategory}
                </span>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-white bg-white px-3 py-2 text-xs leading-5 text-slate-600">
              <b className="text-slate-800">Vendor:</b> {trigger.vendorCategory}
              <br />
              <b className="text-slate-800">RFQ:</b> {trigger.rfqReadyName}
              <br />
              <b className="text-slate-800">Note:</b> {trigger.note}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="text-sm font-black text-amber-900">
          Procurement assumptions
        </div>

        <ul className="mt-2 space-y-1 text-xs font-semibold leading-5 text-amber-800">
          {schedule.assumptions.slice(0, 4).map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}