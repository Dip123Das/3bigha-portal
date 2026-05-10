export type RecommendationItem = {
  id: string;
  title: string;
  href: string;
  module: string;

  score: number;

  reason?: string;

  locality?: string;
  city?: string;
  district?: string;

  category?: string;
  type?: string;

  price?: number | null;
};

type RecommendationInput = {
  module: "property" | "materials" | "services" | "rentals";

  currentId?: string;

  rows?: any[];

  city?: string;
  district?: string;
  locality?: string;

  category?: string;
  type?: string;

  minPrice?: number | null;
  maxPrice?: number | null;

  userIntent?: string;
};

function safe(v: any) {
  return String(v || "").trim();
}

function num(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function hrefFor(module: string, id: string) {
  if (module === "property") {
    return `/property/${encodeURIComponent(id)}`;
  }

  if (module === "materials") {
    return `/materials/${encodeURIComponent(id)}`;
  }

  if (module === "services") {
    return `/services/${encodeURIComponent(id)}`;
  }

  if (module === "rentals") {
    return `/rentals/${encodeURIComponent(id)}`;
  }

  return `/${module}/${encodeURIComponent(id)}`;
}

function computePriceScore(
  rowPrice: number | null,
  minPrice?: number | null,
  maxPrice?: number | null
) {
  if (
    rowPrice === null ||
    minPrice === null ||
    maxPrice === null ||
    minPrice === undefined ||
    maxPrice === undefined
  ) {
    return 0;
  }

  if (rowPrice >= minPrice && rowPrice <= maxPrice) {
    return 30;
  }

  const midpoint = (minPrice + maxPrice) / 2;
  const distance = Math.abs(rowPrice - midpoint);

  return Math.max(0, 20 - distance / 10000);
}

function reasonFor(score: number) {
  if (score >= 120) {
    return "Strong locality and category match";
  }

  if (score >= 90) {
    return "Relevant nearby opportunity";
  }

  if (score >= 70) {
    return "Potentially relevant recommendation";
  }

  return "General marketplace recommendation";
}

export function buildRecommendations(
  input: RecommendationInput
): RecommendationItem[] {
  const rows = Array.isArray(input.rows)
    ? input.rows
    : [];

  return rows
    .filter(
      (row) =>
        safe(row?.id) &&
        safe(row?.id) !== safe(input.currentId)
    )
    .map((row) => {
      let score = 0;

      const rowCategory =
        safe(row.property_type) ||
        safe(row.category) ||
        safe(row.custom_category) ||
        safe(row.local_name);

      const rowType =
        safe(row.listing_type) ||
        safe(row.provider_kind) ||
        safe(row.packaging_unit);

      const rowPrice =
        num(
          row.price ||
            row.expected_price ||
            row.rate ||
            row.min_price ||
            row.max_price
        );

      if (
        safe(row.locality) &&
        safe(row.locality) === safe(input.locality)
      ) {
        score += 45;
      }

      if (
        safe(row.city) &&
        safe(row.city) === safe(input.city)
      ) {
        score += 35;
      }

      if (
        safe(row.district) &&
        safe(row.district) === safe(input.district)
      ) {
        score += 25;
      }

      if (
        rowCategory &&
        rowCategory === safe(input.category)
      ) {
        score += 40;
      }

      if (
        rowType &&
        rowType === safe(input.type)
      ) {
        score += 25;
      }

      score += computePriceScore(
        rowPrice,
        input.minPrice,
        input.maxPrice
      );

      if (safe(input.userIntent)) {
        score += 10;
      }

      score += 5;

      const title =
        safe(row.title) ||
        safe(row.local_name) ||
        safe(row.custom_service) ||
        "Recommended listing";

      return {
        id: safe(row.id),

        title,

        href: hrefFor(input.module, safe(row.id)),

        module: input.module,

        score,

        reason: reasonFor(score),

        locality: safe(row.locality),
        city: safe(row.city),
        district: safe(row.district),

        category: rowCategory,
        type: rowType,

        price: rowPrice,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}