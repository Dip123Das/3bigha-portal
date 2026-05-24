"use client";

import { useMemo } from "react";

import { generateBoqEstimate } from "@/lib/construction-cost/boq-generator";
import type { ConstructionGrade } from "@/lib/construction-cost/cost-config";

type Props = {
  builtUpAreaSqFt: number;
  floorCount?: number;
  grade?: ConstructionGrade;
  roomCount?: number;
  bathroomCount?: number;
  kitchenCount?: number;
};

export default function BoqPreviewTable({
  builtUpAreaSqFt,
  floorCount = 1,
  grade = "standard",
  roomCount,
  bathroomCount,
  kitchenCount,
}: Props) {
  const boq = useMemo(
    () =>
      generateBoqEstimate({
        builtUpAreaSqFt,
        floorCount,
        grade,
        roomCount,
        bathroomCount,
        kitchenCount,
      }),
    [
      builtUpAreaSqFt,
      floorCount,
      grade,
      roomCount,
      bathroomCount,
      kitchenCount,
    ],
  );

  return (
    <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
          AI BOQ Preview
        </p>

        <h2 className="mt-2 text-2xl font-black text-slate-950">
          Preliminary bill of quantities
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Generated for {boq.builtUpAreaSqFt} sq.ft, {boq.floorCount} floor
          {boq.floorCount > 1 ? "s" : ""}, {boq.roomCount} rooms,{" "}
          {boq.bathroomCount} bathrooms and {boq.grade} grade.
        </p>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
        <div className="hidden grid-cols-[1fr_120px_120px_1fr] bg-slate-100 px-4 py-3 text-xs font-black uppercase text-slate-600 md:grid">
          <div>Work Item</div>
          <div>Qty</div>
          <div>Unit</div>
          <div>Vendor</div>
        </div>

        <div className="divide-y divide-slate-200">
          {boq.items.map((item) => (
            <div
              key={`${item.category}-${item.itemName}`}
              className="grid gap-3 px-4 py-4 text-sm md:grid-cols-[1fr_120px_120px_1fr]"
            >
              <div>
                <div className="font-black text-slate-950">
                  {item.itemName}
                </div>
                <div className="mt-1 text-xs leading-5 text-slate-600">
                  {item.description}
                </div>

                {item.pwdCode ? (
                  <div className="mt-2 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">
                    {item.pwdCode}
                  </div>
                ) : null}
              </div>

              <div className="font-black text-slate-950">
                {item.quantity.toLocaleString("en-IN")}
              </div>

              <div className="font-bold text-slate-600">{item.unit}</div>

              <div>
                <div className="font-bold text-blue-700">
                  {item.vendorCategory}
                </div>
                <div className="mt-1 text-xs leading-5 text-slate-500">
                  {item.note}
                </div>

                {item.pwdSection ? (
                  <div className="mt-2 text-[11px] font-bold text-emerald-700">
                    PWD Section: {item.pwdSection}
                  </div>
                ) : null}

                {item.priceTodayKeys?.length ? (
                  <div className="mt-1 text-[11px] font-bold text-orange-700">
                    Price Today: {item.priceTodayKeys.join(", ")}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="text-sm font-black text-amber-900">
          BOQ assumptions
        </div>

        <ul className="mt-2 space-y-1 text-xs font-semibold leading-5 text-amber-800">
          {boq.assumptions.slice(0, 4).map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}