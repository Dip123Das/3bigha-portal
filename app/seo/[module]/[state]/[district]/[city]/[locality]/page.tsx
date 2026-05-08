import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { siteConfig } from "@/lib/seo/site";
import { getLiveMarketplaceData } from "@/lib/seo/live-marketplace";
import { getSeoKeywordGroups } from "@/lib/seo/seo-keywords";
import { getRegionalKeywordGroups } from "@/lib/seo/regional-keywords";
import { getModuleKeywordGroups } from "@/lib/seo/module-keywords";
import { buildSeoSchemaGraph } from "@/lib/seo/structured-data";
import {
  geoCities,
  seoModules,
  isSeoModule,
  type SeoModule,
} from "@/lib/geo/india-geo";

export const dynamic = "force-static";

const localityMap: Record<string, string[]> = {
  "cooch-behar-town": [
    "khagrabari",
    "dinhata-road",
    "rail-ghumti",
    "new-town",
    "pilkhana",
  ],
  tufanganj: ["natabari", "balabhut", "andar-fullan"],
  dinhata: ["gosanimari", "bhetaguri", "sahebganj"],
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

export function generateStaticParams() {
  return seoModules.flatMap((module) =>
    geoCities.flatMap((geo) =>
      (localityMap[geo.citySlug] || []).map((locality) => ({
        module,
        state: geo.stateSlug,
        district: geo.districtSlug,
        city: geo.citySlug,
        locality,
      }))
    )
  );
}

type PageProps = {
  params: {
    module: string;
    state: string;
    district: string;
    city: string;
    locality: string;
  };
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const module = isSeoModule(params.module)
    ? params.module
    : "property";

  const geo = geoCities.find(
    (item) =>
      item.stateSlug === params.state &&
      item.districtSlug === params.district &&
      item.citySlug === params.city
  );

  if (!geo) {
    return {};
  }

  const locality = normalize(params.locality);

  const title = `${moduleTitle(module)} in ${locality}, ${geo.city} | 3Bigha`;

  const description = `Explore ${moduleTitle(
    module
  ).toLowerCase()} opportunities in ${locality}, ${geo.city}, ${geo.district}, ${geo.state}. Discover local listings, vendors, RFQs and AI-assisted marketplace workflows on 3Bigha.`;

  const path = `/seo/${module}/${params.state}/${params.district}/${params.city}/${params.locality}`;

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
  };
}

