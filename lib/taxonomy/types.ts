export type MarketplaceModule = "property" | "materials" | "services" | "rentals";

export type TaxonomyNode = {
  label: string;
  slug: string;
  query: string;
  group?: string;
  module: MarketplaceModule;
  href: string;
  keywords: string[];
  related?: {
    services?: string[];
    materials?: string[];
    rentals?: string[];
    property?: string[];
  };
};
