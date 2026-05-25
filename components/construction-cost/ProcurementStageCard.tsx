"use client";

import type { ProcurementTimelineStage } from "@/lib/construction-cost/procurement-timeline-engine";

type Props = {
  stage: ProcurementTimelineStage;
  index: number;
};

export default function ProcurementStageCard({
  stage,
  index,
}: Props) {
  const urgencyClass =
    stage.urgency === "high"
      ? "bg-red-100 text-red-800"
      : stage.urgency === "medium"
      ? "bg-amber-100 text-amber-800"
      : "bg-slate-100 text-slate-700";

  return (
    <div className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.16em] text-indigo-700">
            Step {index + 1} • {stage.phase}
          </div>

          <div className="mt-1 text-base font-black text-slate-950">
            {stage.title}
          </div>
        </div>

        <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${urgencyClass}`}>
          {stage.urgency}
        </span>
      </div>

      <div className="mt-3 text-xs font-semibold leading-5 text-slate-600">
        {stage.dependency}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {stage.materials.map((material) => (
          <span
            key={material}
            className="rounded-full bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-800"
          >
            {material}
          </span>
        ))}
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-700">
        Best time: {stage.estimatedWindow}
      </div>

      <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-700 sm:grid-cols-2">
        <div className="rounded-xl bg-emerald-50 p-3">
          <span className="font-black text-emerald-800">Depends on:</span>{" "}
          {stage.dependsOn.length > 0
            ? stage.dependsOn.join(", ")
            : "Can start first"}
        </div>

        <div className="rounded-xl bg-orange-50 p-3">
          <span className="font-black text-orange-800">Blocks:</span>{" "}
          {stage.blocks.length > 0
            ? stage.blocks.join(", ")
            : "No next stage blocked"}
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-indigo-50 p-3 text-xs font-bold text-indigo-800">
        Procurement progress weight: {stage.progressWeight}%
      </div>

      <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-semibold leading-5 text-red-800">
        <span className="font-black">Critical path signal:</span>{" "}
        {stage.progressWeight >= 25 || stage.blocks.length >= 3
          ? "High priority. Delay here can affect multiple next stages."
          : stage.blocks.length > 0
          ? "Medium priority. Keep vendor and material confirmation ready."
          : "Low blocking risk. Can be handled after earlier work is stable."}
      </div>
    </div>
  );
}
