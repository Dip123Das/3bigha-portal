import { NextResponse } from "next/server";

import { generateConstructionEstimate } from "@/lib/construction-cost/cost-engine";
import type {
  ConstructionEstimateRequest,
  ConstructionProjectType,
} from "@/lib/construction-cost/cost-types";
import type {
  ConstructionGrade,
  ConstructionRegionKey,
} from "@/lib/construction-cost/cost-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toNumber(value: unknown, fallback: number): number {
  const numericValue =
    typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));

  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function normalizeGrade(value: unknown): ConstructionGrade | undefined {
  if (value === "economy" || value === "standard" || value === "premium") {
    return value;
  }

  return undefined;
}

function normalizeRegion(value: unknown): ConstructionRegionKey | undefined {
  if (typeof value !== "string") return undefined;

  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

  const allowedRegions: ConstructionRegionKey[] = [
    "default",
    "west_bengal",
    "cooch_behar",
    "kolkata",
    "north_bengal",
    "assam",
    "bihar",
    "odisha",
  ];

  return allowedRegions.includes(normalized as ConstructionRegionKey)
    ? (normalized as ConstructionRegionKey)
    : undefined;
}

function normalizeProjectType(value: unknown): ConstructionProjectType | undefined {
  const allowedTypes: ConstructionProjectType[] = [
    "residential",
    "commercial",
    "rental",
    "villa",
    "apartment",
    "warehouse",
  ];

  return allowedTypes.includes(value as ConstructionProjectType)
    ? (value as ConstructionProjectType)
    : undefined;
}

function normalizeScheduleMode(value: unknown) {
  if (
    value === "indicative" ||
    value === "pwd_sor" ||
    value === "cpwd_dsr" ||
    value === "price_today"
  ) {
    return value;
  }

  return "indicative";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const builtUpAreaSqFt = toNumber(body.builtUpAreaSqFt, 0);

    if (!builtUpAreaSqFt || builtUpAreaSqFt < 100) {
      return NextResponse.json(
        {
          success: false,
          error: "Built-up area must be at least 100 sq.ft.",
        },
        { status: 400 },
      );
    }

    const payload: ConstructionEstimateRequest = {
      builtUpAreaSqFt,
      floorCount: toNumber(body.floorCount, 1),
      basementCount: toNumber(body.basementCount, 0),
      scheduleMode: normalizeScheduleMode(body.scheduleMode),
      priceTodayLinked: toBoolean(body.priceTodayLinked, false),
      grade: normalizeGrade(body.grade),
      region: normalizeRegion(body.region),
      projectType: normalizeProjectType(body.projectType),
      includeFinishing: toBoolean(body.includeFinishing, true),
      includeElectrical: toBoolean(body.includeElectrical, true),
      includePlumbing: toBoolean(body.includePlumbing, true),
      includeInterior: toBoolean(body.includeInterior, false),
      customRatePerSqFt:
        body.customRatePerSqFt === undefined
          ? undefined
          : toNumber(body.customRatePerSqFt, 0),
    };

    const estimate = generateConstructionEstimate(payload);

    return NextResponse.json(estimate);
  } catch (error) {
    console.error("Construction cost estimate error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate construction cost estimate.",
      },
      { status: 500 },
    );
  }
}