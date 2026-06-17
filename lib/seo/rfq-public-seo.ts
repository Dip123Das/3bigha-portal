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
    .select("rfq_id, slug, seo_title, seo_description, is_indexable, created_at")
    .eq("slug", safeSlug)
    .eq("is_indexable", true)
    .maybeSingle();

  if (error || !data) return null;

  return data as PublicRfqSeoRow;
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

  const title = `${clean(row.seo_title)} | 3Bigha Marketplace RFQ`;
  const description = clean(row.seo_description);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
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

export function getPublicRfqSchema(row: PublicRfqSeoRow) {
  return {
    "@context": "https://schema.org",
    "@type": "Demand",
    name: clean(row.seo_title),
    description: clean(row.seo_description),
    url: getPublicRfqCanonical(row.slug),
    category: "Marketplace Requirement",
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
