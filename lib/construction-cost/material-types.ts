import type { ConstructionGrade } from "./cost-config";

export type MaterialEstimateInput = {
  builtUpAreaSqFt: number;
  floorCount?: number;
  grade?: ConstructionGrade;
};

export type MaterialEstimateItem = {
  key: string;
  label: string;
  quantity: number;
  unit: string;
  note: string;
  rfqReadyName: string;
};

export type MaterialEstimateResult = {
  builtUpAreaSqFt: number;
  floorCount: number;
  grade: ConstructionGrade;
  items: MaterialEstimateItem[];
  assumptions: string[];
};