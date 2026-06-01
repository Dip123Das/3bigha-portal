import { siteConfig } from "@/lib/seo/site";

export const SITE_URL = siteConfig.url || "https://www.3bigha.com";

const TRACKING_PARAMS = [
  "fbclid",
  "gclid",
  "ref",
  "source",
  "tracking",
  "session",
  "token",
];

const SAFE_QUERY_PARAMS = ["page", "category", "state", "city", "locality", "type"];

export function cleanPath(path: string) {
  const safe = String(path || "/").trim();
  if (!safe || safe === "/") return "/";

  const [rawPath] = safe.split("?");

  const cleaned = rawPath
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/\/{2,}/g, "/")
    .replace(/\/+$/, "")
    .toLowerCase();

  return cleaned || "/";
}

export function normalizeSearchParams(input: string | URLSearchParams) {
  const params =
    typeof input === "string"
      ? new URLSearchParams(input.startsWith("?") ? input.slice(1) : input)
      : input;

  const normalized = new URLSearchParams();

  params.forEach((value, key) => {
    const k = key.toLowerCase().trim();
    const v = String(value || "").trim();

    if (!k || !v) return;
    if (k.startsWith("utm_")) return;
    if (TRACKING_PARAMS.includes(k)) return;
    if (!SAFE_QUERY_PARAMS.includes(k)) return;
    if (k === "page" && (v === "1" || v === "0")) return;

    normalized.set(k, v.toLowerCase());
  });

  return normalized.toString();
}

export function normalizePublicUrl(path: string) {
  const safe = String(path || "/").trim();
  const [pathname, query = ""] = safe.split("?");

  const clean = cleanPath(pathname);
  const params = normalizeSearchParams(query);

  return params ? `${clean}?${params}` : clean;
}

export function canonicalUrl(path: string) {
  const normalized = normalizePublicUrl(path);
  const clean = normalized.split("?")[0];
  return `${SITE_URL}${clean}`;
}

export function isIndexableStaticPath(path: string) {
  const p = cleanPath(path);

  if (String(path || "").includes("?")) return false;

  return [
    "/",
    "/property",
    "/materials",
    "/services",
    "/rentals",
    "/blog",
    "/price-today",
    "/investment",
    "/emi-calculator",
    "/land-area-calculator",
    "/cost-calculator",
    "/construction-cost",
    "/house-construction-cost",
    "/compare-rates",
    "/about",
    "/contact",
    "/privacy-policy",
    "/terms-and-conditions",
    "/refund-cancellation-policy",
  ].includes(p);
}

export function hasSeoMinimumQuality(row: Record<string, any>) {
  const title = String(row.title || row.name || "").trim();
  const description = String(row.description || row.excerpt || row.content || "").trim();
  const place = [row.locality, row.city, row.district, row.state]
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .join(" ");

  if (title.length < 6) return false;
  if (description.length < 40 && place.length < 4) return false;

  return true;
}

export function isSafePublicId(value: unknown) {
  const s = String(value || "").trim();
  return s.length >= 8 && !["id", "[id]", "<id>", "undefined", "null"].includes(s);
}
