import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { siteConfig } from "@/lib/seo/site";
import { buildInternalLinks } from "@/lib/seo/graph/internal-link-graph";

export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    slug: string;
  };
};

type OpportunityRow = {
  slug: string;
  seo_title: string | null;
  seo_description: string | null;
};

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

function clean(value: unknown) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCaseSlug(value: string) {
  return clean(decodeURIComponent(value || ""))
    .split("-")
    .filter(Boolean)
    .map((word) => {
      if (["tmt", "rcc", "pvc", "cpvc", "jcb"].includes(word.toLowerCase())) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function readableTitle(row: OpportunityRow) {
  return clean(row.seo_title) || titleCaseSlug(row.slug);
}

function readableDescription(row: OpportunityRow) {
  return (
    clean(row.seo_description) ||
    `Explore local demand and vendor opportunity for ${readableTitle(row)} on 3Bigha.`
  );
}

async function getOpportunityGroup(prefix: string, placeSlug: string) {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data } = await supabase
    .from("vendor_opportunity_seo")
    .select("slug, seo_title, seo_description")
    .eq("is_indexable", true)
    .like("slug", `${prefix}-%-${placeSlug}`)
    .order("created_at", { ascending: false })
    .limit(12);

  return (data || []) as OpportunityRow[];
}

export async function generateMetadata({ params }: PageProps) {
  const location = titleCaseSlug(params.slug);
const internalLinks = buildInternalLinks({ city: params.slug });
  const title = `Construction, Property & Vendor Marketplace in ${location} | 3Bigha`;
  const description = `Explore property, building materials, services, rentals and local vendor opportunities in ${location} on 3Bigha.`;

  const canonical = `${siteConfig.url}/location/${encodeURIComponent(params.slug)}`;
const internalLinks = buildInternalLinks({ city: params.slug });

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      siteName: "3Bigha",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

function OpportunityList({
  title,
  rows,
}: {
  title: string;
  rows: OpportunityRow[];
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
      <h2 className="text-xl font-black text-slate-950">{title}</h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <Link
            key={row.slug}
            href={`/need/${row.slug}`}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4 no-underline hover:border-emerald-500 hover:bg-white"
          >
            <h3 className="text-sm font-black text-slate-950">
              {readableTitle(row)}
            </h3>
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">
              {readableDescription(row)}
            </p>
          </Link>
        ))}

        {!rows.length && (
          <p className="text-sm font-semibold text-slate-600">
            Local opportunities for this category are being prepared.
          </p>
        )}
      </div>

<div className="seoInternalLinks">
<h3>Related Market Opportunities</h3>
<ul>
{internalLinks.map((item) => (
<li key={item.href}><a href={item.href}>{item.label}</a></li>
))}</ul>
</div>
    </section>
  );
}

