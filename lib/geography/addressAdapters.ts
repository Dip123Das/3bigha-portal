import type { AddressEngineValue } from "@/components/geography/AddressEngine";
import { buildNationalAddress } from "./addressModel";

export type LegacyBusinessAddress = {
  address_line1?: string | null;
  address_line2?: string | null;
  landmark?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;
  geo_state_id?: string | null;
  geo_district_id?: string | null;
  geo_subdivision_id?: string | null;
  geo_block_id?: string | null;
  geo_place_id?: string | null;
};

export function addressEngineToBusinessPayload(value: AddressEngineValue) {
  const national = buildNationalAddress({
    geography: value.geography,
    premises_type: value.premises_type,
    house_plot_flat_no: value.house_flat_plot_no,
    building_name: value.building_market_name,
    street_locality: value.street_road_locality,
    landmark: value.landmark,
  });

  return {
    address_line1: [
      national.house_plot_flat_no,
      national.building_name,
      national.street_locality,
    ]
      .filter(Boolean)
      .join(", ") || null,

    address_line2: national.formatted_address || null,
    landmark: national.landmark,
    city: national.place_name,
    district: national.district_name,
    state: national.state_name,
    pincode: national.pincode,

    geo_state_id: national.geo_state_id,
    geo_district_id: national.geo_district_id,
    geo_subdivision_id: national.geo_subdivision_id,
    geo_block_id: national.geo_block_id,
    geo_place_id: national.geo_place_id,

    formatted_address: national.formatted_address,
    short_address: national.short_address,
  };
}

export function legacyBusinessToAddressEngine(
  legacy: LegacyBusinessAddress
): AddressEngineValue {
  return {
    premises_type: null,
    house_flat_plot_no: null,
    building_market_name: legacy.address_line1 || null,
    street_road_locality: legacy.address_line2 || legacy.city || null,
    landmark: legacy.landmark || null,
  };
}


export function addressEngineToBuilderProjectPayload(value: AddressEngineValue) {
  const national = buildNationalAddress({
    geography: value.geography,
    premises_type: value.premises_type,
    house_plot_flat_no: value.house_flat_plot_no,
    building_name: value.building_market_name,
    street_locality: value.street_road_locality,
    landmark: value.landmark,
  });

  return {
    address_line: [
      national.house_plot_flat_no,
      national.building_name,
      national.street_locality,
    ]
      .filter(Boolean)
      .join(", ") || null,

    locality: national.landmark || national.street_locality || null,
    city: national.place_name,
    district: national.district_name,
    state: national.state_name,
    pincode: national.pincode,

    geo_state_id: national.geo_state_id,
    geo_district_id: national.geo_district_id,
    geo_subdivision_id: national.geo_subdivision_id,
    geo_block_id: national.geo_block_id,
    geo_place_id: national.geo_place_id,
  };
}
