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

export function getNearbyGeoCities(
  stateSlug: string,
  districtSlug: string,
  citySlug: string,
  limit = 5
) {
  const sameDistrict = geoCities.filter(
    (item) =>
      item.stateSlug === stateSlug &&
      item.districtSlug === districtSlug &&
      item.citySlug !== citySlug
  );

  const sameState = geoCities.filter(
    (item) =>
      item.stateSlug === stateSlug &&
      item.districtSlug !== districtSlug
  );

  return [...sameDistrict, ...sameState].slice(0, limit);
}

export function getRelatedModuleSeoUrls(
  currentModule: SeoModule,
  stateSlug: string,
  districtSlug: string,
  citySlug: string
) {
  return seoModules
    .filter((module) => module !== currentModule)
    .map((module) => ({
      module,
      url: `/seo/${module}/${stateSlug}/${districtSlug}/${citySlug}`,
    }));
}

export function getDistrictSeoUrls() {
  const districts = new Map<string, { state: string; district: string }>();

  geoCities.forEach((geo) => {
    districts.set(`${geo.stateSlug}/${geo.districtSlug}`, {
      state: geo.stateSlug,
      district: geo.districtSlug,
    });
  });

  return seoModules.flatMap((module) =>
    Array.from(districts.values()).map(
      (item) => `/seo/${module}/${item.state}/${item.district}`
    )
  );
}

export function getStateSeoUrls() {
  const states = Array.from(new Set(geoCities.map((geo) => geo.stateSlug)));

  return seoModules.flatMap((module) =>
    states.map((state) => `/seo/${module}/${state}`)
  );
}

export function getAllSeoUrls() {
  return [
    ...getStateSeoUrls(),
    ...getDistrictSeoUrls(),
    ...getRegionalSeoUrls(),
    ...getLocalitySeoUrls(),
  ];
}

export const geoLocalities: Record<string, string[]> = {
  "cooch-behar-town": [
    "khagrabari",
    "dinhata-road",
    "rail-ghumti",
    "new-town",
    "pilkhana",
  ],
  tufanganj: ["natabari", "balabhut", "andar-fullan"],
  dinhata: ["gosanimari", "bhetaguri", "sahebganj"],
};

export function getLocalitySeoUrls() {
  return seoModules.flatMap((module) =>
    geoCities.flatMap((geo) =>
      (geoLocalities[geo.citySlug] || []).map(
        (locality) =>
          `/seo/${module}/${geo.stateSlug}/${geo.districtSlug}/${geo.citySlug}/${locality}`
      )
    )
  );
}