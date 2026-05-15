"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { estimateConstructionCost, formatIndianCurrency } from "@/lib/construction-cost/cost-utils";
import type { ConstructionGrade, ConstructionRegionKey } from "@/lib/construction-cost/cost-config";
import MaterialEstimatePreview from "@/components/construction-cost/MaterialEstimatePreview";
import BoqPreviewTable from "@/components/construction-cost/BoqPreviewTable";
import TimelineEstimatePreview from "@/components/construction-cost/TimelineEstimatePreview";
import ProcurementPhaseScheduler from "@/components/construction-cost/ProcurementPhaseScheduler";
import ConstructionAutoRfqPanel from "@/components/construction-cost/ConstructionAutoRfqPanel";
import SaveConstructionProjectButton from "@/components/construction-cost/SaveConstructionProjectButton";
import {
  INDIA_STATE_OPTIONS,
  getDefaultCityForState,
  getIndiaStateOption,
  normalizeManualLocation,
} from "@/lib/construction-cost/india-location-data";

type Props = {
  defaultRegion?: ConstructionRegionKey;
};

const GRADES: ConstructionGrade[] = ["economy", "standard", "premium"];

export default function ConstructionCostCalculator({
  defaultRegion = "default",
}: Props) {
  const [builtUpAreaSqFt, setBuiltUpAreaSqFt] = useState(1000);
  const [floorCount, setFloorCount] = useState(0);
  const [selectedState, setSelectedState] = useState("west_bengal");
  const [selectedCity, setSelectedCity] = useState(
    defaultRegion === "default" ? "cooch_behar" : defaultRegion,
  );
  const [manualDistrictCity, setManualDistrictCity] = useState("");
  const [grade, setGrade] = useState<ConstructionGrade>("standard");

  const [roomCount, setRoomCount] = useState(3);
  const [bathroomCount, setBathroomCount] = useState(2);
  const [kitchenCount, setKitchenCount] = useState(1);
  const [hasInteriorWork, setHasInteriorWork] = useState(false);

  const estimate = useMemo(
    () =>
      estimateConstructionCost({
        builtUpAreaSqFt,
        floorCount,
        grade,
        region:
          selectedCity === "other"
            ? normalizeManualLocation(manualDistrictCity) || selectedState
            : selectedCity,
        roomCount,
        bathroomCount,
        kitchenCount,
        hasInteriorWork,
      }),
    [
      builtUpAreaSqFt,
      floorCount,
      grade,
      selectedCity,
      selectedState,
      manualDistrictCity,
      roomCount,
      bathroomCount,
      kitchenCount,
      hasInteriorWork,
    ],
  );

  return (
    <section className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
          AI Construction Cost Calculator
        </p>
        <h2 className="mt-2 text-2xl font-black text-slate-950">
          Estimate your house construction budget
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Change area, floors and grade to get an instant indicative budget.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="text-xs font-black uppercase text-slate-500">
            State / Union Territory
          </span>
          <select
            value={selectedState}
            onChange={(event) => {
              const nextState = event.target.value;
              setSelectedState(nextState);
              setSelectedCity(getDefaultCityForState(nextState) as ConstructionRegionKey);
              setManualDistrictCity("");
            }}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500"
          >
            {INDIA_STATE_OPTIONS.map((state) => (
              <option key={state.value} value={state.value}>
                {state.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-black uppercase text-slate-500">
            District / City
          </span>
          <select
            value={selectedCity}
            onChange={(event) => {
              setSelectedCity(event.target.value as ConstructionRegionKey);
              if (event.target.value !== "other") {
                setManualDistrictCity("");
              }
            }}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500"
          >
            {getIndiaStateOption(selectedState).cities.map((city) => (
              <option key={city.value} value={city.value}>
                {city.label}
              </option>
            ))}
          </select>
        </label>

        {selectedCity === "other" && (
          <label className="block">
            <span className="text-xs font-black uppercase text-slate-500">
              Type District / City
            </span>
            <input
              type="text"
              value={manualDistrictCity}
              onChange={(event) => setManualDistrictCity(event.target.value)}
              placeholder="Example: Jalgaon, Morbi, Bankura, etc."
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500"
            />
          </label>
        )}
        <label className="block">
          <span className="text-xs font-black uppercase text-slate-500">
            Built-up Area
          </span>
          <input
            type="number"
            min={100}
            value={builtUpAreaSqFt}
            onChange={(event) =>
              setBuiltUpAreaSqFt(Number(event.target.value || 100))
            }
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500"
          />
        </label>

        <label className="block">
          <span className="text-xs font-black uppercase text-slate-500">
            Floor Structure
          </span>
          <select
            value={floorCount}
            onChange={(event) => setFloorCount(Number(event.target.value))}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500"
          >
            <option value={-2}>B2 + B1 + Ground</option>
            <option value={-1}>B1 + Ground</option>
            <option value={0}>Ground Floor Only</option>
            <option value={1}>G + 1</option>
            <option value={2}>G + 2</option>
            <option value={3}>G + 3</option>
            <option value={4}>G + 4</option>
            <option value={5}>G + 5</option>
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-black uppercase text-slate-500">
            Grade
          </span>
          <select
            value={grade}
            onChange={(event) => setGrade(event.target.value as ConstructionGrade)}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold capitalize outline-none focus:border-emerald-500"
          >
            {GRADES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="text-xs font-black uppercase text-slate-500">
            Rooms
          </span>

          <select
            value={roomCount}
            onChange={(event) => setRoomCount(Number(event.target.value))}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500"
          >
            {[1,2,3,4,5,6,7,8].map((count) => (
              <option key={count} value={count}>
                {count} Room{count > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-black uppercase text-slate-500">
            Bathrooms
          </span>

          <select
            value={bathroomCount}
            onChange={(event) => setBathroomCount(Number(event.target.value))}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500"
          >
            {[1,2,3,4,5,6].map((count) => (
              <option key={count} value={count}>
                {count} Bathroom{count > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-black uppercase text-slate-500">
            Kitchens
          </span>

          <select
            value={kitchenCount}
            onChange={(event) => setKitchenCount(Number(event.target.value))}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500"
          >
            {[1,2,3].map((count) => (
              <option key={count} value={count}>
                {count} Kitchen{count > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <label className="flex cursor-pointer items-center justify-between gap-4">
          <div>
            <div className="text-sm font-black text-slate-950">
              Include interior finishing timeline
            </div>
            <div className="mt-1 text-xs font-semibold text-slate-600">
              Adds extra time for premium finishing, fittings and interior coordination.
            </div>
          </div>

          <input
            type="checkbox"
            checked={hasInteriorWork}
            onChange={(event) => setHasInteriorWork(event.target.checked)}
            className="h-5 w-5"
          />
        </label>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl bg-emerald-50 p-5">
          <p className="text-xs font-black uppercase text-emerald-700">
            Estimated Budget
          </p>
          <p className="mt-2 text-2xl font-black text-emerald-950">
            {formatIndianCurrency(estimate.estimatedTotal)}
          </p>
        </div>

        <div className="rounded-3xl bg-slate-50 p-5">
          <p className="text-xs font-black uppercase text-slate-500">
            Rate Per Sq.ft
          </p>
          <p className="mt-2 text-2xl font-black text-slate-950">
            {formatIndianCurrency(estimate.ratePerSqFt)}
          </p>
        </div>

        <div className="rounded-3xl bg-slate-50 p-5">
          <p className="text-xs font-black uppercase text-slate-500">
            Budget Range
          </p>
          <p className="mt-2 text-base font-black text-slate-950">
            {formatIndianCurrency(estimate.estimatedMinTotal)} -{" "}
            {formatIndianCurrency(estimate.estimatedMaxTotal)}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 rounded-3xl border border-blue-100 bg-blue-50 p-5 sm:grid-cols-5">
        <div>
          <p className="text-xs font-black uppercase text-blue-700">Room factor</p>
          <p className="mt-1 text-lg font-black text-blue-950">
            x{estimate.roomComplexityMultiplier.toFixed(3)}
          </p>
        </div>
        <div>
          <p className="text-xs font-black uppercase text-blue-700">Bath/Kitchen factor</p>
          <p className="mt-1 text-lg font-black text-blue-950">
            x{estimate.wetAreaMultiplier.toFixed(3)}
          </p>
        </div>
        <div>
          <p className="text-xs font-black uppercase text-blue-700">Interior factor</p>
          <p className="mt-1 text-lg font-black text-blue-950">
            x{estimate.interiorMultiplier.toFixed(3)}
          </p>
        </div>
        <div>
          <p className="text-xs font-black uppercase text-blue-700">Earthwork factor</p>
          <p className="mt-1 text-lg font-black text-blue-950">
            x{estimate.earthworkMultiplier.toFixed(3)}
          </p>
        </div>
        <div>
          <p className="text-xs font-black uppercase text-blue-700">Total planning inputs</p>
          <p className="mt-1 text-sm font-black text-blue-950">
            {roomCount} rooms · {bathroomCount} baths · {kitchenCount} kitchen
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="text-sm font-black uppercase text-slate-700">
          Cost Breakup
        </h3>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {estimate.breakup.map((item) => (
            <div
              key={item.component}
              className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm"
            >
              <span className="font-bold text-slate-600">{item.label}</span>
              <span className="font-black text-slate-950">
                {formatIndianCurrency(item.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <MaterialEstimatePreview
          builtUpAreaSqFt={builtUpAreaSqFt}
          floorCount={floorCount}
          grade={grade}
        />
      </div>

      <div className="mt-6">
        <BoqPreviewTable
          builtUpAreaSqFt={builtUpAreaSqFt}
          floorCount={floorCount}
          grade={grade}
          roomCount={roomCount}
          bathroomCount={bathroomCount}
          kitchenCount={kitchenCount}
        />
      </div>

      <div className="mt-6">
        <TimelineEstimatePreview
          builtUpAreaSqFt={builtUpAreaSqFt}
          floorCount={floorCount}
          grade={grade}
          roomCount={roomCount}
          bathroomCount={bathroomCount}
          hasInteriorWork={hasInteriorWork}
        />
      </div>

      <div className="mt-6">
        <ProcurementPhaseScheduler
          builtUpAreaSqFt={builtUpAreaSqFt}
          floorCount={floorCount}
          grade={grade}
          roomCount={roomCount}
          bathroomCount={bathroomCount}
          hasInteriorWork={hasInteriorWork}
        />
      </div>

      <div className="mt-6">
        <ConstructionAutoRfqPanel
          builtUpAreaSqFt={builtUpAreaSqFt}
          floorCount={floorCount}
          grade={grade}
          roomCount={roomCount}
          bathroomCount={bathroomCount}
          kitchenCount={kitchenCount}
          hasInteriorWork={hasInteriorWork}
        />
      </div>

      <div className="mt-6">
        <SaveConstructionProjectButton
          builtUpAreaSqFt={builtUpAreaSqFt}
          floorCount={floorCount}
          grade={grade}
          roomCount={roomCount}
          bathroomCount={bathroomCount}
          kitchenCount={kitchenCount}
          hasInteriorWork={hasInteriorWork}
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/rfq/general/new"
          className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white hover:bg-emerald-800"
        >
          Create Construction RFQ
        </Link>

        <Link
          href="/services/turnkey"
          className="rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-black text-emerald-800 hover:bg-emerald-50"
        >
          Compare Turnkey Packages
        </Link>
      </div>
    </section>
  );
}