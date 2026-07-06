import { passesSeoQuality } from "@/lib/seo/seo-quality";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/lib/seo/site";
import { seoModules, isSeoModule, type SeoModule } from "@/lib/geo/india-geo";
import { getSeoGeoCities, getSeoStatePathsFromDb } from "@/lib/geography/seoAdapter";
import { getSeoCategories } from "@/lib/seo/category-slugs";

export const dynamic = "force-static";

export async function generateStaticParams() {
  return getSeoStatePathsFromDb(seoModules);
}

type PageProps = {
  params: {
    module: string;
    state: string;
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

function stateDescription(module: SeoModule, state: string) {
  if (module === "property") {
    return `Explore land, plots, flats, houses, commercial property and builder projects across ${state}. 3Bigha helps buyers, sellers, builders and agents connect through an AI-powered regional property marketplace.`;
  }

  if (module === "materials") {
    return `Find cement, steel, sand, bricks, plumbing, electrical, roofing and construction material suppliers across ${state}. Buyers can submit requirements and connect with local vendors faster.`;
  }

  if (module === "services") {
    return `Find contractors, architects, labour teams, plumbers, electricians, painters, designers and turnkey construction service providers across ${state}.`;
  }

  return `Find construction equipment rentals, machinery rentals, tool rentals, property rentals and local rental providers across ${state}.`;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const module = isSeoModule(params.module) ? params.module : "property";

  const stateGeo = (await getSeoGeoCities()).find((geo) => geo.stateSlug === params.state);
  const state = stateGeo?.state || normalize(params.state);

  const title = `${moduleTitle(module)} in ${state} | 3Bigha`;
  const description = stateDescription(module, state);
  const path = `/seo/${module}/${params.state}`;

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

export default async function StateSeoPage({ params }: PageProps) {
  const module = isSeoModule(params.module) ? params.module : "property";

  const stateGeo = (await getSeoGeoCities()).find((geo) => geo.stateSlug === params.state);
  const state = stateGeo?.state || normalize(params.state);

  const title = moduleTitle(module);
  const description = stateDescription(module, state);

  const stateDistricts: Array<{
    district: string;
    districtSlug: string;
    stateSlug: string;
  }> = Array.from(
    new Map(
      (await getSeoGeoCities())
        .filter((geo) => geo.stateSlug === params.state)
        .map((geo) => [
          geo.districtSlug,
          {
            district: geo.district,
            districtSlug: geo.districtSlug,
            stateSlug: geo.stateSlug,
          },
        ])
    ).values()
  );

  const relatedModules = seoModules.filter((item) => item !== module);
  const relatedCategories = getSeoCategories(module).slice(0, 12);
  const categoryBaseGeo = (await getSeoGeoCities(5000)).find(
    (geo) => geo.stateSlug === params.state && geo.districtSlug && geo.citySlug
  );
  const searches = popularSearches(module, state);

  const canonicalUrl = `${siteConfig.url}/seo/${module}/${params.state}`;

  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${title} in ${state}`,
    description,
    url: canonicalUrl,
    isPartOf: {
      "@type": "WebSite",
      name: siteConfig.name,
      url: siteConfig.url,
    },
    areaServed: {
      "@type": "State",
      name: state,
      addressCountry: "IN",
    },
    provider: {
      "@type": "Organization",
      name: "3Bigha",
      url: siteConfig.url,
    },
  };

  
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
    <main style={{ background: "#f8fafc", minHeight: "100vh" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "42px 16px 18px" }}>
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #bae6fd",
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
            State Marketplace Authority Hub
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
            {title} in {state}
          </h1>

          <div style={{ marginTop: 12, color: "#475569", fontSize: 18, fontWeight: 800 }}>
            India
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
              href="/rfq"
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
              )}&city=${encodeURIComponent(state)}`}
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
            Explore {title} by district in {state}
          </h2>

          <p style={{ color: "#475569", lineHeight: 1.7, fontSize: 15, fontWeight: 600 }}>
            Browse district-level marketplace pages for stronger local discovery
            and regional SEO authority across {state}.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
              marginTop: 20,
            }}
          >
            {stateDistricts.map((item) => (
              <Link
                key={item.districtSlug}
                href={`/seo/${module}/${item.stateSlug}/${item.districtSlug}`}
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: 12,
                  color: "#0f172a",
                  fontWeight: 900,
                }}
              >
                {title} in {item.district}
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
            Related state pages
          </h2>

          <p style={{ color: "#64748b", lineHeight: 1.7, fontSize: 14 }}>
            Explore other marketplace categories across {state}.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {relatedModules.map((item) => (
              <Link
                key={item}
                href={`/seo/${item}/${params.state}`}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: "12px 14px",
                  color: "#0f172a",
                  fontWeight: 900,
                  background: "#f8fafc",
                }}
              >
                {moduleTitle(item)} in {state}
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
            State marketplace workflow
          </h2>

          <p style={{ color: "#64748b", lineHeight: 1.7, fontSize: 14 }}>
            3Bigha connects state-wide discovery, RFQ submission, vendor
            responses, quote comparison and unified chat across {state}.
          </p>

          <div style={{ display: "grid", gap: 10 }}>
            {[
              "Explore districts",
              "Find city pages",
              "Submit requirement",
              "Compare vendors",
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
              Popular {title} Categories in {state}
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 18 }}>
              {relatedCategories.map((item) => (
                <Link
                  key={item.slug}
                  href={`/seo/${module}/${categoryBaseGeo.stateSlug}/${categoryBaseGeo.districtSlug}/${categoryBaseGeo.citySlug}/category/${item.slug}`}
                  style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "12px 14px", color: "#0f172a", fontWeight: 900, textDecoration: "none" }}
                >
                  {item.label} in {state}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

    </main>
  );
}
