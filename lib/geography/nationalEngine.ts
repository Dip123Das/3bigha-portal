import {
  DEFAULT_INDIAN_GEO_HIERARCHY,
  getNationalGeoHierarchy,
  type NationalGeoHierarchy,
  type NationalGeoLevel,
  type NationalGeoLevelKey,
} from "./nationalHierarchy";

export type NationalGeoNode = {
  id: string;
  name: string;
  slug?: string | null;
  key: NationalGeoLevelKey;
  label: string;
  source: NationalGeoLevel["source"];
  parentId?: string | null;
  pincode?: string | null;
  placeType?: string | null;
};

export type NationalGeoSelection = {
  state?: NationalGeoNode | null;
  district?: NationalGeoNode | null;
  admin1?: NationalGeoNode | null;
  admin2?: NationalGeoNode | null;
  place?: NationalGeoNode | null;
};

export type NationalAddressManualFields = {
  premisesType?: string | null;
  houseFlatPlotNo?: string | null;
  buildingMarketName?: string | null;
  streetRoadLocality?: string | null;
  landmark?: string | null;
};

export type NationalAddress = {
  country: "IN";
  geography: NationalGeoSelection;
  manual: NationalAddressManualFields;
  pincode?: string | null;
};

export function getHierarchyForSelection(
  selection?: Pick<NationalGeoSelection, "state">
): NationalGeoHierarchy {
  return getNationalGeoHierarchy(selection?.state?.slug || undefined);
}

export function getNextLevel(
  currentKey?: NationalGeoLevelKey | null,
  hierarchy: NationalGeoHierarchy = DEFAULT_INDIAN_GEO_HIERARCHY
): NationalGeoLevel | null {
  const levels = hierarchy.levels;

  if (!currentKey) {
    return levels[0] || null;
  }

  const index = levels.findIndex((level) => level.key === currentKey);
  if (index < 0) return levels[0] || null;

  return levels[index + 1] || null;
}

export function buildNationalAddressText(address: NationalAddress) {
  const geo = address.geography;
  const manual = address.manual;

  return [
    manual.houseFlatPlotNo,
    manual.buildingMarketName,
    manual.streetRoadLocality,
    manual.landmark,
    geo.place?.name,
    geo.admin2?.name,
    geo.admin1?.name,
    geo.district?.name,
    geo.state?.name,
    address.pincode || geo.place?.pincode,
    "India",
  ]
    .filter(Boolean)
    .join(", ");
}

export function mapLegacyGeoSelectionToNational(selection: {
  state?: any;
  district?: any;
  subdivision?: any;
  block?: any;
  place?: any;
}): NationalGeoSelection {
  const hierarchy = getNationalGeoHierarchy(selection.state?.slug || undefined);
  const byKey = new Map(hierarchy.levels.map((level) => [level.key, level]));

  function node(key: NationalGeoLevelKey, row: any): NationalGeoNode | null {
    if (!row) return null;
    const level = byKey.get(key);
    if (!level) return null;

    return {
      id: String(row.id),
      name: String(row.name || ""),
      slug: row.slug || null,
      key,
      label: level.label,
      source: level.source,
      parentId:
        row.state_id ||
        row.district_id ||
        row.subdivision_id ||
        row.block_id ||
        null,
      pincode: row.pincode || null,
      placeType: row.place_type || null,
    };
  }

  return {
    state: node("state", selection.state),
    district: node("district", selection.district),
    admin1: node("admin1", selection.subdivision),
    admin2: node("admin2", selection.block),
    place: node("place", selection.place),
  };
}
