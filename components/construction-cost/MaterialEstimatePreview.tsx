"use client";

import { useMemo } from "react";

import { estimateConstructionMaterials } from "@/lib/construction-cost/material-estimator";
import type { ConstructionGrade } from "@/lib/construction-cost/cost-config";

type Props = {
  builtUpAreaSqFt: number;
  floorCount?: number;
  grade?: ConstructionGrade;
};

export default function MaterialEstimatePreview({
  builtUpAreaSqFt,
  floorCount = 1,
  grade = "standard",
}: Props) {
  const estimate = useMemo(
    () =>
      estimateConstructionMaterials({
        builtUpAreaSqFt,
        floorCount,
        grade,
      }),
    [builtUpAreaSqFt, floorCount, grade],
  );

  return (
    <section className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
          AI Material Quantity Estimate
        </p>

        <h2 className="mt-2 text-2xl font-black text-slate-950">
          Approximate materials for your construction
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Based on {estimate.builtUpAreaSqFt} sq.ft, {estimate.floorCount} floor
          {estimate.floorCount > 1 ? "s" : ""}, {estimate.grade} grade.
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {estimate.items.map((item) => (
          <div
            key={item.key}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
          >
            <div className="text-xs font-black uppercase text-slate-500">
              {item.label}
            </div>

            <div className="mt-2 text-xl font-black text-slate-950">
              {item.quantity.toLocaleString("en-IN")} {item.unit}
            </div>

            <p className="mt-2 text-xs leading-5 text-slate-600">
              {item.note}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="text-sm font-black text-amber-900">
          Important assumption
        </div>

        <ul className="mt-2 space-y-1 text-xs font-semibold leading-5 text-amber-800">
          {estimate.assumptions.slice(0, 3).map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}