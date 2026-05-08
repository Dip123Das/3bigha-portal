function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type RelatedVendorEntity = {
  title: string;
  href: string;
  reason: string;
};

export function buildRelatedVendorEntities(input: {
  city?: string | null;

  district?: string | null;

  state?: string | null;

  categories?: string[];

  services?: string[];

  materials?: string[];
}) {
  const entities: RelatedVendorEntity[] = [];

  const state = slugify(input.state || "");
  const district = slugify(input.district || "");
  const city = slugify(input.city || "");

  (input.categories || []).forEach((category) => {
    const categorySlug = slugify(category);

    entities.push({
      title: `${category} vendors in ${input.city}`,
      href: `/seo/services/${state}/${district}/${city}/category/${categorySlug}`,
      reason: "Category expertise relationship",
    });
  });

  (input.services || []).forEach((service) => {
    const serviceSlug = slugify(service);

    entities.push({
      title: `${service} marketplace`,
      href: `/search/${serviceSlug}`,
      reason: "Service semantic relationship",
    });
  });

  (input.materials || []).forEach((material) => {
    const materialSlug = slugify(material);

    entities.push({
      title: `${material} suppliers`,
      href: `/search/${materialSlug}`,
      reason: "Material supply relationship",
    });
  });

  return entities;
}