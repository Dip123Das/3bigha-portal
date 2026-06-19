import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import JsonLd from "@/components/seo/JsonLd";
import { siteConfig } from "@/lib/seo/site";
import { breadcrumbSchema } from "@/lib/seo/schema";
import {
  buildAiSeoContent,
  buildFaqSchema,
} from "@/lib/seo/ai-search-content";

type PageProps = {
  params: {
    id: string;
  };
};

type ServiceRow = {
  provider_service_id: string;
  provider_id: string | null;
  provider_name: string | null;
  provider_slug: string | null;
  provider_kind: string | null;
  provider_phone: string | null;
  provider_email: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  provider_status: string | null;
  custom_category: string | null;
  custom_subcategory: string | null;
  custom_service: string | null;
  service_description: string | null;
  service_is_active: boolean | null;
  pricing_kind: string | null;
  min_price: number | null;
  max_price: number | null;
  currency: string | null;
};

export const dynamic = "force-dynamic";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(
    value
  );
}

function clean(value: unknown) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function fmtMoney(currency: string | null, amount: number | null) {
  if (amount == null) return "";
  const cur = clean(currency || "INR").toUpperCase();
  const symbol = cur === "INR" ? "₹" : `${cur} `;
  return `${symbol}${Number(amount).toLocaleString("en-IN")}`;
}

function getServiceName(row: ServiceRow) {
  return (
    clean(row.custom_service) ||
    clean(row.custom_subcategory) ||
    clean(row.custom_category) ||
    "Construction Service"
  );
}

function getLocation(row: ServiceRow) {
  return [row.city, row.district, row.state].map(clean).filter(Boolean).join(", ");
}

function getPriceText(row: ServiceRow) {
  const min = row.min_price ?? null;
  const max = row.max_price ?? null;

  if (min === null && max === null) return "Contact for quote";

  const minText = fmtMoney(row.currency, min);
  const maxText = fmtMoney(row.currency, max);

  const range =
    min !== null && max !== null && min !== max
      ? `${minText} – ${maxText}`
      : minText || maxText;

  return `${range}${row.pricing_kind ? ` / ${row.pricing_kind}` : ""}`;
}

async function getService(id: string) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("v_service_listings")
    .select(
      [
        "provider_service_id",
        "provider_id",
        "provider_name",
        "provider_slug",
        "provider_kind",
        "provider_phone",
        "provider_email",
        "city",
        "district",
        "state",
        "provider_status",
        "custom_category",
        "custom_subcategory",
        "custom_service",
        "service_description",
        "service_is_active",
        "pricing_kind",
        "min_price",
        "max_price",
        "currency",
      ].join(",")
    )
    .eq("provider_service_id", id)
    .maybeSingle();

  if (error || !data) return null;

  return data as unknown as ServiceRow;
}

