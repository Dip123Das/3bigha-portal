import type { GeoSelection } from "@/components/geography/GeoSelector";
import type { AddressEngineValue } from "@/components/geography/AddressEngine";
import { buildGeographyModel, type GeographyModel } from "./geographyModel";
import { buildNationalAddress, type NationalAddressValue } from "./addressModel";
import { getGeographyLabels, type GeographyLabelSet } from "./labels";

export type GeoContext = {
  geography: GeographyModel;
  address: NationalAddressValue;
  labels: GeographyLabelSet;
};

export function buildGeoContext(input: {
  geography?: GeoSelection;
  address?: AddressEngineValue;
}): GeoContext {
  const geography = buildGeographyModel(input.geography);
  const address = buildNationalAddress({
    geography: input.geography,
    premises_type: input.address?.premises_type,
    house_plot_flat_no: input.address?.house_flat_plot_no,
    building_name: input.address?.building_market_name,
    street_locality: input.address?.street_road_locality,
    landmark: input.address?.landmark,
  });

  return {
    geography,
    address,
    labels: getGeographyLabels(geography.state_slug),
  };
}
