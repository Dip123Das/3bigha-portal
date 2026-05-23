import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/lib/seo/site";
import { getRegionalSeoContent } from "@/lib/seo/regional-content";
import {
  getRegionalDiscoveryItems,
  getRegionalRfqUrl,
  getRegionalSearchUrl,
} from "@/lib/seo/regional-discovery";
import { getRegionalMarketData } from "@/lib/seo/regional-market-data";
import { getLiveMarketplaceData } from "@/lib/seo/live-marketplace";
import { getSeoKeywordGroups } from "@/lib/seo/seo-keywords";
import { getRegionalKeywordGroups } from "@/lib/seo/regional-keywords";
import { getModuleKeywordGroups } from "@/lib/seo/module-keywords";
import { buildSeoSchemaGraph } from "@/lib/seo/structured-data";
import {
  geoLocalities,
  getGeoBySlugs,
  getNearbyGeoCities,
  getRegionalSeoPaths,
  getRelatedModuleSeoUrls,
  isSeoModule,
  type SeoModule,
} from "@/lib/geo/india-geo";

export const dynamic = "force-static";

export function generateStaticParams() {
  return getRegionalSeoPaths();
}

type PageProps = {
  params: {
    module: string;
    state: string;
    district: string;
    city: string;
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

function moduleDescription(
  module: SeoModule,
  city: string,
  district: string,
  state: string
) {
  if (module === "property") {
    return `Find land, plots, flats, houses, commercial property, builder projects and real estate opportunities in ${city}, ${district}, ${state}. 3Bigha helps local buyers, sellers, builders and agents connect through an AI-assisted regional marketplace.`;
  }

  if (module === "materials") {
    return `Find cement, steel, sand, bricks, aggregates, plumbing, electrical, roofing and finishing material suppliers in ${city}, ${district}, ${state}. 3Bigha helps buyers compare local suppliers and submit material requirements faster.`;
  }

  if (module === "services") {
    return `Find architects, contractors, labour teams, plumbers, electricians, painters, fabricators, designers and turnkey construction service providers in ${city}, ${district}, ${state}.`;
  }

  return `Find rental services, construction equipment rentals, machinery rentals, tools, vehicles and property rentals in ${city}, ${district}, ${state}.`;
}

function seoBullets(module: SeoModule) {
  if (module === "property") {
    return [
      "Land, plot, house and flat discovery",
      "Builder and project property support",
      "Buyer-seller enquiry workflow",
      "Local real estate opportunities",
    ];
  }

  if (module === "materials") {
    return [
      "Cement, steel, sand and brick suppliers",
      "Local vendor discovery",
      "Material requirement submission",
      "RFQ and quote comparison workflow",
    ];
  }

  if (module === "services") {
    return [
      "Contractors, labour and technical services",
      "Plumber, electrician and painter discovery",
      "Construction project support",
      "Service enquiry and RFQ workflow",
    ];
  }

  return [
    "Construction equipment rentals",
    "Machine and tool rental discovery",
    "Property and service rental support",
    "Local rental enquiry workflow",
  ];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const module = isSeoModule(params.module) ? params.module : "property";
  const geo = getGeoBySlugs(params.state, params.district, params.city);

  const state = geo?.state || normalize(params.state);
  const district = geo?.district || normalize(params.district);
  const city = geo?.city || normalize(params.city);

  const title = `${moduleTitle(module)} in ${city}, ${district}, ${state} | 3Bigha`;
  const description = moduleDescription(module, city, district, state);
  const path = `/seo/${module}/${params.state}/${params.district}/${params.city}`;

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

export default async function RegionalSeoPage({ params }: PageProps) {
  const module = isSeoModule(params.module) ? params.module : "property";
  const geo = getGeoBySlugs(params.state, params.district, params.city);

  const state = geo?.state || normalize(params.state);
  const district = geo?.district || normalize(params.district);
  const city = geo?.city || normalize(params.city);

  const title = moduleTitle(module);
  const description = moduleDescription(module, city, district, state);
  const canonicalUrl = `${siteConfig.url}/seo/${module}/${params.state}/${params.district}/${params.city}`;

  const bullets = seoBullets(module);
  const regionalContent = getRegionalSeoContent(module, city, district, state);
  const discoveryItems = getRegionalDiscoveryItems(module, city, district);
  const marketData = getRegionalMarketData(module, city, district);
  const liveMarketplace = await getLiveMarketplaceData(module, city, district);
  const keywordGroups = getSeoKeywordGroups(module, city);
  const regionalKeywordGroups = getRegionalKeywordGroups(module, city);
  const moduleKeywordGroups = getModuleKeywordGroups(module, city);

  const nearbyCities = getNearbyGeoCities(params.state, params.district, params.city, 6);

  const relatedModuleLinks = getRelatedModuleSeoUrls(
    module,
    params.state,
    params.district,
    params.city
  );

    const localityLinks = geoLocalities[params.city] || [];

  const schemaGraph = buildSeoSchemaGraph({
    module,
    url: canonicalUrl,
    geo: {
      state,
      district,
      city,
    },
    breadcrumbs: [
      { name: "Home", url: siteConfig.url },
      {
        name: title,
        url: `${siteConfig.url}/seo/${module}/${params.state}`,
      },
      {
        name: district,
        url: `${siteConfig.url}/seo/${module}/${params.state}/${params.district}`,
      },
      {
        name: city,
        url: canonicalUrl,
      },
    ],
    faqs: regionalContent.faqs,
  });

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
            border: "1px solid #dbeafe",
            borderRadius: 28,
            padding: 32,
            boxShadow: "0 18px 45px rgba(15,23,42,0.08)",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              background: "#e0f2fe",
              color: "#075985",
              borderRadius: 12,
              padding: "8px 14px",
              fontWeight: 900,
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            AI Regional Marketplace
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
            {title} in {city}
          </h1>

          <div style={{ marginTop: 12, color: "#475569", fontSize: 18, fontWeight: 800 }}>
            {district}, {state}, India
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
          </div>
        </div>
      </section>

      <section
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "10px 16px 50px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
        }}
      >
        {bullets.map((item) => (
          <div
            key={item}
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 20,
              padding: 14,
              boxShadow: "0 10px 28px rgba(15,23,42,0.05)",
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 10 }}>✅</div>
            <h2 style={{ margin: 0, color: "#0f172a", fontSize: 18 }}>{item}</h2>
            <p style={{ color: "#475569", lineHeight: 1.7, fontSize: 14 }}>
              Available for users searching in {city}, {district}. 3Bigha connects
              local demand with verified marketplace workflows.
            </p>
          </div>
        ))}
      </section>

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "0 16px 34px" }}>
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
            {title} marketplace overview in {city}
          </h2>

          <p style={{ color: "#334155", lineHeight: 1.8, fontSize: 16, fontWeight: 600 }}>
            {regionalContent.intro}
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
              marginTop: 20,
            }}
          >
            {regionalContent.sections.map((section) => (
              <article
                key={section.title}
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 18,
                  padding: 14,
                }}
              >
                <h3 style={{ margin: 0, color: "#0f172a", fontSize: 18 }}>
                  {section.title}
                </h3>
                <p style={{ color: "#475569", lineHeight: 1.7, fontSize: 14 }}>
                  {section.content}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "0 16px 56px",
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
            Nearby {title} locations
          </h2>

          <p style={{ color: "#64748b", lineHeight: 1.7, fontSize: 14 }}>
            Explore nearby city and town pages for better local discovery around {district}.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {nearbyCities.map((item) => (
              <Link
                key={item.citySlug}
                href={`/seo/${module}/${item.stateSlug}/${item.districtSlug}/${item.citySlug}`}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: "12px 14px",
                  color: "#0f172a",
                  fontWeight: 900,
                  background: "#f8fafc",
                }}
              >
                {title} in {item.city}, {item.district}
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
            Related marketplace pages
          </h2>

          <p style={{ color: "#64748b", lineHeight: 1.7, fontSize: 14 }}>
            Compare related 3Bigha marketplace categories in {city}, {district}.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {relatedModuleLinks.map((item) => (
              <Link
                key={item.module}
                href={item.url}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: "12px 14px",
                  color: "#0f172a",
                  fontWeight: 900,
                  background: "#f8fafc",
                }}
              >
                {moduleTitle(item.module)} in {city}
              </Link>
            ))}
          </div>
        </div>
      </section>

            {localityLinks.length > 0 ? (
        <section style={{ maxWidth: 1180, margin: "0 auto", padding: "0 16px 34px" }}>
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #a5f3fc",
              borderRadius: 24,
              padding: 26,
              boxShadow: "0 10px 28px rgba(15,23,42,0.05)",
            }}
          >
            <h2 style={{ margin: 0, color: "#0f172a", fontSize: 26 }}>
              Explore {title} by locality in {city}
            </h2>

            <p style={{ color: "#475569", lineHeight: 1.7, fontSize: 15, fontWeight: 600 }}>
              Browse hyperlocal marketplace pages around {city}, {district}.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
                marginTop: 20,
              }}
            >
              {localityLinks.map((locality) => (
                <Link
                  key={locality}
                  href={`/seo/${module}/${params.state}/${params.district}/${params.city}/${locality}`}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #cffafe",
                    borderRadius: 12,
                    padding: 12,
                    color: "#0f172a",
                    fontWeight: 900,
                  }}
                >
                  {title} in {locality.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

            <section style={{ maxWidth: 1180, margin: "0 auto", padding: "0 16px 34px" }}>
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #fde68a",
            borderRadius: 24,
            padding: 26,
            boxShadow: "0 10px 28px rgba(15,23,42,0.05)",
          }}
        >
          <h2 style={{ margin: 0, color: "#0f172a", fontSize: 26 }}>
            Live marketplace signals in {city}
          </h2>

          <p style={{ color: "#475569", lineHeight: 1.7, fontSize: 15, fontWeight: 600 }}>
            These signals help users discover live marketplace activity,
            available listings and RFQ-ready opportunities around {city},{" "}
            {district}.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              marginTop: 20,
            }}
          >
            {liveMarketplace.stats.map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: "#ffffff",
                  border: "1px solid #fef3c7",
                  borderRadius: 18,
                  padding: 12,
                }}
              >
                <div style={{ color: "#92400e", fontSize: 18, fontWeight: 950 }}>
                  {stat.value}
                </div>
                <div style={{ color: "#475569", fontSize: 13, fontWeight: 800, marginTop: 4 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          <h3 style={{ margin: "24px 0 0", color: "#0f172a", fontSize: 18, fontWeight: 950 }}>
            Related live marketplace listings
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 12,
              marginTop: 14,
            }}
          >
            {(liveMarketplace.items.length
              ? liveMarketplace.items
              : [
                  {
                    title: `Search ${title.toLowerCase()} in ${city}`,
                    subtitle: `Find available listings, vendors and marketplace options around ${city}.`,
                    href: `/search?module=${module}&q=${encodeURIComponent(city)}`,
                  },
                  {
                    title: `Post requirement in ${city}`,
                    subtitle: "Submit your requirement and let local vendors respond through RFQ workflow.",
                    href: `/rfq/general/new?module=${module}&q=${encodeURIComponent(city)}`,
                  },
                  {
                    title: `Browse ${title.toLowerCase()} marketplace`,
                    subtitle: `Explore verified ${title.toLowerCase()} opportunities on 3Bigha.`,
                    href: modulePath(module),
                  },
                ]
            ).map((item) => (
              <Link
                key={`${item.href}-${item.title}`}
                href={item.href}
                style={{
                  background: "#ffffff",
                  border: "1px solid #fef3c7",
                  borderRadius: 18,
                  padding: 12,
                  color: "#0f172a",
                  textDecoration: "none",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    background: "#fffbeb",
                    color: "#92400e",
                    border: "1px solid #fde68a",
                    borderRadius: 12,
                    padding: "5px 9px",
                    fontSize: 11,
                    fontWeight: 950,
                    marginBottom: 10,
                  }}
                >
                  Recently active
                </div>

                <h3 style={{ margin: 0, color: "#0f172a", fontSize: 17 }}>
                  {item.title}
                </h3>

                <p style={{ color: "#64748b", lineHeight: 1.6, fontSize: 14 }}>
                  {item.subtitle}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "0 16px 34px" }}>
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #fed7aa",
            borderRadius: 24,
            padding: 26,
            boxShadow: "0 10px 28px rgba(15,23,42,0.05)",
          }}
        >
          <h2 style={{ margin: 0, color: "#0f172a", fontSize: 26 }}>
            Local marketplace activity in {city}
          </h2>

          <p style={{ color: "#475569", lineHeight: 1.7, fontSize: 15, fontWeight: 600 }}>
            Explore estimated local demand signals, marketplace activity and active
            opportunities around {city}, {district}.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              marginTop: 20,
            }}
          >
            {marketData.stats.map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: "#ffffff",
                  border: "1px solid #ffedd5",
                  borderRadius: 18,
                  padding: 12,
                }}
              >
                <div style={{ color: "#9a3412", fontSize: 20, fontWeight: 950 }}>
                  {stat.value}
                </div>
                <div style={{ color: "#475569", fontSize: 13, fontWeight: 800, marginTop: 4 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 12,
              marginTop: 20,
            }}
          >
            {marketData.listings.map((item) => (
              <div
                key={item.title}
                style={{
                  background: "#ffffff",
                  border: "1px solid #ffedd5",
                  borderRadius: 18,
                  padding: 12,
                }}
              >
                <h3 style={{ margin: 0, color: "#0f172a", fontSize: 17 }}>
                  {item.title}
                </h3>
                <p style={{ color: "#64748b", lineHeight: 1.6, fontSize: 14 }}>
                  {item.subtitle}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "0 16px 34px" }}>
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #bbf7d0",
            borderRadius: 24,
            padding: 26,
            boxShadow: "0 10px 28px rgba(15,23,42,0.05)",
          }}
        >
          <h2 style={{ margin: 0, color: "#0f172a", fontSize: 26 }}>
            Popular local searches in {city}
          </h2>

          <p style={{ color: "#475569", lineHeight: 1.7, fontSize: 15, fontWeight: 600 }}>
            Explore local demand, search intent and marketplace opportunities around{" "}
            {city}, {district}.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gap: 12,
              marginTop: 20,
            }}
          >
            {discoveryItems.map((item) => (
              <div
                key={item}
                style={{
                  background: "#ffffff",
                  border: "1px solid #dcfce7",
                  borderRadius: 18,
                  padding: 12,
                }}
              >
                <h3 style={{ margin: 0, color: "#0f172a", fontSize: 16, lineHeight: 1.4 }}>
                  {item}
                </h3>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                  <Link
                    href={getRegionalSearchUrl(item, module)}
                    style={{
                      background: "#0f172a",
                      color: "#ffffff",
                      borderRadius: 12,
                      padding: "9px 12px",
                      fontSize: 13,
                      fontWeight: 900,
                    }}
                  >
                    Search
                  </Link>

                  <Link
                    href={getRegionalRfqUrl(item, module)}
                    style={{
                      background: "#ffffff",
                      color: "#166534",
                      border: "1px solid #86efac",
                      borderRadius: 12,
                      padding: "9px 12px",
                      fontSize: 13,
                      fontWeight: 900,
                    }}
                  >
                    Post RFQ
                  </Link>
                                    <Link
                    href={`/vendor/discovery?q=${encodeURIComponent(
                      item
                    )}&city=${encodeURIComponent(city)}&district=${encodeURIComponent(
                      district
                    )}`}
                    style={{
                      background: "#0f172a",
                      color: "#ffffff",
                      borderRadius: 12,
                      padding: "9px 12px",
                      fontSize: 13,
                      fontWeight: 900,
                    }}
                  >
                    AI Vendors
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

            <section style={{ maxWidth: 1180, margin: "0 auto", padding: "0 16px 34px" }}>
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #c7d2fe",
            borderRadius: 24,
            padding: 26,
            boxShadow: "0 10px 28px rgba(15,23,42,0.05)",
          }}
        >
          <h2 style={{ margin: 0, color: "#0f172a", fontSize: 26 }}>
            High-intent local searches in {city}
          </h2>

          <p style={{ color: "#475569", lineHeight: 1.7, fontSize: 15, fontWeight: 600 }}>
            Explore long-tail local marketplace searches, vendor discovery,
            RFQ intent and price-related searches around {city}, {district}.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gap: 12,
              marginTop: 20,
            }}
          >
            {[
              ...keywordGroups.search.slice(0, 6),
              ...keywordGroups.vendor.slice(0, 3),
              ...regionalKeywordGroups.search.slice(0, 8),
              ...regionalKeywordGroups.nearMe.slice(0, 6),
              ...regionalKeywordGroups.supplier.slice(0, 6),
              ...regionalKeywordGroups.dealer.slice(0, 6),
              ...regionalKeywordGroups.price.slice(0, 6),
              ...moduleKeywordGroups.search.slice(0, 16),
              ...moduleKeywordGroups.nearMe.slice(0, 8),
              ...moduleKeywordGroups.price.slice(0, 8),
            ].map(
              (item) => (
                <Link
                  key={item.keyword}
                  href={`/search?module=${module}&q=${encodeURIComponent(item.keyword)}`}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e0e7ff",
                    borderRadius: 18,
                    padding: 12,
                    color: "#0f172a",
                    textDecoration: "none",
                    fontWeight: 900,
                    lineHeight: 1.45,
                  }}
                >
                  🔎 {item.keyword}
                </Link>
              )
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gap: 12,
              marginTop: 16,
            }}
          >
            {[
              ...keywordGroups.rfq.slice(0, 4),
              ...regionalKeywordGroups.rfq.slice(0, 8),
              ...moduleKeywordGroups.rfq.slice(0, 10),
            ].map((item) => (
              <Link
                key={item.keyword}
                href={`/rfq/general/new?module=${module}&q=${encodeURIComponent(item.keyword)}`}
                style={{
                  background: "#ffffff",
                  border: "1px solid #ddd6fe",
                  borderRadius: 18,
                  padding: 12,
                  color: "#4c1d95",
                  textDecoration: "none",
                  fontWeight: 900,
                  lineHeight: 1.45,
                }}
              >
                📝 {item.keyword}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "0 16px 60px" }}>
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
            Frequently asked questions
          </h2>

          <div style={{ display: "grid", gap: 14, marginTop: 20 }}>
            {regionalContent.faqs.map((faq) => (
              <div
                key={faq.question}
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 18,
                  padding: 14,
                }}
              >
                <h3 style={{ margin: 0, color: "#0f172a", fontSize: 17 }}>
                  {faq.question}
                </h3>
                <p style={{ color: "#475569", lineHeight: 1.7, fontSize: 14 }}>
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}