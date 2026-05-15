"use client";

import { useMemo, useState } from "react";

import { generateConstructionMilestonePlan } from "@/lib/construction-cost/milestone-engine";
import type { ConstructionGrade } from "@/lib/construction-cost/cost-config";
import type {
  ConstructionMilestone,
  ConstructionMilestoneStatus,
} from "@/lib/construction-cost/milestone-types";

type Props = {
  projectId?: string;
  builtUpAreaSqFt: number;
  floorCount?: number;
  grade?: ConstructionGrade;
  roomCount?: number;
  bathroomCount?: number;
  hasInteriorWork?: boolean;
  projectStartDate?: string;
};

function statusClassName(status: ConstructionMilestoneStatus): string {
  if (status === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "in_progress") return "border-blue-200 bg-blue-50 text-blue-800";
  if (status === "delayed") return "border-orange-200 bg-orange-50 text-orange-800";
  if (status === "blocked") return "border-red-200 bg-red-50 text-red-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default function ConstructionMilestoneTracker({
  projectId,
  builtUpAreaSqFt,
  floorCount = 1,
  grade = "standard",
  roomCount,
  bathroomCount,
  hasInteriorWork = false,
  projectStartDate,
}: Props) {
  const plan = useMemo(
    () =>
      generateConstructionMilestonePlan({
        projectId,
        builtUpAreaSqFt,
        floorCount,
        grade,
        roomCount,
        bathroomCount,
        hasInteriorWork,
        projectStartDate,
      }),
    [
      projectId,
      builtUpAreaSqFt,
      floorCount,
      grade,
      roomCount,
      bathroomCount,
      hasInteriorWork,
      projectStartDate,
    ],
  );

  const [milestones, setMilestones] =
    useState<ConstructionMilestone[]>(plan.milestones);

  const overallProgress = Math.round(
    milestones.reduce((sum, item) => sum + item.progressPercent, 0) /
      Math.max(1, milestones.length),
  );

  function updateStatus(key: string, status: ConstructionMilestoneStatus) {
    setMilestones((current) =>
      current.map((item) =>
        item.key === key
          ? {
              ...item,
              status,
              progressPercent:
                status === "completed"
                  ? 100
                  : status === "in_progress"
                    ? Math.max(item.progressPercent, 25)
                    : item.progressPercent,
            }
          : item,
      ),
    );
  }

  function updateProgress(key: string, progressPercent: number) {
    setMilestones((current) =>
      current.map((item) =>
        item.key === key
          ? {
              ...item,
              progressPercent: Math.max(0, Math.min(100, progressPercent)),
              status:
                progressPercent >= 100
                  ? "completed"
                  : progressPercent > 0
                    ? "in_progress"
                    : item.status,
            }
          : item,
      ),
    );
  }

  return (
    <section className="rounded-3xl border border-indigo-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-700">
            AI Milestone Tracker
          </p>

          <h2 className="mt-2 text-2xl font-black text-slate-950">
            Track construction execution progress
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Milestones are generated from the AI construction timeline and can
            be used for progress tracking, delay detection and procurement review.
          </p>
        </div>

        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-4 text-indigo-900">
          <div className="text-xs font-black uppercase">Overall Progress</div>
          <div className="mt-1 text-2xl font-black">{overallProgress}%</div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-indigo-700"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {milestones.map((milestone) => (
          <div
            key={milestone.key}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-sm font-black text-slate-950">
                  {milestone.sequence}. {milestone.title}
                </div>

                <div className="mt-1 text-xs leading-5 text-slate-600">
                  {milestone.description}
                </div>

                <div className="mt-2 text-xs font-bold text-slate-500">
                  {milestone.plannedStartDate} → {milestone.plannedEndDate} •{" "}
                  {milestone.estimatedDays} days
                </div>
              </div>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-black ${statusClassName(
                  milestone.status,
                )}`}
              >
                {milestone.status.replace(/_/g, " ")}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px]">
              <div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={milestone.progressPercent}
                  onChange={(event) =>
                    updateProgress(milestone.key, Number(event.target.value))
                  }
                  className="w-full"
                />

                <div className="mt-1 text-xs font-black text-slate-600">
                  Progress: {milestone.progressPercent}%
                </div>
              </div>

              <select
                value={milestone.status}
                onChange={(event) =>
                  updateStatus(
                    milestone.key,
                    event.target.value as ConstructionMilestoneStatus,
                  )
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
                <option value="delayed">Delayed</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>

            <div className="mt-3 rounded-xl bg-white px-3 py-2 text-xs leading-5 text-slate-600">
              <b>Vendor:</b> {milestone.vendorCategory}
              <br />
              <b>Dependency:</b> {milestone.dependency}
              <br />
              <b>AI note:</b> {milestone.aiRiskNote}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="text-sm font-black text-amber-900">
          Milestone assumptions
        </div>

        <ul className="mt-2 space-y-1 text-xs font-semibold leading-5 text-amber-800">
          {plan.assumptions.slice(0, 4).map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
