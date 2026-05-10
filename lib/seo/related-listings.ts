export type RelatedListing = {
  id: string;
  title: string;
  href: string;
  location?: string;
  priceText?: string;
  module: string;
};

type RelatedListingsInput = {
  module: "property" | "materials" | "services" | "rentals";
  currentId?: string;
  rows?: any[];
  city?: string;
  district?: string;
  locality?: string;
  category?: string;
};

function safe(v: any) {
  return String(v || "").trim();
}

function money(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "";

  return `₹ ${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(n)}`;
}

function hrefFor(module: string, id: string) {
  if (module === "property") return `/property/${encodeURIComponent(id)}`;
  if (module === "materials") return `/materials/${encodeURIComponent(id)}`;
  if (module === "services") return `/services/${encodeURIComponent(id)}`;
  if (module === "rentals") return `/rentals/${encodeURIComponent(id)}`;
  return `/${module}/${encodeURIComponent(id)}`;
}

function scoreRow(row: any, input: RelatedListingsInput) {
  let score = 0;

  if (safe(row.id) && safe(row.id) !== safe(input.currentId)) score += 10;

  if (safe(row.locality) && safe(row.locality) === safe(input.locality)) {
    score += 40;
  }

  if (safe(row.city) && safe(row.city) === safe(input.city)) {
    score += 30;
  }

  if (safe(row.district) && safe(row.district) === safe(input.district)) {
    score += 20;
  }

  const rowCategory =
    safe(row.property_type) ||
    safe(row.category) ||
    safe(row.custom_category) ||
    safe(row.local_name);

  if (rowCategory && rowCategory === safe(input.category)) {
    score += 35;
  }

  if (safe(row.updated_at) || safe(row.created_at)) {
    score += 5;
  }

  return score;
}

export function buildRelatedListings(input: RelatedListingsInput) {
  const rows = Array.isArray(input.rows) ? input.rows : [];

  return rows
    .filter((row) => safe(row?.id) && safe(row?.id) !== safe(input.currentId))
    .map((row) => {
      const title =
        safe(row.title) ||
        safe(row.local_name) ||
        safe(row.custom_service) ||
        "Related listing";

      const location = [
        safe(row.locality),
        safe(row.city),
        safe(row.district),
      ]
        .filter(Boolean)
        .join(", ");

      const price =
        row.price ||
        row.expected_price ||
        row.rate ||
        row.min_price ||
        row.max_price ||
        row.latest_price ||
        null;

      return {
        id: safe(row.id),
        title,
        href: hrefFor(input.module, safe(row.id)),
        location,
        priceText: price ? money(price) : "",
        module: input.module,
        score: scoreRow(row, input),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ score, ...item }) => item);
}