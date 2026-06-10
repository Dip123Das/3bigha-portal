export type GeoMarketplaceRankInput = {
  listingGeoPlaceId?: string | null;
  listingGeoBlockId?: string | null;
  listingGeoSubdivisionId?: string | null;
  listingGeoDistrictId?: string | null;
  listingGeoStateId?: string | null;

  buyerGeoPlaceId?: string | null;
  buyerGeoBlockId?: string | null;
  buyerGeoSubdivisionId?: string | null;
  buyerGeoDistrictId?: string | null;
  buyerGeoStateId?: string | null;
};

export function computeMarketplaceGeoScore(input: GeoMarketplaceRankInput) {
  if (
    input.buyerGeoPlaceId &&
    input.listingGeoPlaceId &&
    input.buyerGeoPlaceId === input.listingGeoPlaceId
  ) {
    return { score: 40, level: "place" };
  }

  if (
    input.buyerGeoBlockId &&
    input.listingGeoBlockId &&
    input.buyerGeoBlockId === input.listingGeoBlockId
  ) {
    return { score: 30, level: "block" };
  }

  if (
    input.buyerGeoSubdivisionId &&
    input.listingGeoSubdivisionId &&
    input.buyerGeoSubdivisionId === input.listingGeoSubdivisionId
  ) {
    return { score: 22, level: "subdivision" };
  }

  if (
    input.buyerGeoDistrictId &&
    input.listingGeoDistrictId &&
    input.buyerGeoDistrictId === input.listingGeoDistrictId
  ) {
    return { score: 14, level: "district" };
  }

  if (
    input.buyerGeoStateId &&
    input.listingGeoStateId &&
    input.buyerGeoStateId === input.listingGeoStateId
  ) {
    return { score: 7, level: "state" };
  }

  return { score: 0, level: "none" };
}
