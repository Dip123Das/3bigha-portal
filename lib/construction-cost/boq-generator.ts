import {
  BOQ_GRADE_MULTIPLIERS,
  BOQ_ROOM_RULES,
} from "./boq-room-rules";

import type {
  BoqEstimateInput,
  BoqEstimateResult,
  BoqItem,
} from "./boq-types";

import type { ConstructionGrade } from "./cost-config";
import { findPwdBoqMapping } from "./pwd-boq-item-master";

function sanitizeArea(value: number): number {
  if (!Number.isFinite(value)) return 1000;
  return Math.max(100, Math.min(Math.round(value), 100000));
}

function sanitizeCount(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(Math.round(value ?? fallback), 100));
}

function normalizeGrade(value?: ConstructionGrade): ConstructionGrade {
  if (value === "economy" || value === "standard" || value === "premium") {
    return value;
  }

  return "standard";
}

function roundBoqQuantity(value: number, unit: string): number {
  if (unit === "points" || unit === "sets") return Math.max(1, Math.round(value));
  if (unit === "lot") return Math.max(1, Math.ceil(value));
  return Math.round(value);
}

export function generateBoqEstimate(
  input: BoqEstimateInput,
): BoqEstimateResult {
  const builtUpAreaSqFt = sanitizeArea(input.builtUpAreaSqFt);
  const floorCount = Math.max(1, sanitizeCount(input.floorCount, 1));
  const grade = normalizeGrade(input.grade);

  const roomCount = Math.max(
    1,
    sanitizeCount(input.roomCount, Math.max(2, Math.round(builtUpAreaSqFt / 300))),
  );

  const bathroomCount = Math.max(
    1,
    sanitizeCount(input.bathroomCount, Math.max(1, Math.round(roomCount / 2))),
  );

  const kitchenCount = Math.max(1, sanitizeCount(input.kitchenCount, 1));

  const gradeMultiplier = BOQ_GRADE_MULTIPLIERS[grade] ?? 1;
  const floorMultiplier =
    floorCount <= 1 ? 1 : 1 + Math.min(floorCount - 1, 10) * 0.04;

  const roomMultiplier = 1 + Math.max(0, roomCount - 3) * 0.015;
  const bathroomMultiplier = 1 + Math.max(0, bathroomCount - 1) * 0.025;
  const kitchenMultiplier = 1 + Math.max(0, kitchenCount - 1) * 0.015;

  const items: BoqItem[] = BOQ_ROOM_RULES.map((rule) => {
    let multiplier = gradeMultiplier * floorMultiplier;

    if (
      rule.category === "doors_windows" ||
      rule.category === "electrical"
    ) {
      multiplier *= roomMultiplier;
    }

    if (rule.category === "plumbing") {
      multiplier *= bathroomMultiplier * kitchenMultiplier;
    }

    const rawQuantity =
      builtUpAreaSqFt *
      rule.quantityPerSqFt *
      multiplier;

    const quantity = roundBoqQuantity(rawQuantity, rule.unit);

    const pwdMapping = findPwdBoqMapping(rule.category);

    return {
      category: rule.category,
      itemName: rule.itemName,
      description: rule.description,
      quantity,
      unit: rule.unit,
      vendorCategory: rule.vendorCategory,
      rfqReadyName: rule.rfqReadyName,
      note: rule.note,
      pwdCode: pwdMapping?.pwdCode,
      pwdSection: pwdMapping?.pwdSection,
      pwdSource: pwdMapping?.source,
      priceTodayKeys: pwdMapping?.priceTodayKeys,
    };
  });

  return {
    builtUpAreaSqFt,
    floorCount,
    grade,
    roomCount,
    bathroomCount,
    kitchenCount,
    items,
    assumptions: [
      "This BOQ is an early-stage AI/rule-based estimate for planning only.",
      "Final BOQ must be prepared from architectural and structural drawings.",
      "Foundation, RCC and steel quantities must be checked by an engineer.",
      "Electrical and plumbing BOQ should be finalized from room-wise point layout.",
      "Rates are intentionally not fixed here because local market rates vary by location, vendor and brand.",
    ],
  };
}

export function buildBoqRfqDescription(boq: BoqEstimateResult): string {
  return [
    "AI BOQ Estimate:",
    `Built-up area: ${boq.builtUpAreaSqFt} sq.ft`,
    `Floors: ${boq.floorCount}`,
    `Rooms: ${boq.roomCount}`,
    `Bathrooms: ${boq.bathroomCount}`,
    `Kitchen: ${boq.kitchenCount}`,
    `Grade: ${boq.grade}`,
    "",
    "BOQ Items:",
    ...boq.items.map(
      (item) =>
        `• ${item.rfqReadyName}: approx ${item.quantity} ${item.unit} (${item.vendorCategory})`,
    ),
    "",
    "Note: Please quote item-wise rate, total amount, GST/invoice status, timeline, material brand and labour scope.",
  ].join("\n");
}