import Link from "next/link";
import { generateDemandContent } from "@/lib/seo/ai-content-generator";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    slug: string;
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

function marketPathFromNeedSlug(slug: string) {
  const prefixes = [
    "building-material-supplier",
    "property-seller",
    "service-provider",
    "rental-provider",
  ];

  for (const prefix of prefixes) {
    if (slug.startsWith(`${prefix}-`)) {
      const location = slug.slice(prefix.length + 1);
      if (!location) return null;
      return `/market/${prefix}/${location}`;
    }
  }

  return null;
}

export async function generateMetadata({ params }: PageProps) {
  const supabase = getSupabase();

  if (!supabase) {
    return {
      title: "Vendor Demand Opportunity | 3Bigha",
      robots: { index: false, follow: false },
    };
  }

  const { data } = await supabase
    .from("vendor_opportunity_seo")
    .select("slug, seo_title, seo_description, is_indexable")
    .eq("slug", params.slug)
    .eq("is_indexable", true)
    .maybeSingle();

  if (!data) {
    return {
      title: "Vendor Demand Opportunity Not Found | 3Bigha",
      robots: { index: false, follow: false },
    };
  }

  const canonical = `https://www.3bigha.com/need/${encodeURIComponent(data.slug)}`;

  return {
    title: `${clean(data.seo_title)} | 3Bigha Vendor Demand`,
    description: clean(data.seo_description),
    alternates: { canonical },
    openGraph: {
      title: `${clean(data.seo_title)} | 3Bigha Vendor Demand`,
      description: clean(data.seo_description),
      url: canonical,
      type: "website",
      siteName: "3Bigha",
    },
    twitter: {
      card: "summary_large_image",
      title: `${clean(data.seo_title)} | 3Bigha Vendor Demand`,
      description: clean(data.seo_description),
    },
  };
}

export default async function NeedSlugPage({ params }: PageProps) {
  const supabase = getSupabase();
  if (!supabase) notFound();

  const { data } = await supabase
    .from("vendor_opportunity_seo")
    .select("slug, seo_title, seo_description, is_indexable, created_at")
    .eq("slug", params.slug)
    .eq("is_indexable", true)
    .maybeSingle();

  if (!data) notFound();

  const title = clean(data.seo_title);
  const description = clean(data.seo_description);
  const location = title.split(" in ").slice(1).join(" in ") || "India";
  const requirement = title.replace(/^Need\s+/i, "").split(" in ")[0];
  const marketPath = marketPathFromNeedSlug(data.slug);
  const aiContent = generateDemandContent(requirement, location);

  const schema = {
    "@context": "https://schema.org",
    "@type": "Demand",
    name: title,
    description,
    url: `https://www.3bigha.com/need/${encodeURIComponent(data.slug)}`,
    areaServed: location,
    category: "Vendor Demand Opportunity",
    provider: {
      "@type": "Organization",
      name: "3Bigha",
      url: "https://www.3bigha.com",
    },
  };

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
          Vendor Demand Opportunity
        </p>

        <h1 className="mt-3 text-2xl font-black leading-tight text-slate-950 sm:text-4xl">
          {title}
        </h1>

        <p className="mt-4 text-base font-semibold leading-7 text-slate-700">
          {description}
        </p>
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            Vendor Requirement
          </p>
          <p className="mt-2 text-lg font-black text-slate-950">
            {requirement}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            Location
          </p>
          <p className="mt-2 text-lg font-black text-slate-950">
            {location}
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
          Local business opportunity in {location}
        </h2>

        <p className="mt-3 text-sm font-semibold leading-7 text-slate-700">
          3Bigha marketplace intelligence has detected a local vendor demand
          opportunity for {requirement} in {location}. This page helps nearby
          suppliers, service providers, rental owners and property businesses
          understand where marketplace demand is emerging.
        </p>

        <p className="mt-3 text-sm font-semibold leading-7 text-slate-700">
          Businesses operating near {location} can register on 3Bigha, improve
          visibility, receive relevant enquiries and participate in future buyer
          requirements.
        </p>
      </section>

      <section className="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 sm:p-7">
        <h2 className="text-xl font-black text-slate-950">
          Become visible to local buyers
        </h2>

        <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
          Register your business profile and explore demand opportunities across
          materials, services, rentals and property categories.
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/vendor-opportunities"
            className="rounded-2xl bg-slate-950 px-5 py-3 text-center text-sm font-black text-white no-underline"
          >
            View Vendor Opportunities
          </Link>

          {marketPath && (
            <Link
              href={marketPath}
              className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-black text-slate-900 no-underline"
            >
              View Local Marketplace
            </Link>
          )}

          <Link
            href="/seo/materials/west-bengal"
            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-black text-slate-900 no-underline"
          >
            Explore West Bengal Market
          </Link>

          <Link
            href="/search"
            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-black text-slate-900 no-underline"
          >
            Browse Marketplace
          </Link>
        </div>
      </section>

      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
        <h2 className="text-lg font-black text-slate-950">
          Public and privacy-safe demand signal
        </h2>

        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
          This page shows only public vendor demand intelligence. Buyer identity,
          contact details, private RFQ data, chats and internal marketplace
          scores are not displayed.
        </p>
      </section>
    </main>
  );
}