export async function generateMetadata({ params }: PageProps) {
  const id = clean(params.id);

  if (!id || !isUuid(id)) {
    return {
      title: "Service Not Found | 3Bigha",
      robots: { index: false, follow: false },
    };
  }

  const row = await getService(id);

  if (!row || row.service_is_active === false) {
    return {
      title: "Service Not Found | 3Bigha",
      robots: { index: false, follow: false },
    };
  }

  const name = getServiceName(row);
  const location = getLocation(row);
  const title = `${name}${location ? ` in ${location}` : ""} | 3Bigha`;
  const description =
    clean(row.service_description) ||
    `Find ${name.toLowerCase()}${location ? ` in ${location}` : ""} on 3Bigha. Connect with local service providers and submit requirements.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${siteConfig.url}/services/${encodeURIComponent(id)}`,
    },
    openGraph: {
      title,
      description,
      url: `${siteConfig.url}/services/${encodeURIComponent(id)}`,
      type: "website",
      siteName: siteConfig.name,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ServiceDetailsPage({ params }: PageProps) {
  const id = clean(params.id);

  if (!id || !isUuid(id)) {
    notFound();
  }

  const row = await getService(id);

  if (!row || row.service_is_active === false) {
    notFound();
  }

  const name = getServiceName(row);
  const location = getLocation(row);
  const priceText = getPriceText(row);
  const canonicalUrl = `${siteConfig.url}/services/${encodeURIComponent(id)}`;

  const aiSeo = buildAiSeoContent({
    module: "services",
    title: name,
    category: row.custom_category || row.custom_subcategory || "Service",
    type: row.custom_service || row.provider_kind || "Service Provider",
    city: row.city || "",
    district: row.district || "",
    locality: "",
    price: row.min_price || row.max_price || null,
    listingType: row.pricing_kind || "Service",
  });

  const faqSchema = buildFaqSchema(aiSeo.faq);

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description:
      clean(row.service_description) ||
      "Construction and real estate service listing on 3Bigha.",
    url: canonicalUrl,
    areaServed: location || "India",
    provider: {
      "@type": "Organization",
      name: clean(row.provider_name) || "3Bigha Service Provider",
      email: clean(row.provider_email) || undefined,
      telephone: clean(row.provider_phone) || undefined,
    },
    offers:
      row.min_price !== null || row.max_price !== null
        ? {
            "@type": "Offer",
            priceCurrency: clean(row.currency) || "INR",
            price:
              row.min_price !== null
                ? row.min_price
                : row.max_price !== null
                ? row.max_price
                : undefined,
            description: priceText,
            url: canonicalUrl,
          }
        : undefined,
  };

  const relatedLinks = [
    {
      label: `Search more services${location ? ` in ${location}` : ""}`,
      href: `/services?q=${encodeURIComponent(location || name)}`,
    },
    {
      label: `Submit service requirement${location ? ` in ${location}` : ""}`,
      href: `/rfq/general/new?module=services&q=${encodeURIComponent(name)}`,
    },
    {
      label: `Find vendors${location ? ` near ${location}` : ""}`,
      href: `/vendor/discovery?q=${encodeURIComponent(name)}${
        row.district ? `&district=${encodeURIComponent(row.district)}` : ""
      }`,
    },
  ];

  return (
    <main style={{ background: "#f8fafc", minHeight: "100vh" }}>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Home", url: siteConfig.url },
            { name: "Services", url: `${siteConfig.url}/services` },
            { name, url: canonicalUrl },
          ]),
          serviceSchema,
          faqSchema,
        ]}
      />

      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "34px 16px" }}>
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 24,
            padding: 28,
            boxShadow: "0 16px 40px rgba(15,23,42,0.06)",
          }}
        >
          <Link
            href="/services"
            style={{
              color: "#2563eb",
              fontWeight: 900,
              textDecoration: "none",
            }}
          >
            ← Back to Services
          </Link>

          <div
            style={{
              display: "inline-flex",
              marginTop: 18,
              background: "#dcfce7",
              color: "#166534",
              borderRadius: 999,
              padding: "7px 12px",
              fontSize: 12,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Verified Service Listing
          </div>

          <h1
            style={{
              margin: "16px 0 0",
              fontSize: "clamp(30px, 5vw, 52px)",
              lineHeight: 1.05,
              color: "#0f172a",
              letterSpacing: "-0.04em",
            }}
          >
            {name}
          </h1>

          <p
            style={{
              marginTop: 14,
              color: "#475569",
              fontSize: 17,
              fontWeight: 700,
            }}
          >
            {location || "India"} · {priceText}
          </p>

          <p
            style={{
              marginTop: 20,
              color: "#334155",
              lineHeight: 1.8,
              fontSize: 16,
              fontWeight: 600,
              maxWidth: 860,
            }}
          >
            {clean(row.service_description) ||
              `${name} service available through 3Bigha. Connect with local providers, compare options and submit your requirement for faster vendor response.`}
          </p>

          <div
            style={{
              marginTop: 22,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
            }}
          >
            {[
              ["Provider", clean(row.provider_name) || "3Bigha Provider"],
              ["Category", clean(row.custom_category) || "Service"],
              ["Subcategory", clean(row.custom_subcategory) || name],
              ["Status", clean(row.provider_status) || "Active"],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 16,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    color: "#64748b",
                    fontSize: 12,
                    fontWeight: 900,
                    textTransform: "uppercase",
                  }}
                >
                  {label}
                </div>
                <div style={{ marginTop: 6, color: "#0f172a", fontWeight: 900 }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 22, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link
              href={`/rfq/general/new?module=services&q=${encodeURIComponent(name)}`}
              style={{
                background: "#0f172a",
                color: "#ffffff",
                padding: "13px 18px",
                borderRadius: 14,
                fontWeight: 900,
                textDecoration: "none",
              }}
            >
              Submit Requirement
            </Link>

            <Link
              href={`/vendor/discovery?q=${encodeURIComponent(name)}`}
              style={{
                background: "#ffffff",
                color: "#0f172a",
                border: "1px solid #cbd5e1",
                padding: "13px 18px",
                borderRadius: 14,
                fontWeight: 900,
                textDecoration: "none",
              }}
            >
              Find Similar Vendors
            </Link>
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 16px 40px" }}>
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 22,
            padding: 24,
          }}
        >
          <h2 style={{ margin: 0, color: "#0f172a", fontSize: 24 }}>
            Related Market Links
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
              marginTop: 16,
            }}
          >
            {relatedLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 14,
                  padding: "13px 14px",
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
    </main>
  );
}
