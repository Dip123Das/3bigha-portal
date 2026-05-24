export type RoomPlanningInput = {
  builtUpAreaSqFt: number;

  floorCount: number;

  basementCount?: number;

  projectType?:
    | "residential"
    | "commercial"
    | "rental"
    | "villa"
    | "apartment"
    | "warehouse";
};

export type RoomPlanningResult = {
  estimatedBedrooms: number;

  estimatedBathrooms: number;

  estimatedLivingRooms: number;

  estimatedKitchens: number;

  estimatedBalconies: number;

  estimatedParkingSlots: number;

  staircaseAreaSqFt: number;

  liftLobbyAreaSqFt: number;

  circulationAreaSqFt: number;

  usableAreaSqFt: number;

  efficiencyPercent: number;

  planningNotes: string[];
};

function round(value: number) {
  return Math.round(value);
}

export function generateRoomPlanning(
  input: RoomPlanningInput,
): RoomPlanningResult {
  const totalBuiltup =
    input.builtUpAreaSqFt *
    Math.max(1, input.floorCount);

  const estimatedBedrooms =
    Math.max(
      1,
      round(totalBuiltup / 420),
    );

  const estimatedBathrooms =
    Math.max(
      1,
      round(estimatedBedrooms / 1.6),
    );

  const estimatedLivingRooms =
    Math.max(
      1,
      round(estimatedBedrooms / 3),
    );

  const estimatedKitchens =
    input.projectType === "commercial"
      ? 0
      : Math.max(
          1,
          round(input.floorCount / 3),
        );

  const estimatedBalconies =
    Math.max(
      1,
      round(estimatedBedrooms * 0.7),
    );

  const estimatedParkingSlots =
    input.floorCount >= 4
      ? Math.max(
          2,
          round(totalBuiltup / 1800),
        )
      : Math.max(
          1,
          round(totalBuiltup / 2500),
        );

  const staircaseAreaSqFt =
    totalBuiltup * (
      input.floorCount >= 5
        ? 0.055
        : 0.04
    );

  const liftLobbyAreaSqFt =
    input.floorCount >= 8
      ? totalBuiltup * 0.03
      : totalBuiltup * 0.008;

  const circulationAreaSqFt =
    totalBuiltup * (
      input.floorCount >= 10
        ? 0.14
        : 0.09
    );

  const unusableArea =
    staircaseAreaSqFt +
    liftLobbyAreaSqFt +
    circulationAreaSqFt;

  const usableAreaSqFt =
    totalBuiltup - unusableArea;

  const efficiencyPercent =
    (usableAreaSqFt / totalBuiltup) * 100;

  return {
    estimatedBedrooms,

    estimatedBathrooms,

    estimatedLivingRooms,

    estimatedKitchens,

    estimatedBalconies,

    estimatedParkingSlots,

    staircaseAreaSqFt:
      round(staircaseAreaSqFt),

    liftLobbyAreaSqFt:
      round(liftLobbyAreaSqFt),

    circulationAreaSqFt:
      round(circulationAreaSqFt),

    usableAreaSqFt:
      round(usableAreaSqFt),

    efficiencyPercent:
      round(efficiencyPercent),

    planningNotes: [
      "Usable efficiency decreases in high-rise buildings due to circulation and lift-core requirements.",
      "Parking estimation is indicative and depends on local building rules.",
      "Lift lobby allocation activates automatically for high-rise structures.",
      "Commercial projects may require larger circulation and service-core areas.",
    ],
  };
}
