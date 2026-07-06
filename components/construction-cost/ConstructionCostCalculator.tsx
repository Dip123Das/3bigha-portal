"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import GeoSelector, { type GeoSelection } from "@/components/geography/GeoSelector";

import {
  estimateConstructionCost,
  formatIndianCurrency,
} from "@/lib/construction-cost/cost-utils";
import type {
  ConstructionGrade,
  ConstructionRegionKey,
} from "@/lib/construction-cost/cost-config";
import MaterialEstimatePreview from "@/components/construction-cost/MaterialEstimatePreview";
import BoqPreviewTable from "@/components/construction-cost/BoqPreviewTable";
import TimelineEstimatePreview from "@/components/construction-cost/TimelineEstimatePreview";
import ProcurementPhaseScheduler from "@/components/construction-cost/ProcurementPhaseScheduler";
import ConstructionAutoRfqPanel from "@/components/construction-cost/ConstructionAutoRfqPanel";
import SaveConstructionProjectButton from "@/components/construction-cost/SaveConstructionProjectButton";
import DrawingUploadPanel from "@/components/construction-cost/DrawingUploadPanel";
import ExportDprButton from "@/components/construction-cost/ExportDprButton";
import ExportExcelButton from "@/components/construction-cost/ExportExcelButton";
import {
  normalizeManualLocation,
} from "@/lib/construction-cost/india-location-data";
import { generatePwdScheduleEstimate } from "@/lib/construction-cost/pwd-cost-engine";

type Props = {
  defaultRegion?: ConstructionRegionKey;
};

type ScheduleMode = "indicative" | "pwd_sor" | "cpwd_dsr" | "price_today";

const GRADES: ConstructionGrade[] = ["economy", "standard", "premium"];

const scheduleModes: {
  value: ScheduleMode;
  label: string;
  note: string;
  multiplier: number;
}[] = [
  {
    value: "indicative",
    label: "Indicative Market Estimate",
    note: "Best for quick early planning before drawings and soil report.",
    multiplier: 1,
  },
  {
    value: "pwd_sor",
    label: "PWD / SOR Guided",
    note: "Government schedule style costing. Upload official SOR for exact item rates.",
    multiplier: 1.04,
  },
  {
    value: "cpwd_dsr",
    label: "CPWD / DSR Guided",
    note: "National schedule style costing. Useful for formal and institutional projects.",
    multiplier: 1.07,
  },
  {
    value: "price_today",
    label: "Price Today Dynamic",
    note: "Adjust estimate with 3Bigha Price Today material market movement.",
    multiplier: 1.02,
  },
];

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(Math.round(value), max));
}

function getHighRiseMultiplier(aboveGroundFloors: number) {
  if (aboveGroundFloors <= 5) return 1;
  if (aboveGroundFloors <= 15) return 1.06;
  if (aboveGroundFloors <= 30) return 1.12;
  if (aboveGroundFloors <= 50) return 1.2;
  return 1.28;
}

function getBasementMultiplier(basementCount: number) {
  if (basementCount <= 0) return 1;
  return 1 + basementCount * 0.09;
}

function getHighRiseLabel(floors: number) {
  if (floors <= 5) return "Low-rise";
  if (floors <= 15) return "Mid-rise";
  if (floors <= 30) return "High-rise";
  if (floors <= 50) return "Large tower";
  return "Super high-rise planning";
}

function getUiPwdDistrictKey(city: string, state: string) {
  if (city === "cooch_behar") return "cooch_behar";
  if (city === "kolkata") return "kolkata_zone";
  if (state === "west_bengal") return "north_bengal_general";
  return "kolkata_zone";
}

