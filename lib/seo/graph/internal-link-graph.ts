export function buildInternalLinks(params: {
  state?: string;
  district?: string;
  city?: string;
  module?: string;
}) {
  const { state, district, city, module } = params;

  const links: { label: string; href: string }[] = [];

  // LOCATION LINKS → SEO
  if (city) {
    links.push({
      label: `Need services in ${city}`,
      href: `/need?location=${city}`,
    });

    links.push({
      label: `${city} Construction Services`,
      href: `/seo/services/${state}/${district}`,
    });
  }

  // DISTRICT LINKS → MARKET EXPANSION
  if (district) {
    links.push({
      label: `Suppliers in ${district}`,
      href: `/need?district=${district}`,
    });

    links.push({
      label: `${district} Property Market`,
      href: `/seo/property/${state}/${district}`,
    });
  }

  // STATE LEVEL AUTHORITY LOOP
  if (state) {
    links.push({
      label: `${state} Marketplace`,
      href: `/seo/services/${state}`,
    });

    links.push({
      label: `All locations in ${state}`,
      href: `/seo/location/${state}`,
    });
  }

  return links;
}