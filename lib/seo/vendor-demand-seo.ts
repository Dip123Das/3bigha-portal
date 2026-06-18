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
    .limit(1000);

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
