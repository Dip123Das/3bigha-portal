"use client";

import { useMemo, useState } from "react";
import {
  averageRectangleAreaToSqft,
  circleAreaToSqft,
  irregularFourSideAreaToSqft,
  polygonAreaToSqft,
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
  const [lengthOne, setLengthOne] = useState(42);
  const [lengthTwo, setLengthTwo] = useState(38);
  const [breadthOne, setBreadthOne] = useState(31);
  const [breadthTwo, setBreadthTwo] = useState(29);
  const [base, setBase] = useState(40);
  const [height, setHeight] = useState(30);
  const [radius, setRadius] = useState(20);
  const [parallelA, setParallelA] = useState(40);
  const [parallelB, setParallelB] = useState(25);
  const [diagonalOne, setDiagonalOne] = useState(50);
  const [diagonalTwo, setDiagonalTwo] = useState(35);
  const [polygonPointsText, setPolygonPointsText] = useState(
    "0,0\n50,0\n45,30\n10,35"
  );

  const [drawingPoints, setDrawingPoints] = useState<
    Array<{ x: number; y: number }>
  >([
    { x: 20, y: 20 },
    { x: 220, y: 20 },
    { x: 200, y: 140 },
    { x: 40, y: 160 },
  ]);
  const [unit, setUnit] = useState<InputUnit>("feet");
  const [state, setState] = useState("West Bengal");
  const [district, setDistrict] = useState("All districts / local practice");
  const [parts, setParts] = useState<MeasurementPart[]>([]);

  function syncDrawingToTextarea(points: Array<{ x: number; y: number }>) {
    setPolygonPointsText(
      points
        .map((point) => `${Math.round(point.x)},${Math.round(point.y)}`)
        .join("\n")
    );
  }

  function addDrawingPoint(x: number, y: number) {
    const next = [...drawingPoints, { x, y }];
    setDrawingPoints(next);
    syncDrawingToTextarea(next);
  }

  function clearDrawing() {
    setDrawingPoints([]);
    setPolygonPointsText("");
  }

  function updateDrawingPoint(index: number, x: number, y: number) {
    const next = drawingPoints.map((point, pointIndex) =>
      pointIndex === index ? { x, y } : point
    );

    setDrawingPoints(next);
    syncDrawingToTextarea(next);
  }

  function removeLastDrawingPoint() {
    const next = drawingPoints.slice(0, -1);
    setDrawingPoints(next);
    syncDrawingToTextarea(next);
  }

  const polygonPoints = useMemo(() => {
    return polygonPointsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [x, y] = line.split(",").map(Number);

        return {
          x: Number.isFinite(x) ? x : 0,
          y: Number.isFinite(y) ? y : 0,
        };
      })
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  }, [polygonPointsText]);

  const result = useMemo(() => {
    const squareFeet =
      shape === "average-rectangle"
        ? averageRectangleAreaToSqft(lengthOne, lengthTwo, breadthOne, breadthTwo, unit)
        : shape === "triangle"
        ? triangleAreaToSqft(base, height, unit)
        : shape === "circle"
        ? circleAreaToSqft(radius, unit)
        : shape === "trapezium"
        ? trapeziumAreaToSqft(parallelA, parallelB, height, unit)
        : shape === "irregular"
        ? irregularFourSideAreaToSqft(diagonalOne, diagonalTwo, unit)
        : shape === "polygon"
        ? polygonAreaToSqft(polygonPoints, unit)
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
    lengthOne,
    lengthTwo,
    breadthOne,
    breadthTwo,
    base,
    height,
    radius,
    parallelA,
    parallelB,
    diagonalOne,
    diagonalTwo,
    polygonPoints,
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
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
                <ShapeButton current={shape} value="rectangle" label="Rectangle" icon="▭" onClick={setShape} />
                <ShapeButton current={shape} value="average-rectangle" label="Avg Rect" icon="▰" onClick={setShape} />
                <ShapeButton current={shape} value="triangle" label="Triangle" icon="△" onClick={setShape} />
                <ShapeButton current={shape} value="circle" label="Circle" icon="○" onClick={setShape} />
                <ShapeButton current={shape} value="trapezium" label="Trapezium" icon="▱" onClick={setShape} />
                <ShapeButton current={shape} value="irregular" label="Irregular" icon="⬠" onClick={setShape} />
                <ShapeButton current={shape} value="polygon" label="Polygon" icon="⬡" onClick={setShape} />
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

            {shape === "average-rectangle" ? (
              <div className="grid gap-3 sm:grid-cols-5">
                <label className="text-sm font-semibold text-slate-700">
                  Length Side 1
                  <input type="number" min="0" value={lengthOne} onChange={(e) => setLengthOne(Number(e.target.value))} className="mt-2 w-full rounded-xl border px-3 py-3 text-base" />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Length Side 2
                  <input type="number" min="0" value={lengthTwo} onChange={(e) => setLengthTwo(Number(e.target.value))} className="mt-2 w-full rounded-xl border px-3 py-3 text-base" />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Breadth Side 1
                  <input type="number" min="0" value={breadthOne} onChange={(e) => setBreadthOne(Number(e.target.value))} className="mt-2 w-full rounded-xl border px-3 py-3 text-base" />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Breadth Side 2
                  <input type="number" min="0" value={breadthTwo} onChange={(e) => setBreadthTwo(Number(e.target.value))} className="mt-2 w-full rounded-xl border px-3 py-3 text-base" />
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

            {shape === "polygon" ? (
              <div className="grid gap-4">
                <div>
                  <div className="mb-2 text-sm font-bold text-slate-700">
                    Interactive Drawing Pad
                  </div>

                  <div className="overflow-hidden rounded-2xl border bg-white">
                    <svg
                      viewBox="0 0 300 220"
                      className="h-[260px] w-full touch-none bg-slate-50"
                      onClick={(event) => {
                        const rect = event.currentTarget.getBoundingClientRect();

                        const x =
                          ((event.clientX - rect.left) / rect.width) * 300;

                        const y =
                          ((event.clientY - rect.top) / rect.height) * 220;

                        addDrawingPoint(x, y);
                      }}
                    >
                      <rect
                        x="0"
                        y="0"
                        width="300"
                        height="220"
                        fill="#f8fafc"
                      />

                      {drawingPoints.length >= 2 ? (
                        <polyline
                          points={drawingPoints
                            .map((point) => `${point.x},${point.y}`)
                            .join(" ")}
                          fill="rgba(16,185,129,0.12)"
                          stroke="#059669"
                          strokeWidth="3"
                        />
                      ) : null}

                      {drawingPoints.length >= 3 ? (
                        <line
                          x1={drawingPoints[drawingPoints.length - 1].x}
                          y1={drawingPoints[drawingPoints.length - 1].y}
                          x2={drawingPoints[0].x}
                          y2={drawingPoints[0].y}
                          stroke="#059669"
                          strokeWidth="3"
                          strokeDasharray="6 4"
                        />
                      ) : null}

                      {drawingPoints.map((point, index) => (
                        <g key={`${point.x}-${point.y}-${index}`}>
                          <circle
                            cx={point.x}
                            cy={point.y}
                            r="8"
                            fill="#047857"
                            className="cursor-move"
                            onClick={(event) => event.stopPropagation()}
                            onPointerDown={(event) => {
                              event.stopPropagation();
                              const svg = event.currentTarget.ownerSVGElement;
                              if (!svg) return;

                              event.currentTarget.setPointerCapture(event.pointerId);

                              const movePoint = (moveEvent: PointerEvent) => {
                                const rect = svg.getBoundingClientRect();
                                const x = ((moveEvent.clientX - rect.left) / rect.width) * 300;
                                const y = ((moveEvent.clientY - rect.top) / rect.height) * 220;

                                updateDrawingPoint(
                                  index,
                                  Math.max(0, Math.min(300, x)),
                                  Math.max(0, Math.min(220, y))
                                );
                              };

                              const stopMove = () => {
                                window.removeEventListener("pointermove", movePoint);
                                window.removeEventListener("pointerup", stopMove);
                              };

                              window.addEventListener("pointermove", movePoint);
                              window.addEventListener("pointerup", stopMove);
                            }}
                          />

                          <text
                            x={point.x + 10}
                            y={point.y - 10}
                            fontSize="11"
                            fill="#0f172a"
                            className="select-none"
                          >
                            P{index + 1}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={clearDrawing}
                      className="rounded-xl border px-3 py-2 text-xs font-bold text-red-700"
                    >
                      Clear Drawing
                    </button>

                    <button
                      type="button"
                      onClick={removeLastDrawingPoint}
                      className="rounded-xl border px-3 py-2 text-xs font-bold text-slate-700"
                    >
                      Remove Last Point
                    </button>

                    <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                      Tap to add points. Drag green points to adjust shape.
                    </div>
                  </div>
                </div>

                <label className="text-sm font-semibold text-slate-700">
                  Polygon Points (x,y)
                  <textarea
                    value={polygonPointsText}
                    onChange={(e) => setPolygonPointsText(e.target.value)}
                    className="mt-2 min-h-40 w-full rounded-xl border px-3 py-3 font-mono text-sm"
                  />
                </label>

                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                  Tap on the drawing area to create land corner points.
                  <br />
                  You can also manually edit coordinates below.
                </div>

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
    shape === "average-rectangle"
      ? {
          title: "Measure both length sides and both breadth sides",
          text:
            "Used when a rectangular-looking plot is slightly uneven and opposite sides are not equal.",
          formula: "Area = Average Length × Average Breadth",
          example:
            "Example: Lengths 42 ft & 38 ft → Avg 40 ft; Breadths 31 ft & 29 ft → Avg 30 ft; Area = 1200 sqft",
          usage:
            "Best for village plots, roadside land, old boundary lands and building roofs where sides are almost rectangular but not exactly equal.",
        }
      : shape === "triangle"
      ? {
          title: "Measure base and height",
          text:
            "Used for corner land, triangular roof sections, staircase areas or uneven plot edges.",
          formula: "Area = Base × Height ÷ 2",
          example:
            "Example: Base = 20 ft and Height = 15 ft → Area = 150 sqft",
          usage:
            "Best for triangular corners, roof cuts, roadside land edges and angled construction sections.",
        }
      : shape === "circle"
      ? {
          title: "Measure radius from center",
          text:
            "Used for circular gardens, water tanks, temple areas, wells and round platforms.",
          formula: "Area = π × Radius × Radius",
          example:
            "Example: Radius = 10 ft → Area ≈ 314 sqft",
          usage:
            "Best for round structures, circular plots and curved landscape areas.",
        }
      : shape === "trapezium"
      ? {
          title: "Measure two parallel sides and height",
          text:
            "Used for front-wide rear-narrow land, sloped roof sections and uneven roadside plots.",
          formula: "Area = (Side 1 + Side 2) × Height ÷ 2",
          example:
            "Example: Side 1 = 30 ft, Side 2 = 20 ft, Height = 15 ft → Area = 375 sqft",
          usage:
            "Best for irregular front/rear plots, roof extensions and angled property boundaries.",
        }
      : shape === "polygon"
      ? {
          title: "Measure multiple land corner points",
          text:
            "Used for highly irregular village land, GIS-style mapping, registry map approximation and complex plot boundaries.",
          formula: "Polygon Area Formula (Shoelace Method)",
          example:
            "Example points: 0,0 → 50,0 → 45,30 → 10,35",
          usage:
            "Best for complex land boundaries, survey maps, irregular roadside plots and future GIS integrations.",
        }
      : shape === "irregular"
      ? {
          title: "Measure two diagonals crossing the plot",
          text:
            "Used for village land, bent plots, uneven roof sections, roadside plots and non-standard land shapes.",
          formula: "Approx Area = Diagonal 1 × Diagonal 2 ÷ 2",
          example:
            "Example: Diagonal 1 = 50 ft and Diagonal 2 = 35 ft → Approx Area = 875 sqft",
          usage:
            "This is a practical estimation method. Final registry or legal land measurement should be verified through local survey records.",
        }
      : {
          title: "Measure length and breadth",
          text:
            "Used for rectangular land, rooms, floor slabs, shops, roof areas and regular building layouts.",
          formula: "Area = Length × Breadth",
          example:
            "Example: Length = 40 ft and Breadth = 30 ft → Area = 1200 sqft",
          usage:
            "Best for square or rectangular plots, house rooms, floors and regular property layouts.",
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
          <div className="mt-3 rounded-xl bg-slate-50 px-3 py-3">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Formula
            </div>
            <div className="mt-1 text-sm font-black text-slate-800">
              {guide.formula}
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-3">
            <div className="text-xs font-bold uppercase tracking-wide text-blue-700">
              Practical Example
            </div>
            <div className="mt-1 text-sm font-semibold leading-6 text-slate-800">
              {guide.example}
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-3">
            <div className="text-xs font-bold uppercase tracking-wide text-emerald-700">
              Best Use
            </div>
            <div className="mt-1 text-sm leading-6 text-slate-700">
              {guide.usage}
            </div>
          </div>

          <p className="mt-3 text-xs leading-5 text-slate-500">
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

  if (shape === "average-rectangle") {
    return (
      <>
        <polygon points={`14,12 ${width - 10},8 ${width - 14},${height - 10} 10,${height - 8}`} fill="none" stroke={stroke} strokeWidth="4" />
        {large ? (
          <>
            <line x1="14" y1={height - 4} x2={width - 14} y2={height - 6} stroke={stroke} strokeWidth="2" />
            <line x1={width - 6} y1="12" x2={width - 10} y2={height - 14} stroke={stroke} strokeWidth="2" />
          </>
        ) : null}
      </>
    );
  }

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

  if (shape === "polygon") {
    return (
      <polygon
        points={`12,18 42,8 ${width - 10},24 ${width - 22},${height - 10} 20,${height - 6}`}
        fill="none"
        stroke={stroke}
        strokeWidth="4"
      />
    );
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
