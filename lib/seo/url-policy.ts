import { siteConfig } from "@/lib/seo/site";

export const SITE_URL = siteConfig.url || "https://www.3bigha.com";

export function cleanPath(path: string) {
  const safe = String(path || "/").trim();
  if (!safe || safe === "/") return "/";
  return safe.split("?")[0].replace(/\/+$/, "").toLowerCase();
}

export function canonicalUrl(path: string) {
  return `${SITE_URL}${cleanPath(path)}`;
}

export function isIndexableStaticPath(path: string) {
  const p = cleanPath(path);

  if (p.includes("?")) return false;

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
