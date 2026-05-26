export const SQFT_PER_SQM = 10.7639104167;
export const SQFT_PER_ACRE = 43560;
export const SQFT_PER_HECTARE = 107639.104167;

export type InputUnit = "feet" | "meter";

export type AreaShape =
  | "rectangle"
  | "average-rectangle"
  | "triangle"
  | "circle"
  | "trapezium"
  | "irregular"
  | "polygon";

export function roundArea(value: number, digits = 2) {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(digits));
}

export function sqmToSqft(value: number) {
  return value * SQFT_PER_SQM;
}

export function sqftToSqm(value: number) {
  return value / SQFT_PER_SQM;
}

function toSqft(area: number, unit: InputUnit) {
  return unit === "meter" ? sqmToSqft(area) : area;
}

function safe(value: number) {
  return Math.max(0, Number(value) || 0);
}

export function rectangleAreaToSqft(length: number, breadth: number, unit: InputUnit) {
  return toSqft(safe(length) * safe(breadth), unit);
}

export function averageRectangleAreaToSqft(
  lengthOne: number,
  lengthTwo: number,
  breadthOne: number,
  breadthTwo: number,
  unit: InputUnit
) {
  const averageLength = (safe(lengthOne) + safe(lengthTwo)) / 2;
  const averageBreadth = (safe(breadthOne) + safe(breadthTwo)) / 2;

  return toSqft(averageLength * averageBreadth, unit);
}

export function triangleAreaToSqft(base: number, height: number, unit: InputUnit) {
  return toSqft((safe(base) * safe(height)) / 2, unit);
}

export function circleAreaToSqft(radius: number, unit: InputUnit) {
  return toSqft(Math.PI * Math.pow(safe(radius), 2), unit);
}

export function trapeziumAreaToSqft(sideA: number, sideB: number, height: number, unit: InputUnit) {
  return toSqft(((safe(sideA) + safe(sideB)) * safe(height)) / 2, unit);
}

export function irregularFourSideAreaToSqft(diagonalOne: number, diagonalTwo: number, unit: InputUnit) {
  return toSqft((safe(diagonalOne) * safe(diagonalTwo)) / 2, unit);
}

export function polygonAreaToSqft(
  points: Array<{ x: number; y: number }>,
  unit: InputUnit
) {
  if (points.length < 3) return 0;

  let area = 0;

  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + 1) % points.length];

    area += current.x * next.y;
    area -= current.y * next.x;
  }

  return toSqft(Math.abs(area) / 2, unit);
}

export function sqftToAcre(value: number) {
  return value / SQFT_PER_ACRE;
}

export function sqftToHectare(value: number) {
  return value / SQFT_PER_HECTARE;
}