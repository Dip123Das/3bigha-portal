import { NextResponse } from "next/server";

import { geoCities, seoModules } from "@/lib/geo/india-geo";
import { getSeoCategories } from "@/lib/seo/category-slugs";
import { siteConfig } from "@/lib/seo/site";

export const runtime = "nodejs";

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const today = new Date().toISOString();

  const urls = seoModules.flatMap((module) =>
    geoCities.flatMap((geo) =>
      getSeoCategories(module).map((category) => ({
        loc: `${siteConfig.url}/seo/${module}/${geo.stateSlug}/${geo.districtSlug}/${geo.citySlug}/category/${category.slug}`,
        lastmod: today,
        changefreq: "daily",
        priority: "0.85",
      }))
    )
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (item) => `  <url>
    <loc>${xmlEscape(item.loc)}</loc>
    <lastmod>${item.lastmod}</lastmod>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}