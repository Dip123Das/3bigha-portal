export type HighriseAdjustmentInput = {
  floorCount: number;
  basementCount?: number;
  builtUpAreaSqFt: number;
};

export type HighriseAdjustmentResult = {
  classification: string;

  rccMultiplier: number;
  steelMultiplier: number;
  labourMultiplier: number;
  logisticsMultiplier: number;
  pumpingMultiplier: number;
  safetyMultiplier: number;

  totalEscalationPercent: number;

  notes: string[];
};

function round(value: number) {
  return Number(value.toFixed(2));
}

export function calculateHighriseAdjustments(
  input: HighriseAdjustmentInput,
): HighriseAdjustmentResult {
  const floors = Math.max(1, input.floorCount);

  let rccMultiplier = 1;
  let steelMultiplier = 1;
  let labourMultiplier = 1;
  let logisticsMultiplier = 1;
  let pumpingMultiplier = 1;
  let safetyMultiplier = 1;

  let classification = "Low-rise";

  const notes: string[] = [];

  if (floors <= 5) {
    classification = "Low-rise";

    notes.push(
      "Standard residential construction economics applied.",
    );
  }

  else if (floors <= 15) {
    classification = "Mid-rise";

    rccMultiplier += 0.05;
    steelMultiplier += 0.04;
    labourMultiplier += 0.06;
    logisticsMultiplier += 0.04;

    notes.push(
      "Mid-rise vertical transport and structural escalation applied.",
    );
  }

  else if (floors <= 30) {
    classification = "High-rise";

    rccMultiplier += 0.11;
    steelMultiplier += 0.12;
    labourMultiplier += 0.14;
    logisticsMultiplier += 0.12;
    pumpingMultiplier += 0.08;
    safetyMultiplier += 0.06;

    notes.push(
      "High-rise RCC, pumping and tower logistics adjustment applied.",
    );
  }

  else if (floors <= 50) {
    classification = "Tower";

    rccMultiplier += 0.18;
    steelMultiplier += 0.21;
    labourMultiplier += 0.22;
    logisticsMultiplier += 0.2;
    pumpingMultiplier += 0.16;
    safetyMultiplier += 0.11;

    notes.push(
      "Tower-grade vertical logistics and structural escalation applied.",
    );
  }

  else {
    classification = "Super High-rise";

    rccMultiplier += 0.28;
    steelMultiplier += 0.32;
    labourMultiplier += 0.3;
    logisticsMultiplier += 0.29;
    pumpingMultiplier += 0.24;
    safetyMultiplier += 0.18;

    notes.push(
      "Super high-rise structural and logistics economics applied.",
    );
  }

  if ((input.basementCount ?? 0) > 0) {
    rccMultiplier += 0.04;
    steelMultiplier += 0.05;

    notes.push(
      "Basement retaining structure escalation applied.",
    );
  }

  const averageMultiplier =
    (
      rccMultiplier +
      steelMultiplier +
      labourMultiplier +
      logisticsMultiplier +
      pumpingMultiplier +
      safetyMultiplier
    ) / 6;

  return {
    classification,

    rccMultiplier: round(rccMultiplier),
    steelMultiplier: round(steelMultiplier),
    labourMultiplier: round(labourMultiplier),
    logisticsMultiplier: round(logisticsMultiplier),
    pumpingMultiplier: round(pumpingMultiplier),
    safetyMultiplier: round(safetyMultiplier),

    totalEscalationPercent: round(
      (averageMultiplier - 1) * 100,
    ),

    notes,
  };
}
