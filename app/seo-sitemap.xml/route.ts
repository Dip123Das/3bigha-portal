import { NextResponse } from "next/server";

import {
  geoCities,
  seoModules,
} from "@/lib/geo/india-geo";

export const runtime = "nodejs";

function buildUrl(path: string) {
  return `https://www.3bigha.com${path}`;
}

export async function GET() {
  const urls: string[] = [];

  urls.push(buildUrl("/"));

  for (const module of seoModules) {
    const states = [...new Set(geoCities.map((g) => g.stateSlug))];

    for (const state of states) {
      urls.push(buildUrl(`/seo/${module}/${state}`));

      const districts = [
        ...new Set(
          geoCities
            .filter((g) => g.stateSlug === state)
            .map((g) => g.districtSlug)
        ),
      ];

      for (const district of districts) {
        urls.push(
          buildUrl(`/seo/${module}/${state}/${district}`)
        );

        const cities = geoCities.filter(
          (g) =>
            g.stateSlug === state &&
            g.districtSlug === district
        );

        for (const city of cities) {
          urls.push(
            buildUrl(
              `/seo/${module}/${state}/${district}/${city.citySlug}`
            )
          );

          const localities = [
            "khagrabari",
            "rail-ghumti",
            "dinhata-road",
            "pilkhana",
            "new-town",
          ];

          for (const locality of localities) {
            urls.push(
              buildUrl(
                `/seo/${module}/${state}/${district}/${city.citySlug}/${locality}`
              )
            );
          }
        }
      }
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
>
${urls
  .map(
    (url) => `
  <url>
    <loc>${url}</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
`
  )
  .join("")}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}