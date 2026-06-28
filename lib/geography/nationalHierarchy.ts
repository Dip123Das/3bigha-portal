export type NationalGeoLevelKey =
  | "state"
  | "district"
  | "admin1"
  | "admin2"
  | "place";

export type NationalGeoLevel = {
  key: NationalGeoLevelKey;
  label: string;
  required: boolean;
  source:
    | "geo_states"
    | "geo_districts"
    | "geo_subdivisions"
    | "geo_blocks"
    | "geo_places";
};

export type NationalGeoHierarchy = {
  country: "IN";
  stateSlug?: string;
  stateName?: string;
  levels: NationalGeoLevel[];
};

export const DEFAULT_INDIAN_GEO_HIERARCHY: NationalGeoHierarchy = {
  country: "IN",
  levels: [
    {
      key: "state",
      label: "State / Union Territory",
      required: true,
      source: "geo_states",
    },
    {
      key: "district",
      label: "District",
      required: true,
      source: "geo_districts",
    },
    {
      key: "admin1",
      label: "Subdivision / Taluk / Tehsil / Zone",
      required: false,
      source: "geo_subdivisions",
    },
    {
      key: "admin2",
      label: "Block / Municipality / Corporation",
      required: false,
      source: "geo_blocks",
    },
    {
      key: "place",
      label: "Place / Village / Ward / Town",
      required: true,
      source: "geo_places",
    },
  ],
};

const STATE_LEVEL_LABELS: Record<string, Partial<Record<NationalGeoLevelKey, string>>> = {
  "west-bengal": {
    admin1: "Subdivision",
    admin2: "Block / Municipality",
    place: "Place / Village / Ward / Town",
  },
  kerala: {
    admin1: "Taluk",
    admin2: "Local Body / Municipality",
    place: "Village / Town / Ward",
  },
  delhi: {
    admin1: "Administrative Zone",
    admin2: "Municipal Corporation / Ward",
    place: "Locality / Ward",
  },
  maharashtra: {
    admin1: "Taluka / Subdivision",
    admin2: "Municipality / Block",
    place: "Village / Town / Locality",
  },
};

export function getNationalGeoHierarchy(stateSlug?: string): NationalGeoHierarchy {
  const overrides = stateSlug ? STATE_LEVEL_LABELS[stateSlug] || {} : {};

  return {
    ...DEFAULT_INDIAN_GEO_HIERARCHY,
    stateSlug,
    levels: DEFAULT_INDIAN_GEO_HIERARCHY.levels.map((level) => ({
      ...level,
      label: overrides[level.key] || level.label,
    })),
  };
}

export const PREMISES_TYPES = [
  "Residential House",
  "Apartment",
  "Shop",
  "Office",
  "Warehouse",
  "Factory",
  "Godown",
  "Construction Site",
  "Industrial Plot",
  "Commercial Plot",
  "Agricultural Land",
  "Institution",
  "Government Office",
  "Other",
] as const;
