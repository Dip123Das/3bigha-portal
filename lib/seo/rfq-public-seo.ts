import type { Metadata, MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { siteConfig } from "@/lib/seo/site";

type PublicRfqSeoRow = {
  rfq_id: string;
  slug: string;
  seo_title: string;
  seo_description: string;
  is_indexable: boolean;
  created_at: string;
  rfqs?: {
    module?: string | null;
    title?: string | null;
    city?: string | null;
    district?: string | null;
    locality?: string | null;
    needed_by?: string | null;
    budget_min?: number | null;
    budget_max?: number | null;
    currency?: string | null;
    description?: string | null;
    notes?: string | null;
  } | null;
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

function titleCase(value: string) {
  return clean(value)
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase();
      if (["tmt", "rcc", "pvc", "cpvc", "jcb"].includes(lower)) return lower.toUpperCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function locationFrom(row: PublicRfqSeoRow) {
  const rfq = row.rfqs;
  return clean(rfq?.locality || rfq?.city || rfq?.district || extractLocation(row.seo_title) || "India");
}

function extractLocation(title: string) {
  const parts = clean(title).split(/\s+in\s+/i);
  return parts.length > 1 ? parts[1] : "";
}

function itemFrom(row: PublicRfqSeoRow) {
  const raw = clean(row.rfqs?.title || row.seo_title.replace(/^Need\s+/i, "").split(/\s+in\s+/i)[0]);
  const item = raw
    .replace(/^properties$/i, "Property Sellers")
    .replace(/^materials$/i, "Building Material Suppliers")
    .replace(/^aggregate$/i, "Aggregate Suppliers")
    .replace(/^tmt bar$/i, "TMT Bar Suppliers");

  return titleCase(item);
}

function improvedTitle(row: PublicRfqSeoRow) {
  return `Need ${itemFrom(row)} in ${titleCase(locationFrom(row))}`;
}

function improvedDescription(row: PublicRfqSeoRow) {
  const item = itemFrom(row);
  const location = titleCase(locationFrom(row));

  return `A public marketplace demand signal is active for ${item} in ${location}. Local vendors, suppliers, service providers and marketplace businesses can explore similar buyer requirements through 3Bigha.`;
}

export function getPublicRfqCanonical(slug: string) {
  return `${siteConfig.url}/market-rfq/${encodeURIComponent(slug)}`;
}

export async function getPublicRfqBySlug(slug: string) {
  const safeSlug = clean(decodeURIComponent(slug || ""));
  if (!safeSlug) return null;

  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("rfq_public_seo")
    .select(`
      rfq_id,
      slug,
      seo_title,
      seo_description,
      is_indexable,
      created_at,
      rfqs:rfq_id (
        module,
        title,
        city,
        district,
        locality,
        needed_by,
        budget_min,
        budget_max,
        currency,
        description,
        notes
      )
    `)
    .eq("slug", safeSlug)
    .eq("is_indexable", true)
    .maybeSingle();

  if (error || !data) return null;

  return data as PublicRfqSeoRow;
}

export function getPublicRfqViewModel(row: PublicRfqSeoRow) {
  const rfq = row.rfqs;
  const location = titleCase(locationFrom(row));
  const item = itemFrom(row);
  const module = titleCase(clean(rfq?.module || "Marketplace"));

  return {
    title: improvedTitle(row),
    description: improvedDescription(row),
    item,
    location,
    module,
    neededBy: clean(rfq?.needed_by),
    publicSummary: clean(rfq?.description || rfq?.notes || row.seo_description),
  };
}

export async function getPublicRfqMetadata(slug: string): Promise<Metadata> {
  const row = await getPublicRfqBySlug(slug);
  const canonical = getPublicRfqCanonical(slug);

  if (!row) {
    return {
      title: "Marketplace RFQ Not Found | 3Bigha",
      robots: { index: false, follow: false },
      alternates: { canonical },
    };
  }

  const vm = getPublicRfqViewModel(row);
  const title = `${vm.title} | 3Bigha Marketplace RFQ`;

  return {
    title,
    description: vm.description,
    alternates: { canonical },
    openGraph: {
      title,
      description: vm.description,
      url: canonical,
      type: "website",
      siteName: siteConfig.name,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: vm.description,
    },
  };
}

export function getPublicRfqSchema(row: PublicRfqSeoRow) {
  const vm = getPublicRfqViewModel(row);

  return {
    "@context": "https://schema.org",
    "@type": "Demand",
    name: vm.title,
    description: vm.description,
    url: getPublicRfqCanonical(row.slug),
    areaServed: vm.location,
    category: vm.module,
    itemOffered: {
      "@type": "Service",
      name: vm.item,
    },
    provider: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
    },
  };
}

export async function getPublicRfqSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("rfq_public_seo")
    .select("slug, created_at")
    .eq("is_indexable", true)
    .limit(500);

  if (error || !Array.isArray(data)) return [];

  return data
    .filter((row) => clean(row.slug))
    .map((row) => ({
      url: getPublicRfqCanonical(row.slug),
      lastModified: row.created_at || new Date(),
      changeFrequency: "daily" as const,
      priority: 0.82,
    }));
}
