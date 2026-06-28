import { getGeographyLabels } from "./labels";
import type { GeoRow } from "./repository";

export type GeographySelectionLike = {
  state?: GeoRow | null;
  district?: GeoRow | null;
  subdivision?: GeoRow | null;
  block?: GeoRow | null;
  place?: GeoRow | null;
};

export type ResolvedGeography = {
  labels: ReturnType<typeof getGeographyLabels>;
  isUrban: boolean;
  isRural: boolean;
  pincode: string | null;
  displayPath: string[];
};

const URBAN_TYPES = new Set([
  "municipality",
  "municipal_corporation",
  "municipal_council",
  "nagar_panchayat",
  "urban_local_body",
  "town_local_body",
  "town",
  "ward",
  "locality",
]);

export function isUrbanPlace(place?: Pick<GeoRow, "place_type"> | null) {
  if (!place?.place_type) return false;
  return URBAN_TYPES.has(String(place.place_type).toLowerCase());
}

export function isRuralPlace(place?: Pick<GeoRow, "place_type"> | null) {
  if (!place?.place_type) return false;
  return String(place.place_type).toLowerCase() === "village";
}

export function resolveGeography(selection: GeographySelectionLike): ResolvedGeography {
  const labels = getGeographyLabels(selection.state?.slug || null);
  const isUrban = isUrbanPlace(selection.place);
  const isRural = isRuralPlace(selection.place);

  const displayPath = [
    selection.state?.name,
    selection.district?.name,
    selection.subdivision?.name,
    selection.block?.name,
    selection.place?.name,
  ].filter(Boolean) as string[];

  return {
    labels,
    isUrban,
    isRural,
    pincode: selection.place?.pincode || null,
    displayPath,
  };
}
