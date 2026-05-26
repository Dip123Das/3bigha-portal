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
  getDistrictOptions,
  getDistrictRegion,
  indiaLandRegions,
} from "@/lib/measurement/indiaLandRegions";

type CalculatorMode = "land" | "building";
type InputUnit = "feet" | "meter";

type MeasurementPart = {
  id: string;
  mode: CalculatorMode;
  shape: AreaShape;
  label: string;
  squareFeet: number;
  squareMeter: number;
};

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
  const [district, setDistrict] = useState("All districts / local practice");
  const [parts, setParts] = useState<MeasurementPart[]>([]);

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
      regional: convertSqftToRegionalUnits(squareFeet, state, district),
      districtRegion: getDistrictRegion(state, district),
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
    district,
  ]);

    const combinedResult = useMemo(() => {
    const squareFeet = parts.reduce((sum, part) => sum + part.squareFeet, 0);
    const squareMeter = sqftToSqm(squareFeet);

    return {
      squareFeet,
      squareMeter,
      acre: sqftToAcre(squareFeet),
      hectare: sqftToHectare(squareFeet),
      regional: convertSqftToRegionalUnits(squareFeet, state, district),
    };
  }, [parts, state, district]);

  function addCurrentAreaAsPart() {
    const nextPart: MeasurementPart = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      mode,
      shape,
      label: `${mode === "land" ? "Land" : "Building/Roof"} · ${shape}`,
      squareFeet: result.squareFeet,
      squareMeter: result.squareMeter,
    };

    setParts((current) => [...current, nextPart]);
  }

  function removePart(id: string) {
    setParts((current) => current.filter((part) => part.id !== id));
  }

  function clearParts() {
    setParts([]);
  }

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

            <div className="mb-4">
              <div className="mb-2 text-sm font-semibold text-slate-700">
                Shape / Measurement Type
              </div>
              <div className="grid gap-2 sm:grid-cols-5">
                <ShapeButton current={shape} value="rectangle" label="Rectangle" icon="▭" onClick={setShape} />
                <ShapeButton current={shape} value="triangle" label="Triangle" icon="△" onClick={setShape} />
                <ShapeButton current={shape} value="circle" label="Circle" icon="○" onClick={setShape} />
                <ShapeButton current={shape} value="trapezium" label="Trapezium" icon="▱" onClick={setShape} />
                <ShapeButton current={shape} value="irregular" label="Irregular" icon="⬠" onClick={setShape} />
              </div>
            </div>

            <MeasurementGuide shape={shape} mode={mode} />

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
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-slate-700">
                  State / Union Territory
                  <select
                    value={state}
                    onChange={(e) => {
                      const nextState = e.target.value;
                      setState(nextState);
                      setDistrict(getDistrictOptions(nextState)[0]?.name || "All districts / local practice");
                    }}
                    className="mt-2 w-full rounded-xl border px-3 py-3 text-base"
                  >
                    {indiaLandRegions.map((item) => (
                      <option key={item.state} value={item.state}>
                        {item.state}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-semibold text-slate-700">
                  District / City / Local Practice
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="mt-2 w-full rounded-xl border px-3 py-3 text-base"
                  >
                    {getDistrictOptions(state).map((item) => (
                      <option key={item.name} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}

            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              <b>Important:</b> For irregular land, this is a practical estimate. Final
              property registration, boundary disputes and legal agreements should be verified
              with local survey or revenue records.
            </div>
            <button
              type="button"
              onClick={addCurrentAreaAsPart}
              className="mt-4 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
            >
              + Add this area as one part
            </button>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Use this for L-shaped plots, split lands, multiple rooms, roof sections or courtyard houses.
            </p>
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

                {parts.length > 0 ? (
          <section className="mt-5 rounded-2xl border bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Combined Area from Multiple Parts
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Add land, roof or building sections one by one. The total is calculated automatically.
                </p>
              </div>

              <button
                type="button"
                onClick={clearParts}
                className="rounded-xl border px-3 py-2 text-xs font-bold text-slate-600 hover:border-red-300 hover:text-red-700"
              >
                Clear All
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ResultCard label="Total Square Feet" value={`${formatNumber(roundArea(combinedResult.squareFeet))} sqft`} tone="emerald" />
              <ResultCard label="Total Square Meter" value={`${formatNumber(roundArea(combinedResult.squareMeter))} sqm`} tone="blue" />
              <ResultCard label="Total Acre" value={formatNumber(combinedResult.acre, 5)} />
              <ResultCard label="Total Hectare" value={formatNumber(combinedResult.hectare, 5)} />
            </div>

            {mode === "land" ? (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <h3 className="text-sm font-bold text-slate-800">
                  Combined Regional Conversion · {state} · {district}
                </h3>

                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {combinedResult.regional.map((unitItem) => (
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
              </div>
            ) : null}

            <div className="mt-4 grid gap-2">
              {parts.map((part, index) => (
                <div
                  key={part.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-slate-50 px-4 py-3"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      Part {index + 1} · {part.label}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      {formatNumber(roundArea(part.squareFeet))} sqft ·{" "}
                      {formatNumber(roundArea(part.squareMeter))} sqm
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removePart(part.id)}
                    className="rounded-xl border bg-white px-3 py-2 text-xs font-bold text-red-600 hover:border-red-300"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {mode === "land" ? (
          <section className="mt-5 rounded-2xl border bg-slate-50 p-4">
            <div className="mb-3">
              <h2 className="text-lg font-bold text-slate-950">
                Regional Land Conversion · {state} · {district}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                These are local-practice conversions from the universal square feet value.
              </p>
            </div>

            {result.districtRegion.warning ? (
              <div className="mb-3 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">
                {result.districtRegion.warning}
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

function MeasurementGuide({
  shape,
  mode,
}: {
  shape: AreaShape;
  mode: CalculatorMode;
}) {
  const guide =
    shape === "triangle"
      ? {
          title: "Measure base and height",
          text: "Measure the bottom side as base and the straight vertical distance as height.",
          formula: "Area = Base × Height ÷ 2",
        }
      : shape === "circle"
      ? {
          title: "Measure radius",
          text: "Measure from the center point to the boundary. For round tanks or circular land, use radius.",
          formula: "Area = π × Radius × Radius",
        }
      : shape === "trapezium"
      ? {
          title: "Measure two parallel sides and height",
          text: "Use this for land or roof areas where two sides are parallel but unequal.",
          formula: "Area = (Side 1 + Side 2) × Height ÷ 2",
        }
      : shape === "irregular"
      ? {
          title: "Measure two diagonals",
          text: "For irregular 4-side plots or roofs, measure both diagonals crossing the shape.",
          formula: "Approx Area = Diagonal 1 × Diagonal 2 ÷ 2",
        }
      : {
          title: "Measure length and breadth",
          text: "Use this for square, rectangle, room, roof slab, plot or floor measurement.",
          formula: "Area = Length × Breadth",
        };

  return (
    <div className="mb-4 rounded-2xl border border-emerald-100 bg-white p-4">
      <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
        <div className="flex items-center justify-center rounded-2xl bg-emerald-50 p-3">
          <ShapeLargeSvg shape={shape} />
        </div>

        <div>
          <div className="text-sm font-bold text-slate-950">{guide.title}</div>
          <p className="mt-1 text-sm leading-6 text-slate-600">{guide.text}</p>
          <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
            {guide.formula}
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {mode === "land"
              ? "For legal land records, verify final measurement with local survey or registry office."
              : "For building or roof work, use separate parts for rooms, roof sections, stair area or extensions."}
          </p>
        </div>
      </div>
    </div>
  );
}

function ShapeMiniSvg({ shape, active }: { shape: AreaShape; active?: boolean }) {
  const stroke = active ? "#047857" : "#475569";

  return (
    <svg viewBox="0 0 64 44" className="mx-auto h-9 w-12" aria-hidden="true">
      <ShapePath shape={shape} stroke={stroke} />
    </svg>
  );
}

function ShapeLargeSvg({ shape }: { shape: AreaShape }) {
  return (
    <svg viewBox="0 0 160 110" className="h-24 w-full" aria-hidden="true">
      <ShapePath shape={shape} stroke="#047857" large />
    </svg>
  );
}

function ShapePath({
  shape,
  stroke,
  large,
}: {
  shape: AreaShape;
  stroke: string;
  large?: boolean;
}) {
  const width = large ? 160 : 64;
  const height = large ? 110 : 44;

  if (shape === "triangle") {
    return (
      <>
        <polygon points={`${width / 2},10 ${width - 18},${height - 10} 18,${height - 10}`} fill="none" stroke={stroke} strokeWidth="4" />
        {large ? <line x1={width / 2} y1="14" x2={width / 2} y2={height - 10} stroke={stroke} strokeDasharray="5 5" strokeWidth="2" /> : null}
      </>
    );
  }

  if (shape === "circle") {
    return (
      <>
        <circle cx={width / 2} cy={height / 2} r={large ? 36 : 15} fill="none" stroke={stroke} strokeWidth="4" />
        {large ? <line x1={width / 2} y1={height / 2} x2={width / 2 + 36} y2={height / 2} stroke={stroke} strokeDasharray="5 5" strokeWidth="2" /> : null}
      </>
    );
  }

  if (shape === "trapezium") {
    return <polygon points={`36,12 ${width - 22},12 ${width - 10},${height - 10} 14,${height - 10}`} fill="none" stroke={stroke} strokeWidth="4" />;
  }

  if (shape === "irregular") {
    return (
      <>
        <polygon points={`24,10 ${width - 12},18 ${width - 24},${height - 8} 12,${height - 14}`} fill="none" stroke={stroke} strokeWidth="4" />
        {large ? (
          <>
            <line x1="24" y1="10" x2={width - 24} y2={height - 8} stroke={stroke} strokeDasharray="5 5" strokeWidth="2" />
            <line x1={width - 12} y1="18" x2="12" y2={height - 14} stroke={stroke} strokeDasharray="5 5" strokeWidth="2" />
          </>
        ) : null}
      </>
    );
  }

  return (
    <>
      <rect x="12" y="10" width={width - 24} height={height - 20} rx="3" fill="none" stroke={stroke} strokeWidth="4" />
      {large ? (
        <>
          <line x1="18" y1={height - 6} x2={width - 18} y2={height - 6} stroke={stroke} strokeWidth="2" />
          <line x1={width - 8} y1="16" x2={width - 8} y2={height - 16} stroke={stroke} strokeWidth="2" />
        </>
      ) : null}
    </>
  );
}

function ShapeButton({
  current,
  value,
  label,
  icon,
  onClick,
}: {
  current: AreaShape;
  value: AreaShape;
  label: string;
  icon: string;
  onClick: (value: AreaShape) => void;
}) {
  const active = current === value;

  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`rounded-2xl border px-2 py-3 text-center text-xs font-bold transition ${
        active
          ? "border-emerald-600 bg-emerald-50 text-emerald-800"
          : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300"
      }`}
    >
      <span className="sr-only">{icon}</span>
      <ShapeMiniSvg shape={value} active={active} />
      <div className="mt-2">{label}</div>
    </button>
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
