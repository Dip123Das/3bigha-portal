"use client";

import Link from "next/link";

type ConstructionQuality = "economy" | "standard" | "premium";
type BuildingType =
  | "residential"
  | "apartment"
  | "commercial"
  | "shop"
  | "warehouse"
  | "rural_house";

type Props = {
  areaSqft: number;
  state?: string;
  district?: string;
  buildingType?: BuildingType;
  floors?: number;
  quality?: ConstructionQuality;
  source?: string;
};

function formatNumber(value: number, digits = 0) {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString("en-IN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}

function formatMoney(value: number) {
  if (!Number.isFinite(value)) return "₹0";
  if (value >= 10000000) return `₹${formatNumber(value / 10000000, 2)} Cr`;
  if (value >= 100000) return `₹${formatNumber(value / 100000, 2)} L`;
  return `₹${formatNumber(value)}`;
}

function getQualityMultiplier(quality: ConstructionQuality) {
  if (quality === "economy") return 0.88;
  if (quality === "premium") return 1.28;
  return 1;
}

function getTypeMultiplier(type: BuildingType) {
  if (type === "warehouse") return 0.82;
  if (type === "shop") return 0.9;
  if (type === "commercial") return 1.18;
  if (type === "apartment") return 1.12;
  if (type === "rural_house") return 0.86;
  return 1;
}

function getTypeLabel(type: BuildingType) {
  return type
    .split("_")
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");
}

export default function ConstructionIntelligencePanel({
  areaSqft,
  state = "",
  district = "",
  buildingType = "residential",
  floors = 1,
  quality = "standard",
  source = "land-area-calculator",
}: Props) {
  const safeArea = Math.max(0, Number(areaSqft) || 0);
  const safeFloors = Math.max(1, Number(floors) || 1);
  const builtArea = safeArea * safeFloors;

  const qualityMultiplier = getQualityMultiplier(quality);
  const typeMultiplier = getTypeMultiplier(buildingType);
  const combinedMultiplier = qualityMultiplier * typeMultiplier;

  const bricks = builtArea * 38 * combinedMultiplier;
  const cementBags = builtArea * 0.28 * combinedMultiplier;
  const steelKg = builtArea * 3.6 * combinedMultiplier;
  const sandCft = builtArea * 0.55 * combinedMultiplier;
  const aggregateCft = builtArea * 0.42 * combinedMultiplier;

  const baseRate =
    quality === "economy" ? 1450 : quality === "premium" ? 2400 : 1850;

  const lowBudget = builtArea * baseRate * typeMultiplier * 0.92;
  const highBudget = builtArea * baseRate * typeMultiplier * 1.18;

  const timelineMonths =
    builtArea <= 1000 ? "4–6 months" :
    builtArea <= 2500 ? "6–9 months" :
    builtArea <= 5000 ? "9–14 months" :
    "12+ months";

  const params = new URLSearchParams({
    area: String(Math.round(builtArea)),
    unit: "sqft",
    state,
    district,
    buildingType,
    quality,
    source,
  });

  return (
    <section className="mt-5 rounded-2xl border border-orange-100 bg-orange-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-slate-950">
            Construction Intelligence
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-700">
            Simple material and budget guidance from this calculated area.
          </p>
        </div>

        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-orange-700">
          {formatNumber(builtArea)} sqft planned area
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-4">
          <div className="text-xs font-bold uppercase text-slate-500">
            Building Type
          </div>
          <div className="mt-1 text-lg font-black text-slate-950">
            {getTypeLabel(buildingType)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {safeFloors} floor(s) · {quality}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4">
          <div className="text-xs font-bold uppercase text-slate-500">
            Budget Range
          </div>
          <div className="mt-1 text-lg font-black text-slate-950">
            {formatMoney(lowBudget)} – {formatMoney(highBudget)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            indicative only
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MiniEstimate label="Bricks / Blocks" value={`~${formatNumber(bricks)}`} />
        <MiniEstimate label="Cement" value={`~${formatNumber(cementBags)} bags`} />
        <MiniEstimate label="TMT Steel" value={`~${formatNumber(steelKg / 1000, 2)} MT`} />
        <MiniEstimate label="Sand" value={`~${formatNumber(sandCft)} cft`} />
        <MiniEstimate label="Aggregate" value={`~${formatNumber(aggregateCft)} cft`} />
      </div>

      <div className="mt-3 rounded-xl bg-white px-4 py-3 text-sm leading-6 text-slate-700">
        Approx timeline: <b>{timelineMonths}</b>. Final quantity depends on soil,
        foundation, structural drawing, wall thickness, material quality, room layout,
        labour availability and local rates.
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Link
          href={`/construction-cost?${params.toString()}`}
          className="rounded-2xl bg-slate-950 px-4 py-3 text-center text-sm font-bold text-white hover:bg-slate-800"
        >
          Detailed Cost Estimate
        </Link>

        <Link
          href={`/materials/rfq/new?${params.toString()}`}
          className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-center text-sm font-bold text-emerald-800 hover:bg-emerald-50"
        >
          Create Material RFQ
        </Link>

        <Link
          href={`/services?${params.toString()}&q=construction contractor`}
          className="rounded-2xl border border-blue-200 bg-white px-4 py-3 text-center text-sm font-bold text-blue-800 hover:bg-blue-50"
        >
          Find Contractor
        </Link>
      </div>

      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
        This is practical planning guidance, not a final BOQ. Final estimate should be checked by an engineer, architect or experienced contractor.
      </div>
    </section>
  );
}

function MiniEstimate({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-3">
      <div className="text-xs font-bold uppercase text-slate-500">{label}</div>
      <div className="mt-1 text-base font-black text-slate-950">{value}</div>
    </div>
  );
}
