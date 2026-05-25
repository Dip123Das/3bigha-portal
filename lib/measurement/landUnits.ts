export type RegionalLandUnit = {
  label: string;
  key: string;
  sqft: number;
  note?: string;
};

export type RegionalLandSystem = {
  state: string;
  warning?: string;
  units: RegionalLandUnit[];
};

export const regionalLandSystems: RegionalLandSystem[] = [
  {
    state: "West Bengal",
    units: [
      { label: "Decimal", key: "decimal", sqft: 435.6 },
      { label: "Katha", key: "katha", sqft: 720 },
      { label: "Bigha", key: "bigha", sqft: 14400 },
    ],
  },
  {
    state: "Assam",
    units: [
      { label: "Katha", key: "katha", sqft: 2880 },
      { label: "Bigha", key: "bigha", sqft: 14400 },
    ],
  },
  {
    state: "Bihar / Jharkhand",
    warning: "Katha values may vary by district and local registry practice.",
    units: [
      { label: "Decimal", key: "decimal", sqft: 435.6 },
      { label: "Katha", key: "katha", sqft: 1361.25 },
      { label: "Bigha", key: "bigha", sqft: 27225 },
    ],
  },
  {
    state: "Uttar Pradesh",
    warning: "Bigha/Biswa values vary by district. Verify locally before legal use.",
    units: [
      { label: "Biswa", key: "biswa", sqft: 1361.25 },
      { label: "Bigha", key: "bigha", sqft: 27225 },
    ],
  },
  {
    state: "Punjab / Haryana",
    units: [
      { label: "Marla", key: "marla", sqft: 272.25 },
      { label: "Kanal", key: "kanal", sqft: 5445 },
      { label: "Acre", key: "acre", sqft: 43560 },
    ],
  },
  {
    state: "Rajasthan",
    warning: "Bigha value can vary regionally. Use local registry standard for final documents.",
    units: [
      { label: "Bigha", key: "bigha", sqft: 27225 },
      { label: "Acre", key: "acre", sqft: 43560 },
    ],
  },
  {
    state: "Gujarat / Maharashtra / Karnataka",
    units: [
      { label: "Guntha", key: "guntha", sqft: 1089 },
      { label: "Acre", key: "acre", sqft: 43560 },
    ],
  },
  {
    state: "Tamil Nadu",
    units: [
      { label: "Cent", key: "cent", sqft: 435.6 },
      { label: "Ground", key: "ground", sqft: 2400 },
      { label: "Acre", key: "acre", sqft: 43560 },
    ],
  },
  {
    state: "Kerala",
    units: [
      { label: "Cent", key: "cent", sqft: 435.6 },
      { label: "Acre", key: "acre", sqft: 43560 },
    ],
  },
  {
    state: "Andhra Pradesh / Telangana",
    units: [
      { label: "Cent", key: "cent", sqft: 435.6 },
      { label: "Guntha", key: "guntha", sqft: 1089 },
      { label: "Acre", key: "acre", sqft: 43560 },
    ],
  },
  {
    state: "Odisha",
    warning: "Local land units may vary. Always verify with local revenue records.",
    units: [
      { label: "Decimal", key: "decimal", sqft: 435.6 },
      { label: "Acre", key: "acre", sqft: 43560 },
    ],
  },
];

export function getRegionalSystem(state: string) {
  return regionalLandSystems.find((item) => item.state === state) || regionalLandSystems[0];
}

export function convertSqftToRegionalUnits(squareFeet: number, state: string) {
  const system = getRegionalSystem(state);

  return system.units.map((unit) => ({
    ...unit,
    value: unit.sqft > 0 ? squareFeet / unit.sqft : 0,
  }));
}
