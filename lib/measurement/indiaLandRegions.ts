export type RegionalLandUnit = {
  label: string;
  key: string;
  sqft: number;
  note?: string;
};

export type DistrictLandRegion = {
  name: string;
  warning?: string;
  units: RegionalLandUnit[];
};

export type StateLandRegion = {
  state: string;
  type: "state" | "union_territory";
  warning?: string;
  districts: DistrictLandRegion[];
};

const decimalUnits: RegionalLandUnit[] = [
  { label: "Decimal", key: "decimal", sqft: 435.6 },
  { label: "Acre", key: "acre", sqft: 43560 },
];

const acreOnlyUnits: RegionalLandUnit[] = [
  { label: "Acre", key: "acre", sqft: 43560 },
  { label: "Hectare", key: "hectare", sqft: 107639.104167 },
];

const centUnits: RegionalLandUnit[] = [
  { label: "Cent", key: "cent", sqft: 435.6 },
  { label: "Acre", key: "acre", sqft: 43560 },
];

const gunthaUnits: RegionalLandUnit[] = [
  { label: "Guntha", key: "guntha", sqft: 1089 },
  { label: "Acre", key: "acre", sqft: 43560 },
];

const kanalMarlaUnits: RegionalLandUnit[] = [
  { label: "Marla", key: "marla", sqft: 272.25 },
  { label: "Kanal", key: "kanal", sqft: 5445 },
  { label: "Acre", key: "acre", sqft: 43560 },
];

const wbUnits: RegionalLandUnit[] = [
  { label: "Decimal", key: "decimal", sqft: 435.6 },
  { label: "Katha", key: "katha", sqft: 720 },
  { label: "Bigha", key: "bigha", sqft: 14400 },
];

const assamUnits: RegionalLandUnit[] = [
  { label: "Katha", key: "katha", sqft: 2880 },
  { label: "Bigha", key: "bigha", sqft: 14400 },
  { label: "Acre", key: "acre", sqft: 43560 },
];

const biharJharkhandUnits: RegionalLandUnit[] = [
  { label: "Decimal", key: "decimal", sqft: 435.6 },
  { label: "Katha", key: "katha", sqft: 1361.25 },
  { label: "Bigha", key: "bigha", sqft: 27225 },
];

const upUnits: RegionalLandUnit[] = [
  { label: "Biswa", key: "biswa", sqft: 1361.25 },
  { label: "Bigha", key: "bigha", sqft: 27225 },
  { label: "Acre", key: "acre", sqft: 43560 },
];

const tamilNaduUnits: RegionalLandUnit[] = [
  { label: "Cent", key: "cent", sqft: 435.6 },
  { label: "Ground", key: "ground", sqft: 2400 },
  { label: "Acre", key: "acre", sqft: 43560 },
];

function defaultDistrict(
  units: RegionalLandUnit[],
  warning = "Land units may vary by district, block, mouza, registry office and local practice. Verify before legal use."
): DistrictLandRegion {
  return {
    name: "All districts / local practice",
    warning,
    units,
  };
}

