export type DrawingAnalysisInput = {
  drawingType:
    | "floor_plan"
    | "elevation"
    | "structural"
    | "electrical"
    | "plumbing";

  builtUpAreaSqFt: number;

  floorCount: number;

  basementCount?: number;
};

export type DrawingAnalysisResult = {
  estimatedRooms: number;

  estimatedBathrooms: number;

  estimatedKitchenCount: number;

  estimatedWallLengthRft: number;

  estimatedStaircaseCount: number;

  estimatedLiftCount: number;

  estimatedBalconyAreaSqFt: number;

  estimatedParkingAreaSqFt: number;

  engineeringNotes: string[];

  aiConfidenceScore: number;
};
