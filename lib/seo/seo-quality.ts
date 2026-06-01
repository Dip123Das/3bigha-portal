export type SeoQualityInput = {
  title?: string | null;
  description?: string | null;
  totalListings?: number | null;
  locality?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  content?: string | null;
};

export type SeoQualityResult = {
  indexable: boolean;
  score: number;
  reasons: string[];
};

function normalize(value: unknown) {
  return String(value || "").trim();
}

export function evaluateSeoQuality(
  input: SeoQualityInput
): SeoQualityResult {
  const reasons: string[] = [];

  const title = normalize(input.title);
  const description = normalize(input.description);
  const content = normalize(input.content);

  const location = [
    input.locality,
    input.city,
    input.district,
    input.state,
  ]
    .map(normalize)
    .filter(Boolean)
    .join(" ");

  const listings = Number(input.totalListings || 0);

  let score = 100;

  if (title.length < 8) {
    score -= 25;
    reasons.push("weak_title");
  }

  if (description.length < 120) {
    score -= 25;
    reasons.push("weak_description");
  }

  if (location.length < 4) {
    score -= 15;
    reasons.push("weak_location");
  }

  if (listings < 3) {
    score -= 25;
    reasons.push("low_listing_count");
  }

  if (content && content.length < 200) {
    score -= 10;
    reasons.push("thin_content");
  }

  if (
    !title &&
    !description &&
    !content
  ) {
    score = 0;
    reasons.push("empty_page");
  }

  score = Math.max(0, Math.min(100, score));

  return {
    indexable: score >= 60,
    score,
    reasons,
  };
}

export function passesSeoQuality(input: SeoQualityInput) {
  return evaluateSeoQuality(input).indexable;
}
