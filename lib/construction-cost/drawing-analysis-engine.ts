import type {
  DrawingAnalysisInput,
  DrawingAnalysisResult,
} from "./drawing-types";

function round(value: number) {
  return Math.round(value);
}

export function analyzeConstructionDrawing(
  input: DrawingAnalysisInput,
): DrawingAnalysisResult {
  const totalArea =
    input.builtUpAreaSqFt *
    Math.max(1, input.floorCount);

  const estimatedRooms =
    Math.max(
      2,
      round(totalArea / 280),
    );

  const estimatedBathrooms =
    Math.max(
      1,
      round(estimatedRooms / 2.2),
    );

  const estimatedKitchenCount =
    Math.max(
      1,
      round(input.floorCount / 4),
    );

  const estimatedWallLengthRft =
    round(totalArea * 1.9);

  const estimatedStaircaseCount =
    input.floorCount > 2
      ? Math.max(
          1,
          round(input.floorCount / 12),
        )
      : 1;

  const estimatedLiftCount =
    input.floorCount >= 8
      ? Math.max(
          1,
          round(input.floorCount / 15),
        )
      : 0;

  const estimatedBalconyAreaSqFt =
    round(totalArea * 0.08);

  const estimatedParkingAreaSqFt =
    input.floorCount >= 4
      ? round(totalArea * 0.18)
      : round(totalArea * 0.06);

  return {
    estimatedRooms,

    estimatedBathrooms,

    estimatedKitchenCount,

    estimatedWallLengthRft,

    estimatedStaircaseCount,

    estimatedLiftCount,

    estimatedBalconyAreaSqFt,

    estimatedParkingAreaSqFt,

    engineeringNotes: [
      "AI drawing analysis currently uses engineering heuristics.",
      "Future versions will support PDF and AutoCAD extraction.",
      "Lift estimation activates automatically for high-rise structures.",
      "Parking area estimation increases for multi-storey buildings.",
    ],

    aiConfidenceScore:
      input.floorCount >= 15
        ? 78
        : 84,
  };
}
