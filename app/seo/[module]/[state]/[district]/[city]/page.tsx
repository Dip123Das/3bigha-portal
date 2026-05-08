import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/lib/seo/site";
import {
  getGeoBySlugs,
  getRegionalSeoPaths,
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

function moduleDescription(module: SeoModule, city: string, district: string, state: string) {
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

export default function RegionalSeoPage({ params }: PageProps) {
  const module = isSeoModule(params.module) ? params.module : "property";

  const state = normalize(params.state);
  const district = normalize(params.district);
  const city = normalize(params.city);

  const title = moduleTitle(module);
  const description = moduleDescription(module, city, district, state);
  const canonicalUrl = `${siteConfig.url}/seo/${module}/${params.state}/${params.district}/${params.city}`;

  const bullets = seoBullets(module);

  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${title} in ${city}, ${district}, ${state}`,
    description,
    url: canonicalUrl,
    isPartOf: {
      "@type": "WebSite",
      name: siteConfig.name,
      url: siteConfig.url,
    },
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

  const geo = getGeoBySlugs(params.state, params.district, params.city);

  return (
    <main style={{ background: "#f8fafc", minHeight: "100vh" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "42px 16px 18px" }}>
        <div
          style={{
            background: "linear-gradient(135deg, #ffffff, #eff6ff)",
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

          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 28 }}>
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
              padding: 20,
              boxShadow: "0 10px 28px rgba(15,23,42,0.05)",
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 10 }}>✅</div>
            <h2 style={{ margin: 0, color: "#0f172a", fontSize: 18 }}>{item}</h2>
            <p style={{ color: "#475569", lineHeight: 1.7, fontSize: 14 }}>
              Available for users searching in {city}, {district}. 3Bigha connects
              local demand with verified marketplace workflows.
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}