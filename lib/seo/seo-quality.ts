export type SeoQualityInput = {
  title?: string | null;
  description?: string | null;
  totalListings?: number | null;
  locality?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
};

export function passesSeoQuality(input: SeoQualityInput) {
  const title = String(input.title || "").trim();
  const description = String(input.description || "").trim();

  const location = [
    input.locality,
    input.city,
    input.district,
    input.state,
  ]
    .map((v) => String(v || "").trim())
    .filter(Boolean)
    .join(" ");

  const listings = Number(input.totalListings || 0);

  if (title.length < 8) return false;

  if (description.length < 120) return false;

  if (location.length < 4) return false;

  if (listings < 3) return false;

  return true;
}
