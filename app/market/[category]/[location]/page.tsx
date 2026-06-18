import Link from "next/link";
import { generateMarketContent } from "@/lib/seo/ai-content-generator";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    category: string;
    location: string;
  };
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

function categoryLabel(category: string) {
  const label = titleCaseSlug(category);

  if (/building material supplier/i.test(label)) return "Building Material Suppliers";
  if (/property seller/i.test(label)) return "Property Sellers";
  if (/service provider/i.test(label)) return "Service Providers";
  if (/rental provider/i.test(label)) return "Rental Providers";

  return label;
}

function marketSlugToNeedSlug(category: string, location: string) {
  const cleanCategory = clean(category);
  const cleanLocation = clean(location);

  if (!cleanCategory || !cleanLocation) return null;

  return `${cleanCategory}-${cleanLocation}`;
}

function getLocationTail(category: string, location: string) {
  const cleanCategory = clean(category);
  const cleanLocation = clean(location);

  if (!cleanLocation.startsWith(`${cleanCategory}-`)) return cleanLocation;

  return cleanLocation.slice(cleanCategory.length + 1);
}

export async function generateMetadata({ params }: PageProps) {
  const category = categoryLabel(params.category);
  const location = titleCaseSlug(params.location);
  const title = `${category} in ${location} | 3Bigha Marketplace`;
  const description = `Find marketplace demand, vendor opportunities and local business signals for ${category} in ${location} on 3Bigha.`;

  const canonical = `https://www.3bigha.com/market/${encodeURIComponent(
    params.category
  )}/${encodeURIComponent(params.location)}`;

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
  };
}

export default async function MarketCategoryLocationPage({ params }: PageProps) {
  const supabase = getSupabase();
  if (!supabase) notFound();

  const category = categoryLabel(params.category);
  const location = titleCaseSlug(params.location);
  const aiContent = generateMarketContent(category, location);
  const exactNeedSlug = marketSlugToNeedSlug(params.category, params.location);
  const locationTail = getLocationTail(params.category, params.location);
  const locationLabel = titleCaseSlug(locationTail);

  const { data: exactRows } = exactNeedSlug
    ? await supabase
        .from("vendor_opportunity_seo")
        .select("slug, seo_title, seo_description")
        .eq("is_indexable", true)
        .eq("slug", exactNeedSlug)
        .limit(1)
    : { data: [] };

  const { data: nearbyRows } = await supabase
    .from("vendor_opportunity_seo")
    .select("slug, seo_title, seo_description")
    .eq("is_indexable", true)
    .ilike("seo_title", `%${locationLabel}%`)
    .limit(20);

  const data = [...(exactRows || []), ...(nearbyRows || [])].filter(
    (row, index, arr) => arr.findIndex((item) => item.slug === row.slug) === index
  );

  const related = data.filter((row) =>
    clean(row.seo_title).toLowerCase().includes(category.toLowerCase().split(" ")[0])
  );

  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${category} in ${location}`,
    description: `Marketplace demand and vendor opportunity page for ${category} in ${location}.`,
    url: `https://www.3bigha.com/market/${encodeURIComponent(
      params.category
    )}/${encodeURIComponent(params.location)}`,
    about: category,
    spatialCoverage: location,
    provider: {
      "@type": "Organization",
      name: "3Bigha",
      url: "https://www.3bigha.com",
    },
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
          Local Marketplace Page
        </p>

        <h1 className="mt-3 text-2xl font-black leading-tight text-slate-950 sm:text-4xl">
          {category} in {location}
        </h1>

        <p className="mt-4 max-w-4xl text-base font-semibold leading-7 text-slate-700">
          Explore public marketplace demand, vendor opportunities and local
          business signals for {category} in {location}. 3Bigha helps buyers,
          vendors, service providers, rental owners and property businesses
          discover local opportunities.
        </p>
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            Category
          </p>
          <p className="mt-2 text-lg font-black text-slate-950">{category}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            Location
          </p>
          <p className="mt-2 text-lg font-black text-slate-950">{location}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            Marketplace Type
          </p>
          <p className="mt-2 text-lg font-black text-slate-950">
            Public Demand
          </p>
        </div>
      </section>

      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
        <h2 className="text-xl font-black text-slate-950">
          {aiContent.heading}
        </h2>

        <div className="mt-3 grid gap-3">
          {aiContent.paragraphs.map((paragraph) => (
            <p
              key={paragraph}
              className="text-sm font-semibold leading-7 text-slate-700"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
        <h2 className="text-xl font-black text-slate-950">
          Demand signals for {category} in {location}
        </h2>

        <p className="mt-3 text-sm font-semibold leading-7 text-slate-700">
          This page is designed for people searching for {category} near {location}.
          It connects local marketplace demand with vendor onboarding,
          procurement discovery and buyer requirement signals.
        </p>

        <p className="mt-3 text-sm font-semibold leading-7 text-slate-700">
          Vendors operating in or around {location} can improve visibility by
          registering on 3Bigha and keeping their business profile updated.
        </p>
      </section>

      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
        <h2 className="text-xl font-black text-slate-950">
          Related vendor demand opportunities
        </h2>

        <div className="mt-4 grid gap-3">
          {(related.length ? related : data || []).slice(0, 8).map((row) => (
            <Link
              key={row.slug}
              href={`/need/${row.slug}`}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 no-underline hover:border-emerald-500"
            >
              <h3 className="font-black text-slate-950">{row.seo_title}</h3>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                {row.seo_description}
              </p>
            </Link>
          ))}

          {!data?.length && (
            <p className="text-sm font-semibold text-slate-600">
              Related opportunities are being prepared for this location.
            </p>
          )}
        </div>
      </section>

      <section className="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 sm:p-7">
        <h2 className="text-xl font-black text-slate-950">
          Grow your business in {location}
        </h2>

        <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
          Join 3Bigha to discover buyer demand, vendor opportunities and
          marketplace visibility for your local business.
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/vendor-opportunities"
            className="rounded-2xl bg-slate-950 px-5 py-3 text-center text-sm font-black text-white no-underline"
          >
            View Vendor Opportunities
          </Link>

          <Link
            href="/seo/materials/west-bengal/cooch-behar"
            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-black text-slate-900 no-underline"
          >
            Explore Regional Marketplace
          </Link>
          <Link
            href="/vendor-opportunities"
            className="rounded-2xl bg-slate-950 px-5 py-3 text-center text-sm font-black text-white no-underline"
          >
            View Vendor Opportunities
          </Link>

          <Link
            href="/need"
            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-black text-slate-900 no-underline"
          >
            Browse Demand Pages
          </Link>
        </div>
      </section>
    </main>
  );
}