export default function ConstructionCostCalculator({
  defaultRegion = "default",
}: Props) {
  const [typicalFloorAreaInput, setTypicalFloorAreaInput] = useState("1000");
  const [aboveGroundFloors, setAboveGroundFloors] = useState(1);
  const [basementCount, setBasementCount] = useState(0);
  const [basementAreaFactor, setBasementAreaFactor] = useState(100);
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("price_today");

  const [selectedState, setSelectedState] = useState("west_bengal");
  const [geoSelection, setGeoSelection] = useState<GeoSelection>({});
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedCity, setSelectedCity] = useState(
    defaultRegion === "default" ? "cooch_behar" : defaultRegion,
  );
  const [manualDistrictCity, setManualDistrictCity] = useState("");
  const [grade, setGrade] = useState<ConstructionGrade>("standard");

  const [roomCount, setRoomCount] = useState(3);
  const [bathroomCount, setBathroomCount] = useState(2);
  const [kitchenCount, setKitchenCount] = useState(1);
  const [hasInteriorWork, setHasInteriorWork] = useState(false);

  const typicalFloorAreaSqFt = Math.max(
    100,
    Number(typicalFloorAreaInput || 0),
  );

  const safeAboveGroundFloors = clampNumber(aboveGroundFloors, 1, 75);
  const safeBasementCount = clampNumber(basementCount, 0, 5);
  const safeBasementAreaFactor = clampNumber(basementAreaFactor, 50, 150);

  const basementAreaSqFt = Math.round(
    typicalFloorAreaSqFt *
      safeBasementCount *
      (safeBasementAreaFactor / 100),
  );

  const aboveGroundAreaSqFt = typicalFloorAreaSqFt * safeAboveGroundFloors;
  const totalProjectAreaSqFt = Math.max(
    100,
    aboveGroundAreaSqFt + basementAreaSqFt,
  );

  const legacyFloorCount = Math.max(0, safeAboveGroundFloors - 1);
  const totalConstructedLevels = safeAboveGroundFloors + safeBasementCount;

  const selectedSchedule = scheduleModes.find(
    (item) => item.value === scheduleMode,
  ) || scheduleModes[0];

  const estimate = useMemo(
    () =>
      estimateConstructionCost({
        builtUpAreaSqFt: totalProjectAreaSqFt,
        floorCount: legacyFloorCount,
        grade,
        region:
          normalizeManualLocation(selectedCity) ||
          normalizeManualLocation(selectedDistrict) ||
          normalizeManualLocation(manualDistrictCity) ||
          selectedState,
        roomCount,
        bathroomCount,
        kitchenCount,
        hasInteriorWork,
      }),
    [
      totalProjectAreaSqFt,
      legacyFloorCount,
      grade,
      selectedCity,
      selectedDistrict,
      selectedState,
      manualDistrictCity,
      roomCount,
      bathroomCount,
      kitchenCount,
      hasInteriorWork,
    ],
  );

  const highRiseMultiplier = getHighRiseMultiplier(safeAboveGroundFloors);
  const basementMultiplier = getBasementMultiplier(safeBasementCount);
  const scheduleMultiplier = selectedSchedule.multiplier;
  const finalMultiplier =
    highRiseMultiplier * basementMultiplier * scheduleMultiplier;

  const adjustedBudget = Math.round(estimate.estimatedTotal * finalMultiplier);
  const adjustedMinBudget = Math.round(
    estimate.estimatedMinTotal * finalMultiplier,
  );
  const adjustedMaxBudget = Math.round(
    estimate.estimatedMaxTotal * finalMultiplier,
  );
  const adjustedRatePerSqFt = Math.round(adjustedBudget / totalProjectAreaSqFt);

  const priceTodayHref = `/price-today?category=Materials&q=${encodeURIComponent(
    "cement tmt sand brick aggregate",
  )}`;

  const pwdDistrictKey = getUiPwdDistrictKey(
    String(selectedCity || selectedDistrict),
    String(selectedState),
  );

  const pwdScheduleEstimate = useMemo(
    () =>
      generatePwdScheduleEstimate({
        builtUpAreaSqFt: totalProjectAreaSqFt,
        floorCount: totalConstructedLevels,
        basementCount: safeBasementCount,
        districtKey: pwdDistrictKey,
        includeSanitary: true,
        includeElectrical: true,
        gstPercent: 18,
      }),
    [
      totalProjectAreaSqFt,
      totalConstructedLevels,
      safeBasementCount,
      pwdDistrictKey,
    ],
  );

  return (
    <section className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
            PWD/SOR + Price Today Construction Calculator
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            Estimate full project cost from basement to high-rise tower
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Calculate house, apartment, commercial and multi-storied project cost
            up to 75 floors with basement, schedule mode and Price Today market
            rate guidance.
          </p>
        </div>

        <Link
          href={priceTodayHref}
          className="rounded-2xl bg-orange-600 px-5 py-3 text-sm font-black text-white hover:bg-orange-700"
        >
          Check Price Today →
        </Link>
      </div>

      <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-900">
        Government schedule note: exact PWD/SOR or CPWD/DSR costing requires the
        official schedule PDF/Excel and item-code mapping. Until that file is
        uploaded, this calculator uses schedule-guided multipliers plus local
        Price Today market intelligence.
      </div>

      <div className="mt-6">
        <GeoSelector
          value={geoSelection}
          includeSubdivision
          includeBlock
          includePlace
          onChange={(geo: GeoSelection) => {
            setGeoSelection(geo);
            setSelectedState(normalizeManualLocation(geo.state?.name || "") || "west_bengal");
            setSelectedDistrict(geo.district?.name || "");
            setSelectedCity(
              (normalizeManualLocation(geo.place?.name || geo.district?.name || "") ||
                "cooch_behar") as ConstructionRegionKey,
            );
            setManualDistrictCity("");
          }}
        />

        <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-bold leading-5 text-emerald-900">
          📍 Using selected geography for local estimate context:
          {" "}
          {[selectedCity, selectedDistrict, selectedState].filter(Boolean).join(", ")}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="text-xs font-black uppercase text-slate-500">
            Typical Floor Area
          </span>
          <input
            type="number"
            min={100}
            value={typicalFloorAreaInput}
            onChange={(event) => setTypicalFloorAreaInput(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500"
          />
        </label>

        <label className="block">
          <span className="text-xs font-black uppercase text-slate-500">
            Above-ground floors
          </span>
          <select
            value={safeAboveGroundFloors}
            onChange={(event) => setAboveGroundFloors(Number(event.target.value))}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500"
          >
            {Array.from({ length: 75 }, (_, index) => index + 1).map((count) => (
              <option key={count} value={count}>
                {count === 1 ? "Ground Floor Only" : `G + ${count - 1}`}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-black uppercase text-slate-500">
            Basement floors
          </span>
          <select
            value={safeBasementCount}
            onChange={(event) => setBasementCount(Number(event.target.value))}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500"
          >
            {[0, 1, 2, 3, 4, 5].map((count) => (
              <option key={count} value={count}>
                {count === 0 ? "No Basement" : `B${count}`}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-black uppercase text-slate-500">
            Basement area factor
          </span>
          <select
            value={safeBasementAreaFactor}
            onChange={(event) => setBasementAreaFactor(Number(event.target.value))}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500"
          >
            {[50, 75, 100, 125, 150].map((value) => (
              <option key={value} value={value}>
                {value}% of typical floor area
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-black uppercase text-slate-500">
            Schedule / Rate Mode
          </span>
          <select
            value={scheduleMode}
            onChange={(event) => setScheduleMode(event.target.value as ScheduleMode)}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500"
          >
            {scheduleModes.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-black uppercase text-slate-500">
            Grade
          </span>
          <select
            value={grade}
            onChange={(event) =>
              setGrade(event.target.value as ConstructionGrade)
            }
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

      <div className="mt-4 rounded-3xl border border-blue-100 bg-blue-50 p-4">
        <div className="text-sm font-black text-blue-950">
          {selectedSchedule.label}
        </div>
        <div className="mt-1 text-xs font-bold leading-5 text-blue-800">
          {selectedSchedule.note}
        </div>
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
            {Array.from({ length: 20 }, (_, index) => index + 1).map((count) => (
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
            {Array.from({ length: 20 }, (_, index) => index + 1).map((count) => (
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
            {Array.from({ length: 10 }, (_, index) => index + 1).map((count) => (
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
            Estimated Project Budget
          </p>
          <p className="mt-2 text-2xl font-black text-emerald-950">
            {formatIndianCurrency(adjustedBudget)}
          </p>
        </div>

        <div className="rounded-3xl bg-slate-50 p-5">
          <p className="text-xs font-black uppercase text-slate-500">
            Effective Rate / Sq.ft
          </p>
          <p className="mt-2 text-2xl font-black text-slate-950">
            {formatIndianCurrency(adjustedRatePerSqFt)}
          </p>
        </div>

        <div className="rounded-3xl bg-slate-50 p-5">
          <p className="text-xs font-black uppercase text-slate-500">
            Budget Range
          </p>
          <p className="mt-2 text-base font-black text-slate-950">
            {formatIndianCurrency(adjustedMinBudget)} -{" "}
            {formatIndianCurrency(adjustedMaxBudget)}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 rounded-3xl border border-blue-100 bg-blue-50 p-5 sm:grid-cols-5">
        <div>
          <p className="text-xs font-black uppercase text-blue-700">
            Project type
          </p>
          <p className="mt-1 text-sm font-black text-blue-950">
            {getHighRiseLabel(safeAboveGroundFloors)}
          </p>
        </div>
        <div>
          <p className="text-xs font-black uppercase text-blue-700">
            Total area
          </p>
          <p className="mt-1 text-lg font-black text-blue-950">
            {totalProjectAreaSqFt.toLocaleString("en-IN")} sq.ft
          </p>
        </div>
        <div>
          <p className="text-xs font-black uppercase text-blue-700">
            Levels
          </p>
          <p className="mt-1 text-lg font-black text-blue-950">
            {safeBasementCount ? `B${safeBasementCount} + ` : ""}
            {safeAboveGroundFloors} above ground
          </p>
        </div>
        <div>
          <p className="text-xs font-black uppercase text-blue-700">
            High-rise factor
          </p>
          <p className="mt-1 text-lg font-black text-blue-950">
            x{highRiseMultiplier.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs font-black uppercase text-blue-700">
            Schedule factor
          </p>
          <p className="mt-1 text-lg font-black text-blue-950">
            x{scheduleMultiplier.toFixed(2)}
          </p>
        </div>
      </div>

      {safeAboveGroundFloors >= 15 || safeBasementCount >= 2 ? (
        <div className="mt-5 rounded-3xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-800">
          High-rise caution: for 15+ floors or multiple basements, final costing
          must include structural design, soil report, lift core, fire fighting,
          MEP shaft, STP, DG, transformer, parking, approvals and engineer-certified
          BOQ.
        </div>
      ) : null}

      <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="text-sm font-black uppercase text-slate-700">
          Project Cost Breakup
        </h3>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {estimate.breakup.map((item) => (
            <div
              key={item.component}
              className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm"
            >
              <span className="font-bold text-slate-600">{item.label}</span>
              <span className="font-black text-slate-950">
                {formatIndianCurrency(Math.round(item.amount * finalMultiplier))}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
              PWD / DPR Schedule Summary
            </p>
            <h3 className="mt-1 text-lg font-black text-slate-950">
              Government-style estimate breakup
            </h3>
            <p className="mt-1 max-w-3xl text-sm font-bold leading-6 text-slate-700">
              This uses the new PWD SOR foundation engine with building,
              sanitary and electrical schedule logic. Final official estimate
              still needs engineer-approved measurements and exact item-code
              mapping.
            </p>
          </div>

          <div className="rounded-2xl bg-white px-4 py-3 text-right shadow-sm">
            <p className="text-xs font-black uppercase text-slate-500">
              DPR Grand Total
            </p>
            <p className="mt-1 text-xl font-black text-emerald-800">
              {formatIndianCurrency(pwdScheduleEstimate.summary.grandTotal)}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-white p-4">
            <p className="text-xs font-black uppercase text-slate-500">
              Schedule Subtotal
            </p>
            <p className="mt-1 text-lg font-black text-slate-950">
              {formatIndianCurrency(pwdScheduleEstimate.summary.subtotal)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4">
            <p className="text-xs font-black uppercase text-slate-500">
              GST
            </p>
            <p className="mt-1 text-lg font-black text-slate-950">
              {formatIndianCurrency(pwdScheduleEstimate.summary.gst)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4">
            <p className="text-xs font-black uppercase text-slate-500">
              Labour Cess
            </p>
            <p className="mt-1 text-lg font-black text-slate-950">
              {formatIndianCurrency(pwdScheduleEstimate.summary.labourWelfareCess)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4">
            <p className="text-xs font-black uppercase text-slate-500">
              Contingency
            </p>
            <p className="mt-1 text-lg font-black text-slate-950">
              {formatIndianCurrency(pwdScheduleEstimate.summary.contingency)}
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-emerald-100 bg-white">
          <div className="grid grid-cols-12 gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-black uppercase text-slate-500">
            <div className="col-span-5">PWD Item</div>
            <div className="col-span-2 text-right">Qty</div>
            <div className="col-span-2 text-right">Base Rate</div>
            <div className="col-span-2 text-right">Live Rate</div>
            <div className="col-span-1 text-right">Adj.</div>
          </div>

          {pwdScheduleEstimate.lines.slice(0, 7).map((line) => (
            <div
              key={line.code}
              className="grid grid-cols-12 gap-2 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0"
            >
              <div className="col-span-5">
                <p className="font-black text-slate-950">{line.label}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {line.code}
                </p>
              </div>
              <div className="col-span-2 text-right font-bold text-slate-700">
                {line.quantity} {line.unit}
              </div>
              <div className="col-span-2 text-right font-bold text-slate-700">
                {formatIndianCurrency(line.rate)}
              </div>
              <div className="col-span-2 text-right font-black text-slate-950">
                {formatIndianCurrency(line.rate)}
              </div>
              <div className="col-span-1 text-right text-xs font-black text-orange-700">
                {"adjustmentPercent" in line
                  ? `+${Number(line.adjustmentPercent || 0)}%`
                  : "Live"}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl bg-white p-4 text-xs font-bold leading-5 text-slate-600">
          PWD source logic added from uploaded WB PWD Building, Sanitary and
          Electrical SOR files. Base rates are now compared with Price Today
          market-adjusted rates where material intelligence is available.
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-orange-200 bg-orange-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-950">
              Price Today material intelligence
            </h3>
            <p className="mt-1 text-sm font-bold leading-6 text-slate-700">
              Verify cement, TMT, sand, brick and aggregate rates before final
              BOQ, RFQ or contractor negotiation.
            </p>
          </div>

          <Link
            href={priceTodayHref}
            className="rounded-2xl bg-orange-600 px-5 py-3 text-sm font-black text-white hover:bg-orange-700"
          >
            Open Price Today
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <MaterialEstimatePreview
          builtUpAreaSqFt={totalProjectAreaSqFt}
          floorCount={totalConstructedLevels}
          grade={grade}
        />
      </div>

      <div className="mt-6">
        <DrawingUploadPanel
          builtUpAreaSqFt={totalProjectAreaSqFt}
          floorCount={totalConstructedLevels}
          basementCount={safeBasementCount}
        />
      </div>

      <div className="mt-6">
        <BoqPreviewTable
          builtUpAreaSqFt={totalProjectAreaSqFt}
          floorCount={totalConstructedLevels}
          grade={grade}
          roomCount={roomCount}
          bathroomCount={bathroomCount}
          kitchenCount={kitchenCount}
        />
      </div>

      <div className="mt-6">
        <TimelineEstimatePreview
          builtUpAreaSqFt={totalProjectAreaSqFt}
          floorCount={totalConstructedLevels}
          grade={grade}
          roomCount={roomCount}
          bathroomCount={bathroomCount}
          hasInteriorWork={hasInteriorWork}
        />
      </div>

      <div className="mt-6">
        <ProcurementPhaseScheduler
          builtUpAreaSqFt={totalProjectAreaSqFt}
          floorCount={totalConstructedLevels}
          grade={grade}
          roomCount={roomCount}
          bathroomCount={bathroomCount}
          hasInteriorWork={hasInteriorWork}
        />
      </div>

      <div className="mt-6">
        <ConstructionAutoRfqPanel
          builtUpAreaSqFt={totalProjectAreaSqFt}
          floorCount={totalConstructedLevels}
          grade={grade}
          roomCount={roomCount}
          bathroomCount={bathroomCount}
          kitchenCount={kitchenCount}
          hasInteriorWork={hasInteriorWork}
        />
      </div>

      <div className="mt-6">
        <SaveConstructionProjectButton
          builtUpAreaSqFt={totalProjectAreaSqFt}
          floorCount={totalConstructedLevels}
          grade={grade}
          roomCount={roomCount}
          bathroomCount={bathroomCount}
          kitchenCount={kitchenCount}
          hasInteriorWork={hasInteriorWork}
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={`/rfq?query=${encodeURIComponent(
            `construction project ${totalProjectAreaSqFt} sq ft ${safeBasementCount} basement ${safeAboveGroundFloors} floors`,
          )}`}
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

        <Link
          href={priceTodayHref}
          className="rounded-2xl border border-orange-200 bg-white px-5 py-3 text-sm font-black text-orange-700 hover:bg-orange-50"
        >
          Check Material Rates
        </Link>
      </div>
    </section>
  );
}
