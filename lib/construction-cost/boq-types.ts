import type { ConstructionGrade } from "./cost-config";

export type BoqWorkCategory =
  | "foundation"
  | "rcc"
  | "brickwork"
  | "plaster"
  | "flooring"
  | "painting"
  | "electrical"
  | "plumbing"
  | "doors_windows"
  | "miscellaneous";

export type BoqEstimateInput = {
  builtUpAreaSqFt: number;
  floorCount?: number;
  grade?: ConstructionGrade;
  roomCount?: number;
  bathroomCount?: number;
  kitchenCount?: number;
};

export type BoqItem = {
  category: BoqWorkCategory;
  itemName: string;
  description: string;
  quantity: number;
  unit: string;
  rateHint?: number;
  amountHint?: number;
  vendorCategory: string;
  rfqReadyName: string;
  note: string;
};

export type BoqEstimateResult = {
  builtUpAreaSqFt: number;
  floorCount: number;
  grade: ConstructionGrade;
  roomCount: number;
  bathroomCount: number;
  kitchenCount: number;
  items: BoqItem[];
  assumptions: string[];
};