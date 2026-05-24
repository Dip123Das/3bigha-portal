"use client";

import { useState } from "react";

import {
  generateBoqFromDrawing,
} from "@/lib/construction-cost/drawing-boq-generator";

type Props = {
  builtUpAreaSqFt: number;
  floorCount: number;
  drawingType: string;
  estimatedRooms: number;
  estimatedBathrooms: number;
  estimatedKitchenCount: number;
};

export default function GenerateDrawingBoqButton({
  builtUpAreaSqFt,
  floorCount,
  drawingType,
  estimatedRooms,
  estimatedBathrooms,
  estimatedKitchenCount,
}: Props) {
  const [open, setOpen] = useState(false);

  const boq = generateBoqFromDrawing({
    builtUpAreaSqFt,
    floorCount,
    drawingType,
    estimatedRooms,
    estimatedBathrooms,
    estimatedKitchenCount,
  });

  return (
    <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
            Drawing → BOQ Action
          </div>

          <div className="mt-1 text-lg font-black text-slate-950">
            Generate BOQ from drawing intelligence
          </div>

          <div className="mt-1 text-sm font-semibold text-slate-600">
            Uses detected rooms, bathrooms, kitchens and floor count to prepare
            an RFQ-ready BOQ package.
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700"
        >
          {open ? "Hide BOQ Draft" : "Generate BOQ from Drawing"}
        </button>
      </div>

      {open ? (
        <div className="mt-5 overflow-hidden rounded-2xl border border-emerald-200 bg-white">
          <div className="grid grid-cols-[1fr_90px_80px] bg-emerald-100 px-4 py-3 text-xs font-black uppercase text-emerald-900">
            <div>BOQ Item</div>
            <div className="text-right">Qty</div>
            <div className="text-right">Unit</div>
          </div>

          <div className="divide-y divide-slate-100">
            {boq.items.slice(0, 8).map((item) => (
              <div
                key={`${item.category}-${item.itemName}`}
                className="grid grid-cols-[1fr_90px_80px] gap-3 px-4 py-3 text-sm"
              >
                <div>
                  <div className="font-black text-slate-950">
                    {item.itemName}
                  </div>

                  <div className="mt-1 text-xs font-semibold text-slate-500">
                    {item.vendorCategory}
                  </div>
                </div>

                <div className="text-right font-black text-slate-950">
                  {item.quantity.toLocaleString("en-IN")}
                </div>

                <div className="text-right font-bold text-slate-600">
                  {item.unit}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">
            RFQ Ready: {boq.procurementSummary.recommendedAction}
          </div>
        </div>
      ) : null}
    </div>
  );
}
