export type QuantityRuleInput = {
  builtUpAreaSqFt: number;
  floorCount: number;
  basementCount?: number;
};

export type StructuralQuantityResult = {
  slabConcreteCum: number;
  beamConcreteCum: number;
  columnConcreteCum: number;
  footingConcreteCum: number;

  brickworkCum: number;

  plasterAreaSqFt: number;
  paintAreaSqFt: number;

  flooringAreaSqFt: number;
  tilePurchaseAreaSqFt: number;

  staircaseFactor: number;
  liftCoreFactor: number;

  assumptions: string[];
};

function round(value: number) {
  return Number(value.toFixed(2));
}

export function calculateStructuralQuantities(
  input: QuantityRuleInput,
): StructuralQuantityResult {
  const totalBuiltup =
    input.builtUpAreaSqFt *
    Math.max(1, input.floorCount);

  const slabConcreteCum =
    totalBuiltup * 0.09 / 35.3147;

  const beamConcreteCum =
    totalBuiltup * 0.03 / 35.3147;

  const columnConcreteCum =
    totalBuiltup * 0.025 / 35.3147;

  const footingConcreteCum =
    totalBuiltup * 0.018 / 35.3147;

  const brickworkCum =
    totalBuiltup * 0.085;

  const plasterAreaSqFt =
    totalBuiltup * 2.2;

  const paintAreaSqFt =
    plasterAreaSqFt * 1.05;

  const flooringAreaSqFt =
    totalBuiltup;

  const tilePurchaseAreaSqFt =
    flooringAreaSqFt * 1.08;

  const staircaseFactor =
    input.floorCount > 2
      ? 1 + ((input.floorCount - 2) * 0.015)
      : 1;

  const liftCoreFactor =
    input.floorCount >= 8
      ? 1 + ((input.floorCount - 8) * 0.01)
      : 1;

  return {
    slabConcreteCum:
      round(slabConcreteCum),

    beamConcreteCum:
      round(beamConcreteCum),

    columnConcreteCum:
      round(columnConcreteCum),

    footingConcreteCum:
      round(footingConcreteCum),

    brickworkCum:
      round(brickworkCum),

    plasterAreaSqFt:
      round(plasterAreaSqFt),

    paintAreaSqFt:
      round(paintAreaSqFt),

    flooringAreaSqFt:
      round(flooringAreaSqFt),

    tilePurchaseAreaSqFt:
      round(tilePurchaseAreaSqFt),

    staircaseFactor:
      round(staircaseFactor),

    liftCoreFactor:
      round(liftCoreFactor),

    assumptions: [
      "Quantities are AI-assisted engineering approximations.",
      "Actual RCC quantities depend on structural drawings.",
      "Lift-core factor activates automatically for high-rise buildings.",
      "Tile wastage factor includes cutting and breakage allowance.",
      "Paint quantity is derived from plastered wall area.",
    ],
  };
}