export default async function LocalitySeoPage({ params }: PageProps) {
  const module = isSeoModule(params.module)
    ? params.module
    : "property";

  const geo = geoCities.find(
    (item) =>
      item.stateSlug === params.state &&
      item.districtSlug === params.district &&
      item.citySlug === params.city
  );

  if (!geo) {
    notFound();
  }

  const locality = normalize(params.locality);
  const title = moduleTitle(module);

  const nearbyLocalities = (localityMap[geo.citySlug] || []).filter(
    (item) => item !== params.locality
  );

  const canonicalUrl = `${siteConfig.url}/seo/${module}/${params.state}/${params.district}/${params.city}/${params.locality}`;

  const liveMarketplace = await getLiveMarketplaceData(
    module,
    geo.city,
    geo.district,
    locality
  );

  const keywordGroups = getSeoKeywordGroups(module, locality);
  const regionalKeywordGroups = getRegionalKeywordGroups(module, locality);
  const moduleKeywordGroups = getModuleKeywordGroups(module, locality);

  const schemaGraph = buildSeoSchemaGraph({
    module,
    url: canonicalUrl,
    geo: {
      state: geo.state,
      district: geo.district,
      city: geo.city,
      locality,
    },
    breadcrumbs: [
      { name: "Home", url: siteConfig.url },
      {
        name: title,
        url: `${siteConfig.url}/seo/${module}/${params.state}`,
      },
      {
        name: geo.district,
        url: `${siteConfig.url}/seo/${module}/${params.state}/${params.district}`,
      },
      {
        name: geo.city,
        url: `${siteConfig.url}/seo/${module}/${params.state}/${params.district}/${params.city}`,
      },
      {
        name: locality,
        url: canonicalUrl,
      },
    ],
    faqs: [
      {
        question: `How can I find ${title.toLowerCase()} in ${locality}?`,
        answer: `You can browse ${title.toLowerCase()} listings, marketplace signals, local searches and RFQ options for ${locality} through 3Bigha.`,
      },
      {
        question: `Can I post a requirement for ${title.toLowerCase()} in ${locality}?`,
        answer: `Yes. You can submit a requirement on 3Bigha and connect with relevant local vendors, suppliers or service providers near ${locality}.`,
      },
    ],
  });

  return (
    <main style={{ background: "#f8fafc", minHeight: "100vh" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schemaGraph),
        }}
      />

      <section
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "40px 16px 20px",
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #ffffff, #ecfeff)",
            border: "1px solid #a5f3fc",
            borderRadius: 28,
            padding: 32,
            boxShadow: "0 18px 45px rgba(15,23,42,0.08)",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              background: "#cffafe",
              color: "#155e75",
              borderRadius: 999,
              padding: "8px 14px",
              fontWeight: 900,
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            Hyperlocal AI Marketplace
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "clamp(34px, 6vw, 60px)",
              lineHeight: 1.05,
              letterSpacing: "-0.04em",
              color: "#0f172a",
            }}
          >
            {title} in {locality}
          </h1>

          <div
            style={{
              marginTop: 12,
              color: "#475569",
              fontSize: 18,
              fontWeight: 800,
            }}
          >
            {geo.city}, {geo.district}, {geo.state}
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
            Discover local {title.toLowerCase()} opportunities, nearby vendors,
            RFQs, builders, suppliers and marketplace activity in {locality},{" "}
            {geo.city}. 3Bigha connects local discovery with AI-assisted
            workflows and verified marketplace interactions.
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 14,
              marginTop: 28,
            }}
          >
            <Link
              href={modulePath(module)}
              style={{
                background: "#0f172a",
                color: "#ffffff",
                padding: "14px 22px",
                borderRadius: 999,
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
                borderRadius: 999,
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
          padding: "0 16px 34px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
          }}
        >
          {[
            "Local discovery",
            "Hyperlocal RFQ matching",
            "Nearby vendors",
            "AI-assisted search",
            "Local buyer demand",
            "Regional marketplace workflows",
          ].map((item) => (
            <div
              key={item}
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 18,
                padding: 18,
                boxShadow: "0 10px 28px rgba(15,23,42,0.05)",
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  marginBottom: 10,
                }}
              >
                📍
              </div>

              <h2
                style={{
                  margin: 0,
                  color: "#0f172a",
                  fontSize: 18,
                }}
              >
                {item}
              </h2>

              <p
                style={{
                  color: "#64748b",
                  lineHeight: 1.7,
                  fontSize: 14,
                }}
              >
                Marketplace workflows available around {locality},{" "}
                {geo.city}.
              </p>
            </div>
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
            background: "linear-gradient(135deg, #fefce8, #ffffff)",
            border: "1px solid #fde68a",
            borderRadius: 24,
            padding: 26,
            boxShadow: "0 10px 28px rgba(15,23,42,0.05)",
          }}
        >
          <h2 style={{ margin: 0, color: "#0f172a", fontSize: 26 }}>
            Live marketplace signals in {locality}
          </h2>

          <p style={{ color: "#475569", lineHeight: 1.7, fontSize: 15, fontWeight: 600 }}>
            These signals help users discover live marketplace activity, available
            listings and RFQ-ready opportunities around {locality}, {geo.city}.
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
                  padding: 16,
                }}
              >
                <div style={{ color: "#92400e", fontSize: 22, fontWeight: 950 }}>
                  {stat.value}
                </div>
                <div style={{ color: "#475569", fontSize: 13, fontWeight: 800, marginTop: 4 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          <h3
            style={{
              margin: "24px 0 0",
              color: "#0f172a",
              fontSize: 20,
              fontWeight: 950,
            }}
          >
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
                    title: `Search ${title.toLowerCase()} in ${locality}`,
                    subtitle: `Find available listings, vendors and marketplace options around ${locality}.`,
                    href: `/search?module=${module}&q=${encodeURIComponent(locality)}`,
                  },
                  {
                    title: `Post requirement in ${locality}`,
                    subtitle:
                      "Submit your requirement and let local vendors respond through RFQ workflow.",
                    href: `/rfq/general/new?module=${module}&q=${encodeURIComponent(locality)}`,
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
                  padding: 16,
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
                    borderRadius: 999,
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
            background: "linear-gradient(135deg, #eef2ff, #ffffff)",
            border: "1px solid #c7d2fe",
            borderRadius: 24,
            padding: 26,
            boxShadow: "0 10px 28px rgba(15,23,42,0.05)",
          }}
        >
          <h2 style={{ margin: 0, color: "#0f172a", fontSize: 26 }}>
            High-intent searches in {locality}
          </h2>

          <p style={{ color: "#475569", lineHeight: 1.7, fontSize: 15, fontWeight: 600 }}>
            Explore hyperlocal marketplace searches, vendor discovery, RFQ intent
            and price-related searches around {locality}, {geo.city}.
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
                    padding: 16,
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
                  padding: 16,
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

      <section
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "0 16px 60px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 18,
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
          <h2
            style={{
              margin: 0,
              color: "#0f172a",
              fontSize: 22,
            }}
          >
            Nearby localities
          </h2>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              marginTop: 14,
            }}
          >
            {nearbyLocalities.map((item) => (
              <Link
                key={item}
                href={`/seo/${module}/${params.state}/${params.district}/${params.city}/${item}`}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 14,
                  padding: "12px 14px",
                  color: "#0f172a",
                  fontWeight: 900,
                  background: "#f8fafc",
                }}
              >
                {title} in {normalize(item)}
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
          <h2
            style={{
              margin: 0,
              color: "#0f172a",
              fontSize: 22,
            }}
          >
            Explore regional pages
          </h2>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              marginTop: 14,
            }}
          >
            <Link
              href={`/seo/${module}/${params.state}/${params.district}/${params.city}`}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 14,
                padding: "12px 14px",
                color: "#0f172a",
                fontWeight: 900,
                background: "#f8fafc",
              }}
            >
              {title} in {geo.city}
            </Link>

            <Link
              href={`/seo/${module}/${params.state}/${params.district}`}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 14,
                padding: "12px 14px",
                color: "#0f172a",
                fontWeight: 900,
                background: "#f8fafc",
              }}
            >
              {title} in {geo.district}
            </Link>

            <Link
              href={`/seo/${module}/${params.state}`}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 14,
                padding: "12px 14px",
                color: "#0f172a",
                fontWeight: 900,
                background: "#f8fafc",
              }}
            >
              {title} in {geo.state}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}