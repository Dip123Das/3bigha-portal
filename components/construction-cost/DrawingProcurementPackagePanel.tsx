"use client";

import { useMemo } from "react";

import {
  generateProcurementPackages,
} from "@/lib/construction-cost/procurement-package-engine";
import ProcurementPriorityBadge from "@/components/construction-cost/ProcurementPriorityBadge";

type Props = {
  builtUpAreaSqFt: number;
  floorCount: number;
  estimatedRooms: number;
  estimatedBathrooms: number;
  estimatedKitchenCount: number;
  drawingType: string;
};

export default function DrawingProcurementPackagePanel({
  builtUpAreaSqFt,
  floorCount,
  estimatedRooms,
  estimatedBathrooms,
  estimatedKitchenCount,
  drawingType,
}: Props) {
  const packages = useMemo(
    () =>
      generateProcurementPackages({
        builtUpAreaSqFt,
        floorCount,
        estimatedRooms,
        estimatedBathrooms,
        estimatedKitchenCount,
        drawingType,
      }),
    [
      builtUpAreaSqFt,
      floorCount,
      estimatedRooms,
      estimatedBathrooms,
      estimatedKitchenCount,
      drawingType,
    ],
  );

  return (
    <section className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">
            AI Procurement Package
          </div>

          <div className="mt-1 text-lg font-black text-slate-950">
            Drawing-based vendor package planning
          </div>

          <div className="mt-1 text-sm font-semibold text-slate-600">
            Converts drawing intelligence into material groups, vendor categories
            and RFQ-ready procurement packages.
          </div>
        </div>

        <div className="rounded-full bg-white px-4 py-2 text-xs font-black text-cyan-800 shadow-sm">
          {packages.filter((item) => item.rfqReady).length} RFQ-ready groups
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {packages.map((item) => (
          <div
            key={item.key}
            className="rounded-2xl border border-cyan-100 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-base font-black text-slate-950">
                  {item.title}
                </div>

                <div className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-cyan-700">
                  {item.vendorCategory}
                </div>
              </div>

              <ProcurementPriorityBadge priority={item.priority} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {item.materials.map((material) => (
                <span
                  key={material}
                  className="rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700"
                >
                  {material}
                </span>
              ))}
            </div>

            <div className="mt-4 rounded-xl bg-cyan-50 p-3 text-xs font-semibold leading-5 text-slate-700">
              {item.note}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
