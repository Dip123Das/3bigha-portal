import type { GeoSelection } from "@/components/geography/GeoSelector";
import { formatAddress } from "./formatter";

export type NationalAddressValue = {
  geo_state_id: string | null;
  geo_district_id: string | null;
  geo_subdivision_id: string | null;
  geo_block_id: string | null;
  geo_place_id: string | null;
  geo_selection_mode: "rural" | "urban" | null;
  lgd_state_code: number | null;
  lgd_district_code: number | null;
  lgd_subdistrict_code: number | null;
  lgd_block_code: number | null;
  lgd_village_code: number | null;
  lgd_local_body_code: number | null;
  lgd_ward_code: number | null;

  state_name: string | null;
  district_name: string | null;
  admin_level_1_name: string | null;
  admin_level_2_name: string | null;
  place_name: string | null;
  pincode: string | null;

  premises_type: string | null;
  house_plot_flat_no: string | null;
  building_name: string | null;
  street_locality: string | null;
  landmark: string | null;

  formatted_address: string;
  short_address: string;
};

export function buildNationalAddress(input: {
  geography?: GeoSelection;
  premises_type?: string | null;
  house_plot_flat_no?: string | null;
  building_name?: string | null;
  street_locality?: string | null;
  landmark?: string | null;
  pincode?: string | null;
}): NationalAddressValue {
  const g = input.geography || {};
  const mode = g.mode ||
    (g.block?.place_type === "LOCAL_BODY" || g.place?.place_type === "WARD"
      ? "urban"
      : "rural");
  const numberOrNull = (value?: string | null) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  };
  const resolvedPincode = input.pincode || g.place?.pincode || null;

  const formatted_address = formatAddress({
    premisesType: input.premises_type,
    houseFlatPlotNo: input.house_plot_flat_no,
    buildingMarketName: input.building_name,
    streetRoadLocality: input.street_locality,
    landmark: input.landmark,
    place: g.place?.name,
    admin2: g.block?.name,
    admin1: g.subdivision?.name,
    district: g.district?.name,
    state: g.state?.name,
    pincode: resolvedPincode,
  });

  const short_address = [
    g.place?.name,
    g.district?.name,
    g.state?.name,
    resolvedPincode,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    geo_state_id: g.state?.canonical_id || null,
    geo_district_id: g.district?.canonical_id || null,
    geo_subdivision_id: g.subdivision?.canonical_id || null,
    geo_block_id: mode === "rural" ? g.block?.canonical_id || null : null,
    geo_place_id: mode === "rural" ? g.place?.canonical_id || null : null,
    geo_selection_mode: g.state || g.district || g.block || g.place ? mode : null,
    lgd_state_code: numberOrNull(g.state?.lgd_state_code || g.state?.id),
    lgd_district_code: numberOrNull(g.district?.lgd_district_code || g.district?.id),
    lgd_subdistrict_code: numberOrNull(g.subdivision?.lgd_subdistrict_code || g.subdivision?.id),
    lgd_block_code: mode === "rural" ? numberOrNull(g.block?.lgd_block_code || g.block?.id) : null,
    lgd_village_code: mode === "rural" ? numberOrNull(g.place?.lgd_village_code || g.place?.id) : null,
    lgd_local_body_code: mode === "urban" ? numberOrNull(g.block?.lgd_local_body_code || g.block?.id) : null,
    lgd_ward_code: mode === "urban" ? numberOrNull(g.place?.lgd_ward_code || g.place?.id) : null,

    state_name: g.state?.name || null,
    district_name: g.district?.name || null,
    admin_level_1_name: g.subdivision?.name || null,
    admin_level_2_name: g.block?.name || null,
    place_name: g.place?.name || null,
    pincode: resolvedPincode,

    premises_type: input.premises_type || null,
    house_plot_flat_no: input.house_plot_flat_no || null,
    building_name: input.building_name || null,
    street_locality: input.street_locality || null,
    landmark: input.landmark || null,

    formatted_address,
    short_address,
  };
}
