export type GeographyNode = {
  id: string;
  name: string;
  slug: string;
};

export type GeographySearchResult = {
  country?: GeographyNode | null;
  state?: GeographyNode | null;
  district?: GeographyNode | null;
  subdivision?: GeographyNode | null;
  block?: GeographyNode | null;
  place?: GeographyNode | null;
};
