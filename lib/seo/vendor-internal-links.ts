export type VendorInternalLink = {
  title: string;
  href: string;
  reason: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildVendorInternalLinks(input: {
  vendorSlug: string;

  state?: string | null;

  district?: string | null;

  city?: string | null;

  locality?: string | null;

  categories?: string[];

  services?: string[];

  materials?: string[];
}): VendorInternalLink[] {
  const links: VendorInternalLink[] = [];

  const state = slugify(input.state || "");
  const district = slugify(input.district || "");
  const city = slugify(input.city || "");
  const locality = slugify(input.locality || "");

  (input.categories || []).forEach((category) => {
    const categorySlug = slugify(category);

    links.push({
      title: `${category} in ${input.city}`,
      href: `/seo/services/${state}/${district}/${city}/category/${categorySlug}`,
      reason: "Vendor category authority connection",
    });
  });

  (input.services || []).forEach((service) => {
    const serviceSlug = slugify(service);

    links.push({
      title: `${service} supplier`,
      href: `/search/${serviceSlug}`,
      reason: "Vendor service semantic search connection",
    });
  });

  (input.materials || []).forEach((material) => {
    const materialSlug = slugify(material);

    links.push({
      title: `${material} marketplace`,
      href: `/search/${materialSlug}`,
      reason: "Vendor material semantic search connection",
    });
  });

  if (locality) {
    links.push({
      title: `${input.locality} marketplace`,
      href: `/seo/services/${state}/${district}/${city}/${locality}`,
      reason: "Local marketplace authority",
    });
  }

  return links;
}