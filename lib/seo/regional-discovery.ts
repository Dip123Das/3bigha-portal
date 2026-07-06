import type { SeoModule } from "@/lib/geo/india-geo";

export function getRegionalDiscoveryItems(
  module: SeoModule,
  city: string,
  district: string
) {
  if (module === "property") {
    return [
      `Land for sale in ${city}`,
      `Residential plots in ${city}`,
      `Flats and houses in ${city}`,
      `Commercial property in ${district}`,
      `Builder projects near ${city}`,
      `Investment property in ${district}`,
    ];
  }

  if (module === "materials") {
    return [
      `Cement suppliers in ${city}`,
      `Steel rod dealers in ${city}`,
      `Sand suppliers in ${district}`,
      `Brick suppliers near ${city}`,
      `Plumbing material shops in ${city}`,
      `Electrical material suppliers in ${district}`,
    ];
  }

  if (module === "services") {
    return [
      `Contractors in ${city}`,
      `Mason labour in ${city}`,
      `Electricians in ${district}`,
      `Plumbers near ${city}`,
      `Painters in ${city}`,
      `Turnkey construction services in ${district}`,
    ];
  }

  return [
    `Construction equipment rental in ${city}`,
    `Machine rental in ${district}`,
    `Tool rental near ${city}`,
    `Rental house in ${city}`,
    `Vehicle rental in ${district}`,
    `Building project rental support in ${city}`,
  ];
}

export function getRegionalSearchUrl(query: string, module: SeoModule) {
  return `/search?module=${module}&q=${encodeURIComponent(query)}`;
}

export function getRegionalRfqUrl(query: string, module: SeoModule) {
  return `/rfq?module=${module}&q=${encodeURIComponent(query)}`;
}