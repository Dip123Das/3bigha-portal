export type GeographyLabelSet = {
  admin1: string;
  admin2: string;
  settlement: string;
  pincode: string;
};

const DEFAULT_LABELS: GeographyLabelSet = {
  admin1: "Subdivision / Taluk / Tehsil",
  admin2: "Block / Municipality",
  settlement: "Place / Village / Ward / Town",
  pincode: "Pincode",
};

const STATE_LABELS: Record<string, Partial<GeographyLabelSet>> = {
  "west-bengal": {
    admin1: "Subdivision",
    admin2: "Block / Municipality",
    settlement: "Place / Village / Ward / Town",
  },
  kerala: {
    admin1: "Taluk",
    admin2: "Local Body / Municipality",
    settlement: "Village / Town / Ward",
  },
  delhi: {
    admin1: "Administrative Zone",
    admin2: "Municipal Corporation / Ward",
    settlement: "Locality / Ward",
  },
  maharashtra: {
    admin1: "Taluka / Subdivision",
    admin2: "Municipality / Block",
    settlement: "Village / Town / Locality",
  },
};

export function getGeographyLabels(stateSlug?: string | null): GeographyLabelSet {
  const overrides = stateSlug ? STATE_LABELS[stateSlug] || {} : {};
  return { ...DEFAULT_LABELS, ...overrides };
}
