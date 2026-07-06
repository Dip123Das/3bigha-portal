"use client";

import { useMemo } from "react";
import Link from "next/link";

import { generateConstructionRfqDrafts } from "@/lib/construction-cost/rfq-package-generator";
import type { ConstructionGrade } from "@/lib/construction-cost/cost-config";

type Props = {
  builtUpAreaSqFt: number;
  floorCount?: number;
  grade?: ConstructionGrade;
  roomCount?: number;
  bathroomCount?: number;
  kitchenCount?: number;
  hasInteriorWork?: boolean;
};

export default function ConstructionAutoRfqPanel({
  builtUpAreaSqFt,
  floorCount = 1,
  grade = "standard",
  roomCount,
  bathroomCount,
  kitchenCount,
  hasInteriorWork = false,
}: Props) {
  const result = useMemo(
    () =>
      generateConstructionRfqDrafts({
        builtUpAreaSqFt,
        floorCount,
        grade,
        roomCount,
        bathroomCount,
        kitchenCount,
        hasInteriorWork,
      }),
    [
      builtUpAreaSqFt,
      floorCount,
      grade,
      roomCount,
      bathroomCount,
      kitchenCount,
      hasInteriorWork,
    ],
  );

  return (
    <section className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-lime-50 p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
          AI Auto RFQ Generator
        </p>

        <h2 className="mt-2 text-2xl font-black text-slate-950">
          Convert this construction plan into RFQs
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-700">
          AI can split your construction plan into materials, services and rental
          RFQ packages for vendor discovery.
        </p>
      </div>

      <div className="mt-5 grid gap-3">
        {result.drafts.map((draft) => (
          <div
            key={draft.metadata.packageKey}
            className="rounded-2xl border border-slate-200 bg-white p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-sm font-black text-slate-950">
                  {draft.title}
                </div>

                <div className="mt-1 text-xs font-bold uppercase text-emerald-700">
                  {draft.module} • {draft.priority} priority
                </div>

                <div className="mt-2 text-xs leading-5 text-slate-600">
                  {draft.items.slice(0, 4).map((item) => (
                    <div key={`${draft.metadata.packageKey}-${item.item_name}`}>
                      • {item.item_name}
                      {item.qty ? ` — approx ${item.qty} ${item.unit ?? ""}` : ""}
                    </div>
                  ))}
                </div>
              </div>

              <Link
                href={`/rfq?module=${encodeURIComponent(
                  draft.module,
                )}&query=${encodeURIComponent(draft.title)}`}
                className="rounded-2xl bg-emerald-700 px-4 py-3 text-center text-sm font-black text-white hover:bg-emerald-800"
              >
                Create RFQ
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold leading-5 text-amber-800">
        This panel currently prepares RFQ-ready packages. Direct database RFQ
        creation is handled through the safe API layer and can be connected after
        final user confirmation.
      </div>
    </section>
  );
}