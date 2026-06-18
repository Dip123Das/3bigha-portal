import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { siteConfig } from "@/lib/seo/site";

function clean(value: unknown) {
  return String(value || "").trim();
}

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

export function getVendorDemandCanonical(slug: string) {
  return `${siteConfig.url}/need/${encodeURIComponent(slug)}`;
}

export async function getVendorDemandSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("vendor_opportunity_seo")
    .select("slug, created_at")
    .eq("is_indexable", true)
    .order("created_at", { ascending: false })
    .range(0, 9999);

  if (error || !Array.isArray(data)) return [];

  return data
    .filter((row) => clean(row.slug))
    .map((row) => ({
      url: getVendorDemandCanonical(row.slug),
      lastModified: row.created_at || new Date(),
      changeFrequency: "daily" as const,
      priority: 0.83,
    }));
}


function stripShortId(slug: string) {
  return slug.replace(/-[a-f0-9]{8}$/i, "");
}

function marketPathFromNeedSlug(slug: string) {
  const cleanSlug = stripShortId(clean(slug));

  const prefixes = [
    "building-material-supplier",
    "property-seller",
    "service-provider",
    "rental-provider",
  ];

  for (const prefix of prefixes) {
    if (cleanSlug === prefix) return null;
    if (cleanSlug.startsWith(`${prefix}-`)) {
      const location = cleanSlug.slice(prefix.length + 1);
      if (!location) return null;
      return `/market/${prefix}/${location}`;
    }
  }

  return null;
}

export async function getMarketDemandSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("vendor_opportunity_seo")
    .select("slug, created_at")
    .eq("is_indexable", true)
    .order("created_at", { ascending: false })
    .range(0, 9999);

  if (error || !Array.isArray(data)) return [];

  const seen = new Set<string>();

  return data
    .map((row) => {
      const path = marketPathFromNeedSlug(row.slug);
      if (!path || seen.has(path)) return null;
      seen.add(path);

      return {
        url: `${siteConfig.url}${path}`,
        lastModified: row.created_at || new Date(),
        changeFrequency: "daily" as const,
        priority: 0.84,
      };
    })
    .filter(Boolean) as MetadataRoute.Sitemap;
}