export default async function LocationHubPage({ params }: PageProps) {
  const supabase = getSupabase();
  if (!supabase) notFound();

  const { data: place } = await supabase
    .from("geo_places")
    .select("id,name,slug,place_type,pincode")
    .eq("slug", params.slug)
const internalLinks = buildInternalLinks({ city: params.slug });
    .limit(1)
    .maybeSingle();

  if (!place) notFound();

  const location = clean(place.name) || titleCaseSlug(params.slug);
const internalLinks = buildInternalLinks({ city: params.slug });
  const canonicalUrl = `${siteConfig.url}/location/${encodeURIComponent(params.slug)}`;
const internalLinks = buildInternalLinks({ city: params.slug });

  const [propertyRows, materialRows, serviceRows, rentalRows] = await Promise.all([
    getOpportunityGroup("property-seller", params.slug),
const internalLinks = buildInternalLinks({ city: params.slug });
    getOpportunityGroup("building-material-supplier", params.slug),
const internalLinks = buildInternalLinks({ city: params.slug });
    getOpportunityGroup("service-provider", params.slug),
const internalLinks = buildInternalLinks({ city: params.slug });
    getOpportunityGroup("rental-provider", params.slug),
const internalLinks = buildInternalLinks({ city: params.slug });
  ]);

  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "Place",
      name: location,
      url: canonicalUrl,
      address: {
        "@type": "PostalAddress",
        addressLocality: location,
        addressRegion: "West Bengal",
        addressCountry: "IN",
        postalCode: clean(place.pincode) || undefined,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `Construction, Property and Vendor Marketplace in ${location}`,
      description: `Local marketplace hub for property, materials, services, rentals and vendor opportunities in ${location}.`,
      url: canonicalUrl,
      provider: {
        "@type": "Organization",
        name: "3Bigha",
        url: siteConfig.url,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
        { "@type": "ListItem", position: 2, name: "Locations", item: `${siteConfig.url}/location` },
        { "@type": "ListItem", position: 3, name: location, item: canonicalUrl },
      ],
    },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
          Local Marketplace Hub
        </p>

        <h1 className="mt-3 text-2xl font-black leading-tight text-slate-950 sm:text-4xl">
          Construction, Property & Vendor Marketplace in {location}
        </h1>

        <p className="mt-4 max-w-4xl text-base font-semibold leading-7 text-slate-700">
          Explore local property demand, building material suppliers, service
          providers, rental equipment owners and vendor opportunities in {location}.
          3Bigha connects buyers, vendors, contractors and local businesses through
          marketplace discovery and RFQ workflows.
        </p>
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-black uppercase text-slate-500">Property</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{propertyRows.length}+</p>
        </div>

<div className="seoInternalLinks">
<h3>Related Market Opportunities</h3>
<ul>
{internalLinks.map((item) => (
<li key={item.href}><a href={item.href}>{item.label}</a></li>
))}</ul>
</div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-black uppercase text-slate-500">Materials</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{materialRows.length}+</p>
        </div>

<div className="seoInternalLinks">
<h3>Related Market Opportunities</h3>
<ul>
{internalLinks.map((item) => (
<li key={item.href}><a href={item.href}>{item.label}</a></li>
))}</ul>
</div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-black uppercase text-slate-500">Services</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{serviceRows.length}+</p>
        </div>

<div className="seoInternalLinks">
<h3>Related Market Opportunities</h3>
<ul>
{internalLinks.map((item) => (
<li key={item.href}><a href={item.href}>{item.label}</a></li>
))}</ul>
</div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-black uppercase text-slate-500">Rentals</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{rentalRows.length}+</p>
        </div>

<div className="seoInternalLinks">
<h3>Related Market Opportunities</h3>
<ul>
{internalLinks.map((item) => (
<li key={item.href}><a href={item.href}>{item.label}</a></li>
))}</ul>
</div>
      </section>

      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
        <h2 className="text-xl font-black text-slate-950">
          Local demand in {location}
        </h2>
        <p className="mt-3 text-sm font-semibold leading-7 text-slate-700">
          {location} has active marketplace demand across property, construction
          materials, local services and rental equipment. Buyers may search for
          land, homes, cement, TMT, electricians, plumbers, JCB rentals, concrete
          mixers and other local construction requirements.
        </p>
        <p className="mt-3 text-sm font-semibold leading-7 text-slate-700">
          Vendors and service providers operating near {location} can use 3Bigha
          to improve visibility, receive enquiries and participate in buyer RFQ
          opportunities.
        </p>
      </section>

      <div className="mt-5 grid gap-5">
        <OpportunityList title={`Property opportunities in ${location}`} rows={propertyRows} />
        <OpportunityList title={`Building material opportunities in ${location}`} rows={materialRows} />
        <OpportunityList title={`Service provider opportunities in ${location}`} rows={serviceRows} />
        <OpportunityList title={`Rental provider opportunities in ${location}`} rows={rentalRows} />
      </div>

<div className="seoInternalLinks">
<h3>Related Market Opportunities</h3>
<ul>
{internalLinks.map((item) => (
<li key={item.href}><a href={item.href}>{item.label}</a></li>
))}</ul>
</div>

      <section className="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 sm:p-7">
        <h2 className="text-xl font-black text-slate-950">
          Become Vendor with AI-powered 3Bigha
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
          List your business, property, materials, services or rental equipment and
          become visible to buyers searching in {location}.
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/vendor-opportunities"
            className="rounded-2xl bg-slate-950 px-5 py-3 text-center text-sm font-black text-white no-underline"
          >
            View Vendor Opportunities
          </Link>
          <Link
            href="/rfq/general/new"
            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-black text-slate-900 no-underline"
          >
            Submit Requirement
          </Link>
          <Link
            href="/search"
            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-black text-slate-900 no-underline"
          >
            Browse Marketplace
          </Link>
        </div>

<div className="seoInternalLinks">
<h3>Related Market Opportunities</h3>
<ul>
{internalLinks.map((item) => (
<li key={item.href}><a href={item.href}>{item.label}</a></li>
))}</ul>
</div>
      </section>
    </main>
  );
}
