import type {
  ConstructionTimelinePhaseKey,
  TimelineRiskLevel,
} from "./timeline-types";

import type { ConstructionGrade } from "./cost-config";

export type TimelineRule = {
  key: ConstructionTimelinePhaseKey;
  label: string;
  description: string;
  baseDays: number;
  daysPer1000SqFt: number;
  sequence: number;
  dependency: string;
  vendorCategory: string;
  riskLevel: TimelineRiskLevel;
  note: string;
};

export const TIMELINE_GRADE_MULTIPLIERS: Record<ConstructionGrade, number> = {
  economy: 0.92,
  standard: 1,
  premium: 1.12,
};

export const TIMELINE_RULES: TimelineRule[] = [
  {
    key: "planning",
    label: "Planning & Site Preparation",
    description: "Drawing review, site clearing, layout marking and basic preparation.",
    baseDays: 5,
    daysPer1000SqFt: 2,
    sequence: 1,
    dependency: "Project start",
    vendorCategory: "Engineer / Site Supervisor",
    riskLevel: "medium",
    note: "Delay may occur if drawings, land layout or approvals are not ready.",
  },
  {
    key: "foundation",
    label: "Foundation Work",
    description: "Excavation, footing, foundation concreting and initial curing.",
    baseDays: 12,
    daysPer1000SqFt: 5,
    sequence: 2,
    dependency: "After planning and layout marking",
    vendorCategory: "Foundation Contractor",
    riskLevel: "high",
    note: "Soil condition and water level can strongly affect duration.",
  },
  {
    key: "rcc",
    label: "RCC Structure",
    description: "Column, beam, slab, staircase and RCC curing cycle.",
    baseDays: 20,
    daysPer1000SqFt: 8,
    sequence: 3,
    dependency: "After foundation completion",
    vendorCategory: "RCC Contractor",
    riskLevel: "high",
    note: "RCC duration depends on floor count, shuttering, curing and labour availability.",
  },
  {
    key: "brickwork",
    label: "Brickwork / Blockwork",
    description: "External walls, internal partition walls and masonry work.",
    baseDays: 14,
    daysPer1000SqFt: 5,
    sequence: 4,
    dependency: "After RCC frame readiness",
    vendorCategory: "Masonry Contractor",
    riskLevel: "medium",
    note: "Wall layout and material availability can affect speed.",
  },
  {
    key: "electrical_plumbing_rough",
    label: "Electrical & Plumbing Rough-in",
    description: "Concealed wiring, pipe routing, bathroom and kitchen line preparation.",
    baseDays: 10,
    daysPer1000SqFt: 4,
    sequence: 5,
    dependency: "After brickwork layout completion",
    vendorCategory: "Electrical / Plumbing Contractor",
    riskLevel: "medium",
    note: "Room-wise point clarity is important before plastering.",
  },
  {
    key: "plaster",
    label: "Plaster Work",
    description: "Internal and external plaster work with curing.",
    baseDays: 15,
    daysPer1000SqFt: 5,
    sequence: 6,
    dependency: "After electrical and plumbing rough-in",
    vendorCategory: "Plaster Contractor",
    riskLevel: "medium",
    note: "Weather and curing time may affect completion.",
  },
  {
    key: "flooring",
    label: "Flooring / Tile Work",
    description: "Floor tile laying, bathroom wall tiles and finishing alignment.",
    baseDays: 12,
    daysPer1000SqFt: 4,
    sequence: 7,
    dependency: "After plaster curing and surface preparation",
    vendorCategory: "Tile Contractor",
    riskLevel: "medium",
    note: "Tile size, design and availability can affect duration.",
  },
  {
    key: "doors_windows",
    label: "Doors & Windows",
    description: "Door frame, shutter, window and grill installation.",
    baseDays: 8,
    daysPer1000SqFt: 3,
    sequence: 8,
    dependency: "After masonry and plaster readiness",
    vendorCategory: "Door & Window Vendor",
    riskLevel: "medium",
    note: "Custom fabrication may increase duration.",
  },
  {
    key: "painting",
    label: "Painting",
    description: "Wall putty, primer, internal paint and external paint.",
    baseDays: 14,
    daysPer1000SqFt: 5,
    sequence: 9,
    dependency: "After plaster drying and surface preparation",
    vendorCategory: "Painting Contractor",
    riskLevel: "medium",
    note: "Moisture and weather can delay paint finishing.",
  },
  {
    key: "final_finishing",
    label: "Final Finishing",
    description: "Sanitary fitting, electrical fixture, final hardware and cleaning.",
    baseDays: 10,
    daysPer1000SqFt: 3,
    sequence: 10,
    dependency: "After flooring, painting and fixture readiness",
    vendorCategory: "Finishing Contractor",
    riskLevel: "medium",
    note: "Depends on availability of fittings, fixtures and final vendor coordination.",
  },
  {
    key: "handover",
    label: "Inspection & Handover",
    description: "Final checking, snag correction and handover preparation.",
    baseDays: 4,
    daysPer1000SqFt: 1,
    sequence: 11,
    dependency: "After final finishing",
    vendorCategory: "Site Supervisor",
    riskLevel: "low",
    note: "Snag list quality determines final handover speed.",
  },
];