export const indiaLandRegions: StateLandRegion[] = [
  { state: "Andhra Pradesh", type: "state", districts: [defaultDistrict(centUnits), { name: "Vijayawada / Krishna", units: centUnits }, { name: "Visakhapatnam", units: centUnits }] },
  { state: "Arunachal Pradesh", type: "state", districts: [defaultDistrict(acreOnlyUnits)] },
  { state: "Assam", type: "state", districts: [defaultDistrict(assamUnits), { name: "Guwahati / Kamrup", units: assamUnits }, { name: "Dibrugarh", units: assamUnits }, { name: "Silchar / Cachar", units: assamUnits }] },
  { state: "Bihar", type: "state", districts: [defaultDistrict(biharJharkhandUnits), { name: "Patna", units: biharJharkhandUnits }, { name: "Purnea", units: biharJharkhandUnits }, { name: "Bhagalpur", units: biharJharkhandUnits }] },
  { state: "Chhattisgarh", type: "state", districts: [defaultDistrict(decimalUnits), { name: "Raipur", units: decimalUnits }, { name: "Bilaspur", units: decimalUnits }] },
  { state: "Goa", type: "state", districts: [defaultDistrict(acreOnlyUnits), { name: "North Goa", units: acreOnlyUnits }, { name: "South Goa", units: acreOnlyUnits }] },
  { state: "Gujarat", type: "state", districts: [defaultDistrict(gunthaUnits), { name: "Ahmedabad", units: gunthaUnits }, { name: "Surat", units: gunthaUnits }, { name: "Rajkot", units: gunthaUnits }] },
  { state: "Haryana", type: "state", districts: [defaultDistrict(kanalMarlaUnits), { name: "Gurugram", units: kanalMarlaUnits }, { name: "Faridabad", units: kanalMarlaUnits }, { name: "Hisar", units: kanalMarlaUnits }] },
  { state: "Himachal Pradesh", type: "state", districts: [defaultDistrict(kanalMarlaUnits), { name: "Shimla", units: kanalMarlaUnits }, { name: "Kangra", units: kanalMarlaUnits }] },
  { state: "Jharkhand", type: "state", districts: [defaultDistrict(biharJharkhandUnits), { name: "Ranchi", units: biharJharkhandUnits }, { name: "Dhanbad", units: biharJharkhandUnits }] },
  { state: "Karnataka", type: "state", districts: [defaultDistrict(gunthaUnits), { name: "Bengaluru", units: gunthaUnits }, { name: "Mysuru", units: gunthaUnits }, { name: "Mangaluru", units: gunthaUnits }] },
  { state: "Kerala", type: "state", districts: [defaultDistrict(centUnits), { name: "Thiruvananthapuram", units: centUnits }, { name: "Kochi / Ernakulam", units: centUnits }, { name: "Kozhikode", units: centUnits }] },
  { state: "Madhya Pradesh", type: "state", districts: [defaultDistrict(decimalUnits), { name: "Bhopal", units: decimalUnits }, { name: "Indore", units: decimalUnits }] },
  { state: "Maharashtra", type: "state", districts: [defaultDistrict(gunthaUnits), { name: "Mumbai / MMR", units: gunthaUnits }, { name: "Pune", units: gunthaUnits }, { name: "Nagpur", units: gunthaUnits }] },
  { state: "Manipur", type: "state", districts: [defaultDistrict(acreOnlyUnits), { name: "Imphal", units: acreOnlyUnits }] },
  { state: "Meghalaya", type: "state", districts: [defaultDistrict(acreOnlyUnits), { name: "Shillong / East Khasi Hills", units: acreOnlyUnits }] },
  { state: "Mizoram", type: "state", districts: [defaultDistrict(acreOnlyUnits), { name: "Aizawl", units: acreOnlyUnits }] },
  { state: "Nagaland", type: "state", districts: [defaultDistrict(acreOnlyUnits), { name: "Kohima", units: acreOnlyUnits }, { name: "Dimapur", units: acreOnlyUnits }] },
  { state: "Odisha", type: "state", districts: [defaultDistrict(decimalUnits), { name: "Bhubaneswar / Khordha", units: decimalUnits }, { name: "Cuttack", units: decimalUnits }] },
  { state: "Punjab", type: "state", districts: [defaultDistrict(kanalMarlaUnits), { name: "Ludhiana", units: kanalMarlaUnits }, { name: "Amritsar", units: kanalMarlaUnits }, { name: "Patiala", units: kanalMarlaUnits }] },
  { state: "Rajasthan", type: "state", districts: [defaultDistrict(upUnits), { name: "Jaipur", units: upUnits }, { name: "Jodhpur", units: upUnits }, { name: "Udaipur", units: upUnits }] },
  { state: "Sikkim", type: "state", districts: [defaultDistrict(acreOnlyUnits), { name: "Gangtok", units: acreOnlyUnits }] },
  { state: "Tamil Nadu", type: "state", districts: [defaultDistrict(tamilNaduUnits), { name: "Chennai", units: tamilNaduUnits }, { name: "Coimbatore", units: tamilNaduUnits }, { name: "Madurai", units: tamilNaduUnits }] },
  { state: "Telangana", type: "state", districts: [defaultDistrict(centUnits), { name: "Hyderabad", units: centUnits }, { name: "Warangal", units: centUnits }] },
  { state: "Tripura", type: "state", districts: [defaultDistrict(decimalUnits), { name: "Agartala / West Tripura", units: decimalUnits }] },
  { state: "Uttar Pradesh", type: "state", districts: [defaultDistrict(upUnits), { name: "Lucknow", units: upUnits }, { name: "Varanasi", units: upUnits }, { name: "Noida / Gautam Buddha Nagar", units: upUnits }] },
  { state: "Uttarakhand", type: "state", districts: [defaultDistrict(upUnits), { name: "Dehradun", units: upUnits }, { name: "Haridwar", units: upUnits }] },
  { state: "West Bengal", type: "state", districts: [defaultDistrict(wbUnits), { name: "Cooch Behar", units: wbUnits }, { name: "Jalpaiguri", units: wbUnits }, { name: "Malda", units: wbUnits }, { name: "Murshidabad", units: wbUnits }, { name: "Kolkata", units: wbUnits }] },

  { state: "Andaman and Nicobar Islands", type: "union_territory", districts: [defaultDistrict(acreOnlyUnits), { name: "Port Blair / South Andaman", units: acreOnlyUnits }] },
  { state: "Chandigarh", type: "union_territory", districts: [defaultDistrict(kanalMarlaUnits)] },
  { state: "Dadra and Nagar Haveli and Daman and Diu", type: "union_territory", districts: [defaultDistrict(acreOnlyUnits)] },
  { state: "Delhi", type: "union_territory", districts: [defaultDistrict(upUnits), { name: "New Delhi", units: upUnits }, { name: "South Delhi", units: upUnits }, { name: "North Delhi", units: upUnits }] },
  { state: "Jammu and Kashmir", type: "union_territory", districts: [defaultDistrict(kanalMarlaUnits), { name: "Jammu", units: kanalMarlaUnits }, { name: "Srinagar", units: kanalMarlaUnits }] },
  { state: "Ladakh", type: "union_territory", districts: [defaultDistrict(acreOnlyUnits), { name: "Leh", units: acreOnlyUnits }, { name: "Kargil", units: acreOnlyUnits }] },
  { state: "Lakshadweep", type: "union_territory", districts: [defaultDistrict(acreOnlyUnits)] },
  { state: "Puducherry", type: "union_territory", districts: [defaultDistrict(centUnits), { name: "Puducherry", units: centUnits }, { name: "Karaikal", units: centUnits }] },
];

export function getStateRegion(state: string) {
  return indiaLandRegions.find((item) => item.state === state) || indiaLandRegions[0];
}

export function getDistrictRegion(state: string, districtName: string) {
  const stateRegion = getStateRegion(state);
  return (
    stateRegion.districts.find((district) => district.name === districtName) ||
    stateRegion.districts[0]
  );
}

export function getDistrictOptions(state: string) {
  return getStateRegion(state).districts;
}

export function convertSqftToRegionalUnits(squareFeet: number, state: string, districtName: string) {
  const district = getDistrictRegion(state, districtName);

  return district.units.map((unit) => ({
    ...unit,
    value: unit.sqft > 0 ? squareFeet / unit.sqft : 0,
  }));
}
