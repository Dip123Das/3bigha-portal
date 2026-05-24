import {
  generateBoqEstimate,
} from "./boq-generator";

import type {
  ConstructionGrade,
} from "./cost-config";

export type DrawingBoqInput = {
  builtUpAreaSqFt: number;
  floorCount: number;
  grade?: ConstructionGrade;
  estimatedRooms: number;
  estimatedBathrooms: number;
  estimatedKitchenCount: number;
  drawingType: string;
};

export function generateBoqFromDrawing(input: DrawingBoqInput) {
  const boq = generateBoqEstimate({
    builtUpAreaSqFt: input.builtUpAreaSqFt,
    floorCount: input.floorCount,
    grade: input.grade || "standard",
    roomCount: input.estimatedRooms,
    bathroomCount: input.estimatedBathrooms,
    kitchenCount: input.estimatedKitchenCount,
  });

  return {
    ...boq,
    drawingType: input.drawingType,
    procurementSummary: {
      rfqReady: true,
      recommendedAction:
        "Create RFQ from drawing-based BOQ and send to matched vendors.",
      packageType:
        "Drawing-based preliminary BOQ package",
    },
  };
}
