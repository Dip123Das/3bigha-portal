export type GeoCity = {
  state: string;
  stateSlug: string;
  district: string;
  districtSlug: string;
  city: string;
  citySlug: string;
};

export const geoCities: GeoCity[] = [
  {
    state: "West Bengal",
    stateSlug: "west-bengal",
    district: "Cooch Behar",
    districtSlug: "cooch-behar",
    city: "Cooch Behar Town",
    citySlug: "cooch-behar-town",
  },
  {
    state: "West Bengal",
    stateSlug: "west-bengal",
    district: "Cooch Behar",
    districtSlug: "cooch-behar",
    city: "Khagrabari",
    citySlug: "khagrabari",
  },
  {
    state: "West Bengal",
    stateSlug: "west-bengal",
    district: "Cooch Behar",
    districtSlug: "cooch-behar",
    city: "Tufanganj",
    citySlug: "tufanganj",
  },
  {
    state: "West Bengal",
    stateSlug: "west-bengal",
    district: "Cooch Behar",
    districtSlug: "cooch-behar",
    city: "Dinhata",
    citySlug: "dinhata",
  },
  {
    state: "West Bengal",
    stateSlug: "west-bengal",
    district: "Cooch Behar",
    districtSlug: "cooch-behar",
    city: "Mathabhanga",
    citySlug: "mathabhanga",
  },
  {
    state: "West Bengal",
    stateSlug: "west-bengal",
    district: "Cooch Behar",
    districtSlug: "cooch-behar",
    city: "Mekhliganj",
    citySlug: "mekhliganj",
  },
];

export const seoModules = ["property", "materials", "services", "rentals"] as const;

export type SeoModule = (typeof seoModules)[number];

export function isSeoModule(value: string): value is SeoModule {
  return seoModules.includes(value as SeoModule);
}

export function getGeoBySlugs(state: string, district: string, city: string) {
  return geoCities.find(
    (item) =>
      item.stateSlug === state &&
      item.districtSlug === district &&
      item.citySlug === city
  );
}

export function getRegionalSeoPaths() {
  return seoModules.flatMap((module) =>
    geoCities.map((geo) => ({
      module,
      state: geo.stateSlug,
      district: geo.districtSlug,
      city: geo.citySlug,
    }))
  );
}

export function getRegionalSeoUrls() {
  return getRegionalSeoPaths().map(
    (item) =>
      `/seo/${item.module}/${item.state}/${item.district}/${item.city}`
  );
}