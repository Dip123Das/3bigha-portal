"use client";

import { useMemo, useState } from "react";
import {
  circleAreaToSqft,
  irregularFourSideAreaToSqft,
  rectangleAreaToSqft,
  roundArea,
  sqftToAcre,
  sqftToHectare,
  sqftToSqm,
  trapeziumAreaToSqft,
  triangleAreaToSqft,
  type AreaShape,
} from "@/lib/measurement/area";
import {
  convertSqftToRegionalUnits,
  getRegionalSystem,
  regionalLandSystems,
} from "@/lib/measurement/landUnits";

type CalculatorMode = "land" | "building";
type InputUnit = "feet" | "meter";

function formatNumber(value: number, digits = 2) {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString("en-IN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}

export default function LandAreaCalculatorPage() {
  const [mode, setMode] = useState<CalculatorMode>("land");
  const [shape, setShape] = useState<AreaShape>("rectangle");
  const [length, setLength] = useState(40);
  const [breadth, setBreadth] = useState(30);
  const [base, setBase] = useState(40);
  const [height, setHeight] = useState(30);
  const [radius, setRadius] = useState(20);
  const [parallelA, setParallelA] = useState(40);
  const [parallelB, setParallelB] = useState(25);
  const [diagonalOne, setDiagonalOne] = useState(50);
  const [diagonalTwo, setDiagonalTwo] = useState(35);
  const [unit, setUnit] = useState<InputUnit>("feet");
  const [state, setState] = useState("West Bengal");

  const result = useMemo(() => {
    const squareFeet =
      shape === "triangle"
        ? triangleAreaToSqft(base, height, unit)
        : shape === "circle"
        ? circleAreaToSqft(radius, unit)
        : shape === "trapezium"
        ? trapeziumAreaToSqft(parallelA, parallelB, height, unit)
        : shape === "irregular"
        ? irregularFourSideAreaToSqft(diagonalOne, diagonalTwo, unit)
        : rectangleAreaToSqft(length, breadth, unit);

    const squareMeter = sqftToSqm(squareFeet);

    return {
      squareFeet,
      squareMeter,
      acre: sqftToAcre(squareFeet),
      hectare: sqftToHectare(squareFeet),
      regional: convertSqftToRegionalUnits(squareFeet, state),
      system: getRegionalSystem(state),
    };
  }, [
    shape,
    length,
    breadth,
    base,
    height,
    radius,
    parallelA,
    parallelB,
    diagonalOne,
    diagonalTwo,
    unit,
    state,
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <section className="rounded-3xl border bg-white p-5 shadow-sm md:p-7">
        <div className="mb-5">
          <p className="text-sm font-semibold text-emerald-700">3bigha Calculator</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950 md:text-4xl">
            Land & Building Area Calculator
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 md:text-base">
            Calculate rectangular, triangular, circular, trapezium and irregular plot or roof area
            in square feet and square meter first, then convert land area into Indian regional units.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border bg-slate-50 p-4">
            <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-white p-1">
              <button
                type="button"
                onClick={() => setMode("land")}
                className={`rounded-xl px-3 py-3 text-sm font-bold ${
                  mode === "land" ? "bg-emerald-600 text-white" : "text-slate-700"
                }`}
              >
                Land
              </button>
              <button
                type="button"
                onClick={() => setMode("building")}
                className={`rounded-xl px-3 py-3 text-sm font-bold ${
                  mode === "building" ? "bg-emerald-600 text-white" : "text-slate-700"
                }`}
              >
                Building / Roof
              </button>
            </div>

            <label className="mb-4 block text-sm font-semibold text-slate-700">
              Shape / Measurement Type
              <select
                value={shape}
                onChange={(e) => setShape(e.target.value as AreaShape)}
                className="mt-2 w-full rounded-xl border px-3 py-3 text-base"
              >
                <option value="rectangle">Rectangle / Square</option>
                <option value="triangle">Triangle</option>
                <option value="circle">Circle / Round Plot</option>
                <option value="trapezium">Trapezium</option>
                <option value="irregular">Irregular 4-Side Plot / Roof</option>
              </select>
            </label>

            {shape === "rectangle" ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-sm font-semibold text-slate-700">
                  Length
                  <input type="number" min="0" value={length} onChange={(e) => setLength(Number(e.target.value))} className="mt-2 w-full rounded-xl border px-3 py-3 text-base" />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Breadth
                  <input type="number" min="0" value={breadth} onChange={(e) => setBreadth(Number(e.target.value))} className="mt-2 w-full rounded-xl border px-3 py-3 text-base" />
                </label>
                <UnitSelect unit={unit} setUnit={setUnit} />
              </div>
            ) : null}

            {shape === "triangle" ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-sm font-semibold text-slate-700">
                  Base
                  <input type="number" min="0" value={base} onChange={(e) => setBase(Number(e.target.value))} className="mt-2 w-full rounded-xl border px-3 py-3 text-base" />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Height
                  <input type="number" min="0" value={height} onChange={(e) => setHeight(Number(e.target.value))} className="mt-2 w-full rounded-xl border px-3 py-3 text-base" />
                </label>
                <UnitSelect unit={unit} setUnit={setUnit} />
              </div>
            ) : null}

            {shape === "circle" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700">
                  Radius
                  <input type="number" min="0" value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="mt-2 w-full rounded-xl border px-3 py-3 text-base" />
                </label>
                <UnitSelect unit={unit} setUnit={setUnit} />
              </div>
            ) : null}

            {shape === "trapezium" ? (
              <div className="grid gap-3 sm:grid-cols-4">
                <label className="text-sm font-semibold text-slate-700">
                  Parallel Side 1
                  <input type="number" min="0" value={parallelA} onChange={(e) => setParallelA(Number(e.target.value))} className="mt-2 w-full rounded-xl border px-3 py-3 text-base" />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Parallel Side 2
                  <input type="number" min="0" value={parallelB} onChange={(e) => setParallelB(Number(e.target.value))} className="mt-2 w-full rounded-xl border px-3 py-3 text-base" />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Height
                  <input type="number" min="0" value={height} onChange={(e) => setHeight(Number(e.target.value))} className="mt-2 w-full rounded-xl border px-3 py-3 text-base" />
                </label>
                <UnitSelect unit={unit} setUnit={setUnit} />
              </div>
            ) : null}

            {shape === "irregular" ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-sm font-semibold text-slate-700">
                  Diagonal 1
                  <input type="number" min="0" value={diagonalOne} onChange={(e) => setDiagonalOne(Number(e.target.value))} className="mt-2 w-full rounded-xl border px-3 py-3 text-base" />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Diagonal 2
                  <input type="number" min="0" value={diagonalTwo} onChange={(e) => setDiagonalTwo(Number(e.target.value))} className="mt-2 w-full rounded-xl border px-3 py-3 text-base" />
                </label>
                <UnitSelect unit={unit} setUnit={setUnit} />
              </div>
            ) : null}

            {mode === "land" ? (
              <label className="mt-4 block text-sm font-semibold text-slate-700">
                State / Regional System
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="mt-2 w-full rounded-xl border px-3 py-3 text-base"
                >
                  {regionalLandSystems.map((item) => (
                    <option key={item.state} value={item.state}>
                      {item.state}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              <b>Important:</b> For irregular land, this is a practical estimate. Final
              property registration, boundary disputes and legal agreements should be verified
              with local survey or revenue records.
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <h2 className="text-lg font-bold text-slate-950">Universal Area</h2>
            <p className="mt-1 text-sm text-slate-600">
              Use these values first for property, construction, finance and legal discussion.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <ResultCard label="Square Feet" value={`${formatNumber(roundArea(result.squareFeet))} sqft`} tone="emerald" />
              <ResultCard label="Square Meter" value={`${formatNumber(roundArea(result.squareMeter))} sqm`} tone="blue" />
              <ResultCard label="Acre" value={formatNumber(result.acre, 5)} />
              <ResultCard label="Hectare" value={formatNumber(result.hectare, 5)} />
            </div>
          </div>
        </div>

        {mode === "land" ? (
          <section className="mt-5 rounded-2xl border bg-slate-50 p-4">
            <div className="mb-3">
              <h2 className="text-lg font-bold text-slate-950">
                Regional Land Conversion · {result.system.state}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                These are local-practice conversions from the universal square feet value.
              </p>
            </div>

            {result.system.warning ? (
              <div className="mb-3 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">
                {result.system.warning}
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {result.regional.map((unitItem) => (
                <div key={unitItem.key} className="rounded-2xl border bg-white p-4">
                  <div className="text-xs font-bold uppercase text-slate-500">{unitItem.label}</div>
                  <div className="mt-1 text-xl font-black text-slate-950">
                    {formatNumber(unitItem.value, 5)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    1 {unitItem.label} = {formatNumber(unitItem.sqft)} sqft
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="mt-5 rounded-2xl border bg-slate-50 p-4">
            <h2 className="text-lg font-bold text-slate-950">Building / Roof Area Guidance</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <InfoCard title="Roof-top Area" text="Useful for roofing sheet, waterproofing, solar panel, tiles and paint estimation." />
              <InfoCard title="Carpet / Built-up Area" text="Use floor-wise rectangular or irregular measurement for built-up planning." />
              <InfoCard title="Future BOQ Link" text="This area can later connect with material estimate, construction cost and RFQ." />
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

function UnitSelect({
  unit,
  setUnit,
}: {
  unit: InputUnit;
  setUnit: (unit: InputUnit) => void;
}) {
  return (
    <label className="text-sm font-semibold text-slate-700">
      Input Unit
      <select
        value={unit}
        onChange={(e) => setUnit(e.target.value as InputUnit)}
        className="mt-2 w-full rounded-xl border px-3 py-3 text-base"
      >
        <option value="feet">Feet</option>
        <option value="meter">Meter</option>
      </select>
    </label>
  );
}

function ResultCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "emerald" | "blue";
}) {
  const bg = tone === "emerald" ? "bg-emerald-50" : tone === "blue" ? "bg-blue-50" : "bg-slate-50";
  const text = tone === "emerald" ? "text-emerald-700" : tone === "blue" ? "text-blue-700" : "text-slate-600";

  return (
    <div className={`rounded-2xl p-4 ${bg}`}>
      <div className={`text-xs font-bold uppercase ${text}`}>{label}</div>
      <div className="mt-1 text-xl font-black text-slate-950 md:text-2xl">{value}</div>
    </div>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <b>{title}</b>
      <p className="mt-2 text-sm text-slate-600">{text}</p>
    </div>
  );
}
