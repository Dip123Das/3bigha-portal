import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/lib/seo/site";

export const dynamic = "force-static";

const VALID_MODULES = [
  "property",
  "materials",
  "services",
  "rentals",
] as const;

type SeoModule = (typeof VALID_MODULES)[number];

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

function isValidModule(value: string): value is SeoModule {
  return VALID_MODULES.includes(value as SeoModule);
}

function moduleTitle(module: SeoModule) {
  switch (module) {
    case "property":
      return "Property";
    case "materials":
      return "Building Materials";
    case "services":
      return "Construction Services";
    case "rentals":
      return "Rental Services";
  }
}

function moduleDescription(
  module: SeoModule,
  city: string,
  district: string,
  state: string
) {
  switch (module) {
    case "property":
      return `Find land, plots, flats, houses, commercial property and real estate opportunities in ${city}, ${district}, ${state} through 3Bigha AI marketplace.`;

    case "materials":
      return `Find cement, steel, sand, bricks, plumbing, electrical and all building materials suppliers in ${city}, ${district}, ${state}.`;

    case "services":
      return `Find architects, contractors, labour, plumbers, electricians, painters and construction professionals in ${city}, ${district}, ${state}.`;

    case "rentals":
      return `Find rental services, equipment rentals, machine rentals and property rentals in ${city}, ${district}, ${state}.`;
  }
}

function modulePath(module: SeoModule) {
  switch (module) {
    case "property":
      return "/property";
    case "materials":
      return "/materials";
    case "services":
      return "/services";
    case "rentals":
      return "/rentals";
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const module = isValidModule(params.module)
    ? params.module
    : "property";

  const state = normalize(params.state);
  const district = normalize(params.district);
  const city = normalize(params.city);

  const title = `${moduleTitle(module)} in ${city}, ${district}, ${state} | 3Bigha`;

  const description = moduleDescription(
    module,
    city,
    district,
    state
  );

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

export default function RegionalSeoPage({ params }: PageProps) {
  const module = isValidModule(params.module)
    ? params.module
    : "property";

  const state = normalize(params.state);
  const district = normalize(params.district);
  const city = normalize(params.city);

  const title = moduleTitle(module);

  const description = moduleDescription(
    module,
    city,
    district,
    state
  );

  const canonicalUrl = `${siteConfig.url}/seo/${module}/${params.state}/${params.district}/${params.city}`;

  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${title} in ${city}, ${district}, ${state}`,
    description,
    url: canonicalUrl,

    areaServed: {
      "@type": "AdministrativeArea",
      name: district,
      containedInPlace: {
        "@type": "State",
        name: state,
      },
    },

    provider: {
      "@type": "Organization",
      name: "3Bigha",
      url: siteConfig.url,
    },
  };

  return (
    <main
      style={{
        background: "#f8fafc",
        minHeight: "100vh",
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema),
        }}
      />

      <section
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "42px 16px",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
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
              borderRadius: 999,
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

          <div
            style={{
              marginTop: 12,
              color: "#475569",
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            {district}, {state}, India
          </div>

          <p
            style={{
              marginTop: 22,
              maxWidth: 850,
              color: "#334155",
              fontSize: 18,
              lineHeight: 1.8,
              fontWeight: 500,
            }}
          >
            {description}
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
    </main>
  );
}