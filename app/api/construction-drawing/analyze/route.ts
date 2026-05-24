import { NextResponse } from "next/server";

import { analyzeConstructionDrawing } from "@/lib/construction-cost/drawing-analysis-engine";
import { extractDrawingTextFromFile } from "@/lib/construction-cost/drawing-ocr";
import { parseDrawingRoomsFromText } from "@/lib/construction-cost/drawing-room-parser";
import { detectDrawingVisualSignals } from "@/lib/construction-cost/drawing-visual-signals";
import type { DrawingAnalysisInput } from "@/lib/construction-cost/drawing-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toNumber(value: FormDataEntryValue | null, fallback: number) {
  const numeric = Number(value ?? "");
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeDrawingType(value: FormDataEntryValue | null): DrawingAnalysisInput["drawingType"] {
  if (
    value === "floor_plan" ||
    value === "elevation" ||
    value === "structural" ||
    value === "electrical" ||
    value === "plumbing"
  ) {
    return value;
  }

  return "floor_plan";
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const file = formData.get("drawing");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "Please upload a drawing file.",
        },
        { status: 400 },
      );
    }

    const allowedTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/jpg",
      "application/octet-stream",
    ];

    const lowerName = file.name.toLowerCase();
    const isCadFile =
      lowerName.endsWith(".dwg") ||
      lowerName.endsWith(".dxf");

    if (!allowedTypes.includes(file.type) && !isCadFile) {
      return NextResponse.json(
        {
          success: false,
          error: "Only PDF, image, DWG or DXF drawings are supported.",
        },
        { status: 400 },
      );
    }

    const maxSizeMb = 15;
    const sizeMb = file.size / (1024 * 1024);

    if (sizeMb > maxSizeMb) {
      return NextResponse.json(
        {
          success: false,
          error: `Drawing file must be under ${maxSizeMb} MB.`,
        },
        { status: 400 },
      );
    }

    const builtUpAreaSqFt = toNumber(formData.get("builtUpAreaSqFt"), 1000);
    const floorCount = toNumber(formData.get("floorCount"), 1);
    const basementCount = toNumber(formData.get("basementCount"), 0);

    const normalizedDrawingType = normalizeDrawingType(formData.get("drawingType"));

    const ocr = await extractDrawingTextFromFile(file);
    const roomParse = parseDrawingRoomsFromText(ocr.extractedText);
    const visualSignals = detectDrawingVisualSignals({
      fileName: file.name,
      fileType: file.type || "cad/drawing",
      drawingType: normalizedDrawingType,
    });

    const baseAnalysis = analyzeConstructionDrawing({
      drawingType: normalizedDrawingType,
      builtUpAreaSqFt,
      floorCount,
      basementCount,
    });

    const analysis = {
      ...baseAnalysis,
      estimatedRooms:
        roomParse.bedrooms || baseAnalysis.estimatedRooms,
      estimatedBathrooms:
        roomParse.bathrooms || baseAnalysis.estimatedBathrooms,
      estimatedKitchenCount:
        roomParse.kitchens || baseAnalysis.estimatedKitchenCount,
      estimatedStaircaseCount:
        roomParse.staircases || baseAnalysis.estimatedStaircaseCount,
      estimatedLiftCount:
        roomParse.lifts || baseAnalysis.estimatedLiftCount,
      aiConfidenceScore:
        Math.max(baseAnalysis.aiConfidenceScore, ocr.confidence),
      ocr,
      roomParse,
    };

    return NextResponse.json({
      success: true,
      file: {
        name: file.name,
        type: file.type || "cad/drawing",
        sizeBytes: file.size,
        sizeMb: Number(sizeMb.toFixed(2)),
      },
      analysis,
      ocr,
      roomParse,
      visualSignals,
      note:
        "OCR foundation is active. Deep PDF/image extraction will be connected later.",
    });
  } catch (error) {
    console.error("Construction drawing analysis error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to analyze drawing.",
      },
      { status: 500 },
    );
  }
}
