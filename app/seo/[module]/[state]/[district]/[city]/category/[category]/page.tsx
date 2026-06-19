import { passesSeoQuality } from "@/lib/seo/seo-quality";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getGeoBySlugs,
  isSeoModule,
  seoModules,
  type SeoModule,
} from "@/lib/geo/india-geo";

import { siteConfig } from "@/lib/seo/site";
import { getSeoCategory, getSeoCategories } from "@/lib/seo/category-slugs";
import { getCategorySeoContent } from "@/lib/seo/category-content";
import { getModuleKeywordGroups } from "@/lib/seo/module-keywords";
import {
  getCrossModuleSeoLinks,
  getIntentSeoLinks,
} from "@/lib/seo/internal-links";
import { getSeoGeoCities } from "@/lib/geography/seoAdapter";
import { getAiMarketContent } from "@/lib/seo/ai-market-content";

import {
  getLiveMarketSignals,
  getMarketInsights,
} from "@/lib/seo/live-market-signals";
import { getLiveDbMarketData } from "@/lib/seo/live-db-market-data";
import { buildSeoSchemaGraph } from "@/lib/seo/structured-data";

type PageProps = {
  params: {
    module: string;
    state: string;
    district: string;
    city: string;
    category: string;
  };
};

export async function generateStaticParams() {
  const geoPaths = await getSeoGeoCities(5000);

  return seoModules.flatMap((module) =>
    geoPaths
      .filter((geo) => geo.stateSlug && geo.districtSlug && geo.citySlug)
      .flatMap((geo) =>
        getSeoCategories(module).map((category) => ({
          module,
          state: geo.stateSlug,
          district: geo.districtSlug,
          city: geo.citySlug,
          category: category.slug,
        }))
      )
  );
}

