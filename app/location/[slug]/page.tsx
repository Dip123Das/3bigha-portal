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

function InternalLinksBlock({ links }: { links: { label: string; href: string }[] }) {
  if (!links?.length) return null;

  return (
    <div className="seoInternalLinks">
      <h3>Related Market Opportunities</h3>
      <ul>
        {links.map((item) => (
          <li key={item.href}>
            <a href={item.href}>{item.label}</a>
          </li>
        ))}
      </ul>
    </div>
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
  const title = `Construction, Property & Vendor Marketplace in ${location} | 3Bigha`;
  const description = `Explore property, building materials, services, rentals and local vendor opportunities in ${location} on 3Bigha.`;

  const canonical = `${siteConfig.url}/location/${encodeURIComponent(params.slug)}`;

  return {
    title,
    description,
    alternates: { canonical },
  };
}

export default async function LocationHubPage({ params }: PageProps) {
  const supabase = getSupabase();
  if (!supabase) notFound();

  const { data: place } = await supabase
    .from("geo_places")
    .select("id,name,slug,place_type,pincode")
    .eq("slug", params.slug)
    .limit(1)
    .maybeSingle();

  if (!place) notFound();

  const location = clean(place.name) || titleCaseSlug(params.slug);

  const canonicalUrl = `${siteConfig.url}/location/${encodeURIComponent(params.slug)}`;

  const internalLinks = buildInternalLinks({
    city: params.slug,
  });

  const [propertyRows, materialRows, serviceRows, rentalRows] =
    await Promise.all([
      getOpportunityGroup("property-seller", params.slug),
      getOpportunityGroup("building-material-supplier", params.slug),
      getOpportunityGroup("service-provider", params.slug),
      getOpportunityGroup("rental-provider", params.slug),
    ]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-3xl border bg-white p-5 sm:p-7">
        <h1 className="text-2xl font-black sm:text-4xl">
          Marketplace in {location}
        </h1>

        <p className="mt-3 text-sm font-semibold text-slate-700">
          Explore property, materials, services and rentals in {location}.
        </p>
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-4">
        <div className="rounded-3xl border bg-white p-5">
          Property: {propertyRows.length}
        </div>

        <div className="rounded-3xl border bg-white p-5">
          Materials: {materialRows.length}
        </div>

        <div className="rounded-3xl border bg-white p-5">
          Services: {serviceRows.length}
        </div>

        <div className="rounded-3xl border bg-white p-5">
          Rentals: {rentalRows.length}
        </div>
      </section>

      <section className="mt-6 grid gap-5">
        <InternalLinksBlock links={internalLinks} />

        <InternalLinksBlock links={internalLinks} />
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-black">Opportunities</h2>
      </section>
    </main>
  );
}