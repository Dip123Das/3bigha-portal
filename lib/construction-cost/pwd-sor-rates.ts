import type { PwdDistrictChargeRule, PwdSorItem } from "./pwd-sor-types";

export const PWD_DISTRICT_CHARGES: PwdDistrictChargeRule[] = [
  {
    key: "kolkata_zone",
    label: "Kolkata / nearby base zone",
    chargePercent: 0,
    appliesTo: ["building", "sanitary", "electrical"],
  },
  {
    key: "cooch_behar",
    label: "Cooch Behar district",
    chargePercent: 10,
    appliesTo: ["electrical"],
  },
  {
    key: "north_bengal_general",
    label: "North Bengal general district charge",
    chargePercent: 7,
    appliesTo: ["electrical"],
  },
  {
    key: "darjeeling_hill",
    label: "Darjeeling / hill region",
    chargePercent: 15,
    appliesTo: ["electrical", "sanitary"],
  },
  {
    key: "riverine_single",
    label: "Riverine / ferry crossing",
    chargePercent: 5,
    appliesTo: ["electrical"],
  },
];

export const PWD_CORE_SOR_ITEMS: PwdSorItem[] = [
  {
    code: "BLDG-RCC-INDICATIVE",
    domain: "building",
    section: "RCC",
    label: "RCC structural work",
    description:
      "Indicative RCC structural work placeholder mapped to WB PWD Building Works Volume-I. Exact item mapping will be expanded from SOR chapter extraction.",
    unit: "cum",
    baseRate: 8500,
    sourceYear: 2015,
    sourceNote: "WB PWD Building Works Volume-I base SOR, schedule-guided placeholder",
    priceTodayKey: "cement,tmt,aggregate,sand",
    isCoreItem: true,
  },
  {
    code: "BLDG-BRICKWORK-INDICATIVE",
    domain: "building",
    section: "Masonry",
    label: "Brickwork / blockwork",
    description:
      "Indicative masonry work placeholder for walling. To be replaced by exact PWD item codes during full extraction.",
    unit: "cum",
    baseRate: 6200,
    sourceYear: 2015,
    sourceNote: "WB PWD Building Works Volume-I base SOR, schedule-guided placeholder",
    priceTodayKey: "bricks,sand,cement",
    isCoreItem: true,
  },
  {
    code: "SAN-GI-PIPE-15-EXPOSED-2017",
    domain: "sanitary",
    section: "Plumbing",
    label: "GI pipe 15 mm exposed medium",
    description:
      "Supplying, fitting and fixing GI pipe of TATA make, exposed work, 15 mm medium quality.",
    unit: "metre",
    baseRate: 192,
    sourceYear: 2017,
    sourceNote: "WB PWD Sanitary & Plumbing Works Volume-II, 2017",
    priceTodayKey: "gi pipe",
    isCoreItem: true,
  },
  {
    code: "SAN-DWC-HDPE-SN8-150-2017",
    domain: "sanitary",
    section: "Drainage",
    label: "DWC HDPE SN8 drainage pipe 150 mm",
    description:
      "Supplying and laying double wall corrugated HDPE pipe SN8 for underground drainage/sewerage.",
    unit: "metre",
    baseRate: 420,
    sourceYear: 2017,
    sourceNote: "WB PWD Sanitary & Plumbing Works Volume-II, 2017",
    priceTodayKey: "hdpe pipe",
    isCoreItem: true,
  },
  {
    code: "ELEC-FIX-CEILING-FAN-2017",
    domain: "electrical",
    section: "Fixtures",
    label: "Fixing ceiling fan",
    description:
      "Fixing only ceiling fan complete with blades, canopy, fork and connection wire.",
    unit: "each",
    baseRate: 214,
    sourceYear: 2017,
    sourceNote: "WB PWD Electrical Works Volume-I, November 2017",
    isCoreItem: true,
  },
  {
    code: "ELEC-SPN-MCBDB-2017",
    domain: "electrical",
    section: "Distribution Board",
    label: "SPN MCB distribution board",
    description:
      "Supplying and fixing double-door SPN MCB distribution board with IP protection.",
    unit: "each",
    baseRate: 1186,
    sourceYear: 2017,
    sourceNote: "WB PWD Electrical Works Volume-I, November 2017",
    priceTodayKey: "mcb db",
    isCoreItem: true,
  },
  {
    code: "ELEC-WIRING-POINT-INDICATIVE",
    domain: "electrical",
    section: "Wiring",
    label: "Electrical wiring point",
    description:
      "Indicative residential wiring point mapped to PWD electrical wiring sections. Exact conduit/wire item mapping will be expanded later.",
    unit: "point",
    baseRate: 950,
    sourceYear: 2017,
    sourceNote: "WB PWD Electrical Works Volume-I, schedule-guided placeholder",
    priceTodayKey: "wire cable switch mcb",
    isCoreItem: true,
  },
];

export function getPwdDistrictChargePercent(
  districtKey: string,
  domain: PwdSorItem["domain"],
): number {
  const rule = PWD_DISTRICT_CHARGES.find(
    (item) => item.key === districtKey && item.appliesTo.includes(domain),
  );

  return rule?.chargePercent ?? 0;
}
