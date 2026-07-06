import { passesSeoQuality } from "@/lib/seo/seo-quality";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/lib/seo/site";
import { buildInternalLinks } from "@/lib/seo/graph/internal-link-graph";
import { buildSeoSchemaGraph } from "@/lib/seo/structured-data";
import { seoModules, isSeoModule, type SeoModule } from "@/lib/geo/india-geo";
import { getSeoGeoCities, getSeoDistrictPathsFromDb } from "@/lib/geography/seoAdapter";
import { getSeoCategories } from "@/lib/seo/category-slugs";

export const dynamic = "force-static";

export async function generateStaticParams() {
  return getSeoDistrictPathsFromDb(seoModules);
}

type PageProps = {
  params: {
    module: string;
    state: string;
    district: string;
  };
};

function normalize(value: string) {
  return decodeURIComponent(value || "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function moduleTitle(module: SeoModule) {
  if (module === "property") return "Property";
  if (module === "materials") return "Building Materials";
  if (module === "services") return "Construction Services";
  return "Rental Services";
}

function modulePath(module: SeoModule) {
  if (module === "property") return "/property";
  if (module === "materials") return "/materials";
  if (module === "services") return "/services";
  return "/rentals";
}

function popularSearches(module: SeoModule, location: string) {
  if (module === "materials") {
    return [
      `Cement Suppliers in ${location}`,
      `Steel Suppliers in ${location}`,
      `Sand Suppliers in ${location}`,
      `Brick Suppliers in ${location}`,
      `Construction Materials in ${location}`,
    ];
  }

  if (module === "services") {
    return [
      `Electrical Services in ${location}`,
      `Plumbing Services in ${location}`,
      `Contractors in ${location}`,
      `Architects in ${location}`,
      `Construction Labour in ${location}`,
    ];
  }

  if (module === "rentals") {
    return [
      `JCB Rental in ${location}`,
      `Bulldozer Rental in ${location}`,
      `Excavator Rental in ${location}`,
      `Concrete Mixer Rental in ${location}`,
      `Construction Equipment Rental in ${location}`,
    ];
  }

  return [
    `Property for Sale in ${location}`,
    `Residential Plots in ${location}`,
    `Land for Sale in ${location}`,
    `Commercial Property in ${location}`,
    `Builders in ${location}`,
  ];
}

function districtDescription(
  module: SeoModule,
  district: string,
  state: string
) {
  if (module === "property") {
    return `Explore land, plots, flats, houses, commercial property and builder projects across ${district}, ${state}. 3Bigha helps buyers, sellers, builders and local agents connect through an AI-powered regional property marketplace.`;
  }

  if (module === "materials") {
    return `Find cement, steel, sand, bricks, plumbing, electrical, roofing and construction material suppliers across ${district}, ${state}. Submit requirements and connect with local vendors faster.`;
  }

  if (module === "services") {
    return `Find contractors, architects, labour teams, plumbers, electricians, painters, designers and turnkey construction service providers across ${district}, ${state}.`;
  }

  return `Find construction equipment rentals, machinery rentals, tool rentals, property rentals and local rental providers across ${district}, ${state}.`;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const module = isSeoModule(params.module) ? params.module : "property";
  const districtGeo = (await getSeoGeoCities()).find(
    (geo) => geo.stateSlug === params.state && geo.districtSlug === params.district
  );

  const state = districtGeo?.state || normalize(params.state);
  const district = districtGeo?.district || normalize(params.district);

  const title = `${moduleTitle(module)} in ${district}, ${state} | 3Bigha`;
  const description = districtDescription(module, district, state);
  const path = `/seo/${module}/${params.state}/${params.district}`;

  return {
    title,
    description,
    alternates: {
      canonical: `${siteConfig.url}${path}`,
    },
    openGraph: {
      title,
      description,
      url: `${siteConfig.url}${path}`,
      siteName: siteConfig.name,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function DistrictSeoPage({ params }: PageProps) {
  const module = isSeoModule(params.module) ? params.module : "property";

  const districtGeo = (await getSeoGeoCities()).find(
    (geo) => geo.stateSlug === params.state && geo.districtSlug === params.district
  );

  const state = districtGeo?.state || normalize(params.state);
  const district = districtGeo?.district || normalize(params.district);

  const title = moduleTitle(module);
  const description = districtDescription(module, district, state);

  const districtCities = (await getSeoGeoCities()).filter(
    (geo) => geo.stateSlug === params.state && geo.districtSlug === params.district
  );

  const relatedModules = seoModules.filter((item) => item !== module);
  const relatedCategories = getSeoCategories(module).slice(0, 12);
const internalLinks = buildInternalLinks({ state: params.state, district: params.district });
  const categoryBaseGeo = (await getSeoGeoCities(5000)).find(
    (geo) =>
      geo.stateSlug === params.state &&
      geo.districtSlug === params.district &&
      geo.citySlug
  );
  const searches = popularSearches(module, district);

  const marketplaceStats = [
    { label: "Cities Covered", value: `${districtCities.length}+` },
    { label: "Marketplace Module", value: title },
    { label: "Popular Searches", value: `${searches.length}+` },
    { label: "District Coverage", value: "India" },
  ];

  const districtIntentLinks = [
    { label: `Search ${title} in ${district}`, href: `/search?module=${module}&q=${encodeURIComponent(district)}` },
    { label: `Post ${title} Requirement`, href: `/rfq/general/new?module=${module}&q=${encodeURIComponent(district)}` },
    { label: `Browse Vendors in ${district}`, href: `/vendor/discovery?q=${encodeURIComponent(title)}&district=${encodeURIComponent(district)}` },
    { label: `Local Market Demand in ${district}`, href: `/need` },
  ];

  const localHubLinks = districtCities
    .slice(0, 16)
    .map((city) => ({
      label: `${city.city} Local Marketplace`,
      href: `/location/${city.citySlug}`,
    }));

  const canonicalUrl = `${siteConfig.url}/seo/${module}/${params.state}/${params.district}`;

  const schemaGraph = buildSeoSchemaGraph({
    module,
    url: canonicalUrl,
    geo: {
      state,
      district,
    },
    breadcrumbs: [
      { name: "Home", url: siteConfig.url },
      {
        name: title,
        url: `${siteConfig.url}/seo/${module}/${params.state}`,
      },
      {
        name: district,
        url: canonicalUrl,
      },
    ],
    faqs: [
      {
        question: `How can I find ${title.toLowerCase()} in ${district}?`,
        answer: `You can browse ${title.toLowerCase()} city pages, local marketplace links and RFQ options across ${district} on 3Bigha.`,
      },
      {
        question: `Can I post a requirement for ${title.toLowerCase()} in ${district}?`,
        answer: `Yes. You can submit your requirement on 3Bigha and connect with relevant vendors, suppliers or service providers across ${district}.`,
      },
    ],
  });

  
  const seoRouteParams: any =
    typeof params !== "undefined" && params ? params : {};

  const seoQualityTitle = [
    seoRouteParams.module,
    seoRouteParams.category,
    seoRouteParams.locality,
    seoRouteParams.city,
    seoRouteParams.district,
    seoRouteParams.state,
  ]
    .map((v: any) => String(v || "").replace(/-/g, " ").trim())
    .filter(Boolean)
    .join(" ") || "3bigha SEO Page";

  const seoQualityState = String(seoRouteParams.state || "");
  const seoQualityDistrict = String(seoRouteParams.district || "");
  const seoQualityCity = String(seoRouteParams.city || "");
  const seoQualityLocality = String(seoRouteParams.locality || "");

  const seoQualityLocation = [
    seoQualityState,
    seoQualityDistrict,
    seoQualityCity,
    seoQualityLocality,
  ]
    .filter(Boolean)
    .join(" ");

  const seoQualityDescription =
    `Explore ${seoQualityTitle} on 3bigha.com. Find property, materials, services, rentals, vendors, rates and local marketplace information for ${seoQualityLocation || "India"}. This page is created to help users discover useful local marketplace opportunities with clear route-level context.`;

  const seoQualityCount = Math.max(3, districtCities.length);

  const seoPass = passesSeoQuality({
    title: seoQualityTitle,
    description: seoQualityDescription,
    totalListings: seoQualityCount,
    locality: seoQualityLocality || undefined,
    city: seoQualityCity || undefined,
    district: seoQualityDistrict || undefined,
    state: seoQualityState || undefined,
  });

  if (!seoPass) {
    notFound();
  }

return (
    <main style={{ background: "#f8fafc", minHeight: "100vh" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaGraph) }}
      />

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "42px 16px 18px" }}>
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #c7d2fe",
            borderRadius: 28,
            padding: 32,
            boxShadow: "0 18px 45px rgba(15,23,42,0.08)",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              background: "#e0e7ff",
              color: "#3730a3",
              borderRadius: 12,
              padding: "8px 14px",
              fontWeight: 900,
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            District Marketplace Hub
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "clamp(32px, 6vw, 58px)",
              lineHeight: 1.05,
              letterSpacing: "-0.04em",
              color: "#0f172a",
            }}
          >
            {title} in {district}
          </h1>

          <div style={{ marginTop: 12, color: "#475569", fontSize: 18, fontWeight: 800 }}>
            {state}, India
          </div>

          <p
            style={{
              marginTop: 22,
              maxWidth: 900,
              color: "#334155",
              fontSize: 18,
              lineHeight: 1.8,
              fontWeight: 600,
            }}
          >
            {description}
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 12,
              marginTop: 22,
            }}
          >
            {marketplaceStats.map((item) => (
              <div
                key={item.label}
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 16,
                  padding: 14,
                }}
              >
                <div style={{ color: "#64748b", fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>
                  {item.label}
                </div>
                <div style={{ color: "#0f172a", fontSize: 20, fontWeight: 950, marginTop: 6 }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 16 }}>
            <Link
              href={modulePath(module)}
              style={{
                background: "#0f172a",
                color: "#ffffff",
                padding: "14px 22px",
                borderRadius: 12,
                fontWeight: 900,
              }}
            >
              Browse {title}
            </Link>

            <Link
              href="/rfq/general/new"
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                color: "#0f172a",
                padding: "14px 22px",
                borderRadius: 12,
                fontWeight: 900,
              }}
            >
              Post Requirement
            </Link>
                        <Link
              href={`/vendor/discovery?q=${encodeURIComponent(
                title
              )}&district=${encodeURIComponent(
                district
              )}&city=${encodeURIComponent(district)}`}
              style={{
                background: "#0f172a",
                color: "#ffffff",
                padding: "14px 22px",
                borderRadius: 12,
                fontWeight: 900,
              }}
            >
              AI Recommended Vendors
            </Link>
          </div>
        </div>
      </section>

      <section
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "10px 16px 18px",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 24,
            padding: 26,
            boxShadow: "0 10px 28px rgba(15,23,42,0.05)",
          }}
        >
          <h2 style={{ margin: 0, color: "#0f172a", fontSize: 26 }}>
            Popular searches in {district}
          </h2>

          <p style={{ color: "#475569", lineHeight: 1.7, fontSize: 15, fontWeight: 600 }}>
            These district-level search intents help buyers, sellers, suppliers and service providers discover local marketplace demand across {district}.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 18 }}>
            {searches.map((item) => (
              <Link
                key={item}
                href={`/search?q=${encodeURIComponent(item)}`}
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: "12px 14px",
                  color: "#0f172a",
                  fontWeight: 900,
                  textDecoration: "none",
                }}
              >
                {item}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "0 16px 18px",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 24,
            padding: 26,
            boxShadow: "0 10px 28px rgba(15,23,42,0.05)",
          }}
        >
          <h2 style={{ margin: 0, color: "#0f172a", fontSize: 26 }}>
            District marketplace actions in {district}
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 18 }}>
            {districtIntentLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: "12px 14px",
                  color: "#0f172a",
                  fontWeight: 900,
                  textDecoration: "none",
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {localHubLinks.length > 0 && (
        <section
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "0 16px 18px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 24,
              padding: 26,
              boxShadow: "0 10px 28px rgba(15,23,42,0.05)",
            }}
          >
            <h2 style={{ margin: 0, color: "#0f172a", fontSize: 26 }}>
              Related local markets in {district}
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 18 }}>
              {localHubLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    padding: "12px 14px",
                    color: "#0f172a",
                    fontWeight: 900,
                    textDecoration: "none",
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "10px 16px 34px",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 24,
            padding: 26,
            boxShadow: "0 10px 28px rgba(15,23,42,0.05)",
          }}
        >
          <h2 style={{ margin: 0, color: "#0f172a", fontSize: 26 }}>
            Explore {title} by city in {district}
          </h2>

          <p style={{ color: "#475569", lineHeight: 1.7, fontSize: 15, fontWeight: 600 }}>
            Browse city-level regional pages for better local discovery and search
            visibility across {district}.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
              marginTop: 20,
            }}
          >
            {districtCities.map((city) => (
              <Link
                key={city.citySlug}
                href={`/seo/${module}/${city.stateSlug}/${city.districtSlug}/${city.citySlug}`}
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: 12,
                  color: "#0f172a",
                  fontWeight: 900,
                }}
              >
                {title} in {city.city}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "0 16px 60px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 10,
        }}
      >
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 22,
            padding: 22,
            boxShadow: "0 10px 28px rgba(15,23,42,0.05)",
          }}
        >
          <h2 style={{ margin: 0, color: "#0f172a", fontSize: 18 }}>
            Related district pages
          </h2>

          <p style={{ color: "#64748b", lineHeight: 1.7, fontSize: 14 }}>
            Explore other marketplace categories across {district}.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {relatedModules.map((item) => (
              <Link
                key={item}
                href={`/seo/${item}/${params.state}/${params.district}`}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: "12px 14px",
                  color: "#0f172a",
                  fontWeight: 900,
                  background: "#f8fafc",
                }}
              >
                {moduleTitle(item)} in {district}
              </Link>
            ))}
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 22,
            padding: 22,
            boxShadow: "0 10px 28px rgba(15,23,42,0.05)",
          }}
        >
          <h2 style={{ margin: 0, color: "#0f172a", fontSize: 18 }}>
            District marketplace workflow
          </h2>

          <p style={{ color: "#64748b", lineHeight: 1.7, fontSize: 14 }}>
            3Bigha connects local discovery, RFQ submission, vendor responses,
            quote comparison and unified chat across {district}.
          </p>

          <div style={{ display: "grid", gap: 10 }}>
            {[
              "Search local opportunities",
              "Submit requirement",
              "Compare responses",
              "Chat and close",
            ].map((item) => (
              <div
                key={item}
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: "12px 14px",
                  color: "#0f172a",
                  fontWeight: 900,
                }}
              >
                ✅ {item}
              </div>
            ))}
          </div>
        </div>
      </section>
      {categoryBaseGeo && relatedCategories.length > 0 && (
        <section style={{ maxWidth: 1180, margin: "0 auto", padding: "10px 16px 18px" }}>
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 24, padding: 26, boxShadow: "0 10px 28px rgba(15,23,42,0.05)" }}>
            <h2 style={{ margin: 0, color: "#0f172a", fontSize: 24 }}>
              Popular {title} Categories in {district}
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 18 }}>
              {relatedCategories.map((item) => (
                <Link
                  key={item.slug}
                  href={`/seo/${module}/${categoryBaseGeo.stateSlug}/${categoryBaseGeo.districtSlug}/${categoryBaseGeo.citySlug}/category/${item.slug}`}
                  style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "12px 14px", color: "#0f172a", fontWeight: 900, textDecoration: "none" }}
                >
                  {item.label} in {district}
                </Link>
              ))}
            </div>

<div className="seoInternalLinks">
<h3>Related Market Opportunities</h3>
<ul>
{internalLinks.map((item) => (
<li key={item.href}><a href={item.href}>{item.label}</a></li>
))}
</ul>
</div>
          </div>

<div className="seoInternalLinks">
<h3>Related Market Opportunities</h3>
<ul>
{internalLinks.map((item) => (
<li key={item.href}><a href={item.href}>{item.label}</a></li>
))}
</ul>
</div>
        </section>
      )}

    </main>
  );
}
