export type RelatedContentInput = {
  module: "property" | "materials" | "services" | "rentals" | string;
  title?: string;
  category?: string;
  type?: string;
  city?: string;
  district?: string;
  locality?: string;
};

function slugify(value: string) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function clean(value?: string | null) {
  return String(value || "").trim();
}

export function buildRelatedContent(input: RelatedContentInput) {
  const moduleName = clean(input.module || "property");
  const city = clean(input.city || "cooch-behar-town");
  const district = clean(input.district || "cooch-behar");
  const locality = clean(input.locality || "khagrabari");
  const category = clean(input.category || input.type || moduleName);
  const title = clean(input.title || category);

  const stateSlug = "west-bengal";
  const districtSlug = slugify(district || "cooch-behar");
  const citySlug = slugify(city || "cooch-behar-town");
  const localitySlug = slugify(locality || "khagrabari");
  const categorySlug = slugify(category || moduleName);

  return [
    {
      label: `More ${moduleName} in ${city}`,
      href: `/seo/${moduleName}/${stateSlug}/${districtSlug}/${citySlug}`,
      description: `Explore more ${moduleName} listings and opportunities in ${city}.`,
    },
    {
      label: `${category} in ${city}`,
      href: `/seo/${moduleName}/${stateSlug}/${districtSlug}/${citySlug}/category/${categorySlug}`,
      description: `Find more ${category.toLowerCase()} related options in ${city}.`,
    },
    {
      label: `${moduleName} near ${locality}`,
      href: `/seo/${moduleName}/${stateSlug}/${districtSlug}/${citySlug}/${localitySlug}`,
      description: `Discover nearby ${moduleName} options around ${locality}.`,
    },
    {
      label: `Compare vendors for ${title}`,
      href: `/vendor/discovery?q=${encodeURIComponent(title)}`,
      description: `Find AI-recommended vendors, suppliers and service providers for ${title}.`,
    },
    {
      label: `Check latest prices`,
      href: `/price-today`,
      description: `Compare local market price trends before making a decision.`,
    },
    {
      label: `Start a fresh RFQ`,
      href: `/rfq/general/new`,
      description: `Create a new requirement and receive matched vendor responses.`,
    },
  ];
}