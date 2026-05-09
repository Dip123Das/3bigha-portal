export type ProcurementEntityType =
  | "material"
  | "service"
  | "rental"
  | "property"
  | "vendor"
  | "location"
  | "category";

export type ProcurementEntity = {
  id: string;
  label: string;
  type: ProcurementEntityType;
  slug?: string;
  url?: string;
};

export type ProcurementRelation = {
  from: string;
  to: string;
  relation:
    | "requires"
    | "supports"
    | "supplied_by"
    | "served_in"
    | "related_to"
    | "recommended_for";
  reason: string;
};

export type ProcurementKnowledgeGraph = {
  entities: ProcurementEntity[];
  relations: ProcurementRelation[];
  summary: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildProcurementKnowledgeGraph(input: {
  title: string;
  module?: string;
  category?: string | null;
  city?: string | null;
  district?: string | null;
  locality?: string | null;
}) {
  const title = input.title || "Marketplace Requirement";
  const category = input.category || input.module || "Marketplace";
  const city = input.city || "Cooch Behar";
  const district = input.district || "Cooch Behar";
  const locality = input.locality || "Khagrabari";

  const requirementId = `requirement:${slugify(title)}`;
  const categoryId = `category:${slugify(category)}`;
  const cityId = `location:${slugify(city)}`;
  const districtId = `location:${slugify(district)}`;
  const localityId = `location:${slugify(locality)}`;
  const vendorDiscoveryId = `vendor-discovery:${slugify(title)}`;

  const entities: ProcurementEntity[] = [
    {
      id: requirementId,
      label: title,
      type:
        input.module === "materials"
          ? "material"
          : input.module === "services"
          ? "service"
          : input.module === "rentals"
          ? "rental"
          : input.module === "property"
          ? "property"
          : "category",
    },
    {
      id: categoryId,
      label: category,
      type: "category",
    },
    {
      id: cityId,
      label: city,
      type: "location",
    },
    {
      id: districtId,
      label: district,
      type: "location",
    },
    {
      id: localityId,
      label: locality,
      type: "location",
    },
    {
      id: vendorDiscoveryId,
      label: `AI Recommended Vendors for ${title}`,
      type: "vendor",
      url: `/vendor/discovery?q=${encodeURIComponent(title)}&city=${encodeURIComponent(
        city
      )}&district=${encodeURIComponent(district)}&locality=${encodeURIComponent(
        locality
      )}`,
    },
  ];

  const relations: ProcurementRelation[] = [
    {
      from: requirementId,
      to: categoryId,
      relation: "related_to",
      reason: `${title} belongs to the ${category} procurement category.`,
    },
    {
      from: requirementId,
      to: vendorDiscoveryId,
      relation: "supplied_by",
      reason: `AI vendor discovery can recommend suppliers or service providers for ${title}.`,
    },
    {
      from: vendorDiscoveryId,
      to: cityId,
      relation: "served_in",
      reason: `Recommended vendors are filtered by ${city}.`,
    },
    {
      from: vendorDiscoveryId,
      to: districtId,
      relation: "served_in",
      reason: `Recommended vendors are connected to ${district}.`,
    },
    {
      from: vendorDiscoveryId,
      to: localityId,
      relation: "served_in",
      reason: `Recommended vendors may serve ${locality}.`,
    },
    {
      from: categoryId,
      to: vendorDiscoveryId,
      relation: "recommended_for",
      reason: `Vendor recommendations are generated from category, location and marketplace trust signals.`,
    },
  ];

  return {
    entities,
    relations,
    summary: `AI procurement graph connects ${title} with ${category}, ${locality}, ${city}, ${district}, and recommended vendors.`,
  } satisfies ProcurementKnowledgeGraph;
}