import type { GeoSelection } from "@/components/geography/GeoSelector";
import { formatAddress } from "./formatter";

export type NationalAddressValue = {
  geo_state_id: string | null;
  geo_district_id: string | null;
  geo_subdivision_id: string | null;
  geo_block_id: string | null;
  geo_place_id: string | null;

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
    geo_state_id: g.state?.id || null,
    geo_district_id: g.district?.id || null,
    geo_subdivision_id: g.subdivision?.id || null,
    geo_block_id: g.block?.id || null,
    geo_place_id: g.place?.id || null,

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
