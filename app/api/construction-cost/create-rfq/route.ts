import { NextResponse } from "next/server";

import { generateConstructionRfqDrafts } from "@/lib/construction-cost/rfq-package-generator";

import type { ConstructionGrade } from "@/lib/construction-cost/cost-config";

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

function normalizeGrade(value: unknown): ConstructionGrade {
  if (value === "economy" || value === "standard" || value === "premium") {
    return value;
  }

  return "standard";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const builtUpAreaSqFt = toNumber(body.builtUpAreaSqFt, 0);

    if (builtUpAreaSqFt < 100) {
      return NextResponse.json(
        {
          ok: false,
          error: "Built-up area must be at least 100 sq.ft.",
        },
        { status: 400 },
      );
    }

    const result = generateConstructionRfqDrafts({
      builtUpAreaSqFt,
      floorCount: toNumber(body.floorCount, 1),
      grade: normalizeGrade(body.grade),
      roomCount: toNumber(body.roomCount, 3),
      bathroomCount: toNumber(body.bathroomCount, 2),
      kitchenCount: toNumber(body.kitchenCount, 1),
      hasInteriorWork: toBoolean(body.hasInteriorWork, false),
      projectStartDate:
        typeof body.projectStartDate === "string"
          ? body.projectStartDate
          : undefined,
      city: typeof body.city === "string" ? body.city : undefined,
      locality: typeof body.locality === "string" ? body.locality : undefined,
      pincode: typeof body.pincode === "string" ? body.pincode : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Construction auto RFQ generation error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to generate construction RFQ packages.",
      },
      { status: 500 },
    );
  }
}