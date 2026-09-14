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
  geo_selection_mode?: "rural" | "urban" | null;
  lgd_state_code?: number | null;
  lgd_district_code?: number | null;
  lgd_subdistrict_code?: number | null;
  lgd_block_code?: number | null;
  lgd_village_code?: number | null;
  lgd_local_body_code?: number | null;
  lgd_ward_code?: number | null;
  premises_type?: string | null;
  house_plot_flat_no?: string | null;
  building_market_name?: string | null;
  street_road_locality?: string | null;
};

export function addressEngineToBusinessPayload(value: AddressEngineValue) {
  const national = buildNationalAddress({
    geography: value.geography,
    premises_type: value.premises_type,
    house_plot_flat_no: value.house_flat_plot_no,
    building_name: value.building_market_name,
    street_locality: value.street_road_locality,
    landmark: value.landmark,
    pincode: value.pincode,
  });

  return {
    address_line1: [
      national.house_plot_flat_no,
      national.building_name,
    ]
      .filter(Boolean)
      .join(", ") || null,

    address_line2: national.street_locality || null,
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
    geo_selection_mode: national.geo_selection_mode,
    lgd_state_code: national.lgd_state_code,
    lgd_district_code: national.lgd_district_code,
    lgd_subdistrict_code: national.lgd_subdistrict_code,
    lgd_block_code: national.lgd_block_code,
    lgd_village_code: national.lgd_village_code,
    lgd_local_body_code: national.lgd_local_body_code,
    lgd_ward_code: national.lgd_ward_code,
    premises_type: national.premises_type,
    house_plot_flat_no: national.house_plot_flat_no,
    building_market_name: national.building_name,
    street_road_locality: national.street_locality,

    formatted_address: national.formatted_address,
    short_address: national.short_address,
  };
}

export function legacyBusinessToAddressEngine(
  legacy: LegacyBusinessAddress
): AddressEngineValue {
  return {
    geography: legacy.lgd_state_code ? {
      mode: legacy.geo_selection_mode || undefined,
      state: { id: String(legacy.lgd_state_code), name: legacy.state || "", canonical_id: legacy.geo_state_id || null },
      district: legacy.lgd_district_code ? { id: String(legacy.lgd_district_code), name: legacy.district || "", canonical_id: legacy.geo_district_id || null } : null,
      subdivision: legacy.lgd_subdistrict_code ? { id: String(legacy.lgd_subdistrict_code), name: "", canonical_id: legacy.geo_subdivision_id || null } : null,
      block: (legacy.lgd_block_code || legacy.lgd_local_body_code) ? { id: String(legacy.lgd_block_code || legacy.lgd_local_body_code), name: "", canonical_id: legacy.geo_block_id || null, place_type: legacy.geo_selection_mode === "urban" ? "LOCAL_BODY" : null } : null,
      place: (legacy.lgd_village_code || legacy.lgd_ward_code) ? { id: String(legacy.lgd_village_code || legacy.lgd_ward_code), name: legacy.city || "", canonical_id: legacy.geo_place_id || null, place_type: legacy.geo_selection_mode === "urban" ? "WARD" : "VILLAGE", pincode: legacy.pincode || null } : null,
    } : undefined,
    premises_type: legacy.premises_type || null,
    house_flat_plot_no: legacy.house_plot_flat_no || null,
    building_market_name: legacy.building_market_name || legacy.address_line1 || null,
    street_road_locality: legacy.street_road_locality || null,
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
    pincode: value.pincode,
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


export function addressEngineToRentalPayload(value: AddressEngineValue) {
  const national = buildNationalAddress({
    geography: value.geography,
    premises_type: value.premises_type,
    house_plot_flat_no: value.house_flat_plot_no,
    building_name: value.building_market_name,
    street_locality: value.street_road_locality,
    landmark: value.landmark,
    pincode: value.pincode,
  });

  return {
    state: national.state_name,
    district: national.district_name,
    city: national.place_name,
    locality: national.landmark || national.street_locality || null,
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
