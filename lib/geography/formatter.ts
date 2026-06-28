export type AddressParts = {
  premisesType?: string | null;
  houseFlatPlotNo?: string | null;
  buildingMarketName?: string | null;
  streetRoadLocality?: string | null;
  landmark?: string | null;
  place?: string | null;
  admin2?: string | null;
  admin1?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
};

export function formatAddress(parts: AddressParts) {
  return [
    parts.houseFlatPlotNo,
    parts.buildingMarketName,
    parts.streetRoadLocality,
    parts.landmark,
    parts.place,
    parts.admin2,
    parts.admin1,
    parts.district,
    parts.state,
    parts.pincode ? `PIN ${parts.pincode}` : null,
    parts.country || "India",
  ]
    .filter(Boolean)
    .join(", ");
}