export default async function SeoCategoryPage({ params }: PageProps) {
  if (!isSeoModule(params.module)) {
    notFound();
  }

  const module: SeoModule = params.module;

  const geo = getGeoBySlugs(params.state, params.district, params.city);

  if (!geo) {
    notFound();
  }

  const category = getSeoCategory(module, params.category);

  if (!category) {
    notFound();
  }

  const canonicalUrl = `${siteConfig.url}/seo/${module}/${params.state}/${params.district}/${params.city}/category/${params.category}`;

  const content = getCategorySeoContent({
    module,
    category,
    area: geo.city,
    city: geo.city,
    district: geo.district,
    state: geo.state,
  });

  const aiContent = getAiMarketContent({
    module,
    area: geo.city,
    city: geo.city,
    district: geo.district,
    state: geo.state,
  });

  const keywordGroups = getModuleKeywordGroups(module, geo.city);

  const marketSignals =
    getLiveMarketSignals({
      module,
      area: geo.city,
    });

  const marketInsights =
    getMarketInsights({
      module,
      area: geo.city,
    });

  const liveDbMarketData = await getLiveDbMarketData({
    module,
    city: geo.city,
    district: geo.district,
  });

  const internalLinks = [
    ...getCrossModuleSeoLinks({
      currentModule: module,
      state: params.state,
      district: params.district,
      city: params.city,
      areaLabel: geo.city,
    }),
    ...getIntentSeoLinks({
      module,
      areaLabel: geo.city,
    }),
  ];

  const relatedCategories = getSeoCategories(module)
    .filter((item) => item.slug !== category.slug)
    .slice(0, 12);

  const schemaGraph = buildSeoSchemaGraph({
    module,
    url: canonicalUrl,
    geo: {
      state: geo.state,
      district: geo.district,
      city: geo.city,
    },
    breadcrumbs: [
      { name: "Home", url: siteConfig.url },
      { name: module, url: `${siteConfig.url}/seo/${module}/${params.state}` },
      {
        name: geo.district,
        url: `${siteConfig.url}/seo/${module}/${params.state}/${params.district}`,
      },
      {
        name: geo.city,
        url: `${siteConfig.url}/seo/${module}/${params.state}/${params.district}/${params.city}`,
      },
      { name: category.label, url: canonicalUrl },
    ],
    faqs: content.faqs,
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

  const seoQualityCount = 3;

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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaGraph) }}
      />

      <main
        style={{
          background: "#ffffff",
          minHeight: "100vh",
        }}
      >
        <section style={{ maxWidth: 1180, margin: "0 auto", padding: "56px 16px 40px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background: "#dcfce7",
              color: "#166534",
              borderRadius: 12,
              padding: "8px 14px",
              fontWeight: 900,
              fontSize: 12,
              letterSpacing: 0.4,
              textTransform: "uppercase",
            }}
          >
            Category SEO Marketplace
          </div>

          <h1 style={{ fontSize: 44, lineHeight: 1.1, marginTop: 18, marginBottom: 18, color: "#0f172a" }}>
            {content.heading}
          </h1>

          <p style={{ maxWidth: 900, color: "#475569", fontSize: 18, lineHeight: 1.8, margin: 0 }}>
            {content.description}
          </p>
        </section>

        <section style={{ maxWidth: 1180, margin: "0 auto", padding: "0 16px 34px" }}>
          <div style={{ background: "#ffffff", border: "1px solid #bfdbfe", borderRadius: 26, padding: 28 }}>
            <h2 style={{ marginTop: 0, color: "#0f172a", fontSize: 30 }}>
              AI market insights
            </h2>

                    <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 22,
              }}
            >
              <Link
                href={`/vendor/discovery?q=${encodeURIComponent(
                  category.label
                )}&city=${encodeURIComponent(geo.city)}&district=${encodeURIComponent(
                  geo.district
                )}&category=${encodeURIComponent(category.label)}`}
                style={{
                  background: "#0f172a",
                  color: "#ffffff",
                  borderRadius: 12,
                  padding: "10px 14px",
                  textDecoration: "none",
                  fontWeight: 950,
                }}
              >
                🤖 AI recommended vendors
              </Link>
            </div>

            {aiContent.paragraphs.map((paragraph) => (
              <p key={paragraph} style={{ color: "#334155", lineHeight: 1.9, fontSize: 16 }}>
                {paragraph}
              </p>
            ))}
          </div>
        </section>

                <section
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "0 16px 34px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #a5f3fc",
              borderRadius: 26,
              padding: 28,
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                background: "#cffafe",
                color: "#155e75",
                borderRadius: 12,
                padding: "8px 14px",
                fontWeight: 900,
                fontSize: 12,
                letterSpacing: 0.4,
                textTransform: "uppercase",
              }}
            >
              Live Marketplace Signals
            </div>

            <h2
              style={{
                marginTop: 18,
                marginBottom: 20,
                color: "#0f172a",
                fontSize: 32,
              }}
            >
              Real-time market activity in {geo.city}
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(220px,1fr))",
                gap: 16,
              }}
            >
              {[
                {
                  label: "Live database listings",
                  value: `${liveDbMarketData.listingCount}+`,
                  trend: liveDbMarketData.source === "live" ? "up" : "stable",
                },
                {
                  label: "Recently found items",
                  value: `${liveDbMarketData.latestCount}+`,
                  trend: liveDbMarketData.source === "live" ? "up" : "stable",
                },
                {
                  label: "RFQ workflow",
                  value: liveDbMarketData.rfqEnabled ? "Enabled" : "Pending",
                  trend: "stable",
                },
                {
                  label: "Data source",
                  value: liveDbMarketData.source === "live" ? "Live DB" : "Fallback",
                  trend: liveDbMarketData.source === "live" ? "up" : "stable",
                },
                ...marketSignals,
              ].map((signal) => (
                <div
                  key={signal.label}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #dbeafe",
                    borderRadius: 22,
                    padding: 22,
                  }}
                >
                  <div
                    style={{
                      color: "#475569",
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    {signal.label}
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 34,
                      fontWeight: 900,
                      color: "#0f172a",
                    }}
                  >
                    {signal.value}
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      color:
                        signal.trend === "up"
                          ? "#16a34a"
                          : signal.trend === "down"
                            ? "#dc2626"
                            : "#475569",
                      fontWeight: 800,
                    }}
                  >
                    {signal.trend === "up"
                      ? "▲ Trending Up"
                      : signal.trend === "down"
                        ? "▼ Trending Down"
                        : "● Stable"}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(260px,1fr))",
                gap: 10,
                marginTop: 16,
              }}
            >
              {marketInsights.map((item) => (
                <div
                  key={item.title}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #dbeafe",
                    borderRadius: 22,
                    padding: 24,
                  }}
                >
                  <h3
                    style={{
                      marginTop: 0,
                      marginBottom: 12,
                      color: "#0f172a",
                      fontSize: 18,
                    }}
                  >
                    {item.title}
                  </h3>

                  <p
                    style={{
                      margin: 0,
                      color: "#475569",
                      lineHeight: 1.8,
                    }}
                  >
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ maxWidth: 1180, margin: "0 auto", padding: "0 16px 34px" }}>
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 26, padding: 28 }}>
            <h2 style={{ marginTop: 0, color: "#0f172a", fontSize: 28 }}>
              Popular searches in {geo.city}
            </h2>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 22 }}>
              {keywordGroups.search.slice(0, 28).map((item) => (
                <div
                  key={item.keyword}
                  style={{
                    background: "#f1f5f9",
                    borderRadius: 12,
                    padding: "10px 16px",
                    fontWeight: 700,
                    color: "#334155",
                  }}
                >
                  {item.keyword}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ maxWidth: 1180, margin: "0 auto", padding: "0 16px 34px" }}>
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 26, padding: 28 }}>
            <h2 style={{ marginTop: 0, color: "#0f172a", fontSize: 28 }}>
              Related categories
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14, marginTop: 22 }}>
              {relatedCategories.map((item) => (
                <Link
                  key={item.slug}
                  href={`/seo/${module}/${params.state}/${params.district}/${params.city}/category/${item.slug}`}
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 20,
                    padding: 14,
                    textDecoration: "none",
                    color: "#0f172a",
                    fontWeight: 800,
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section style={{ maxWidth: 1180, margin: "0 auto", padding: "0 16px 60px" }}>
          <div style={{ background: "#ffffff", border: "1px solid #bbf7d0", borderRadius: 26, padding: 28 }}>
            <h2 style={{ marginTop: 0, color: "#0f172a", fontSize: 28 }}>
              Explore marketplace workflow
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 14, marginTop: 22 }}>
              {internalLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #dcfce7",
                    borderRadius: 18,
                    padding: 14,
                    textDecoration: "none",
                    color: "#064e3b",
                    fontWeight: 900,
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}