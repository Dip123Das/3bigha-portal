import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { siteConfig } from "@/lib/seo/site";

type VendorSeoRow = {
  slug: string | null;
  created_at: string | null;
};

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

async function getAllVendorSeoRows(): Promise<VendorSeoRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const pageSize = 1000;
  const rows: VendorSeoRow[] = [];

  for (let from = 0; from < 10000; from += pageSize) {
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from("vendor_opportunity_seo")
      .select("slug, created_at")
      .eq("is_indexable", true)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error || !Array.isArray(data) || data.length === 0) break;

    rows.push(...data);

    if (data.length < pageSize) break;
  }

  return rows;
}

export function getVendorDemandCanonical(slug: string) {
  return `${siteConfig.url}/need/${encodeURIComponent(slug)}`;
}

export async function getVendorDemandSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const data = await getAllVendorSeoRows();

  return data
    .map((row) => {
      const slug = clean(row.slug);
      if (!slug) return null;

      return {
        url: getVendorDemandCanonical(slug),
        lastModified: row.created_at || new Date(),
        changeFrequency: "daily" as const,
        priority: 0.83,
      };
    })
    .filter(Boolean) as MetadataRoute.Sitemap;
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
  const data = await getAllVendorSeoRows();
  const seen = new Set<string>();

  return data
    .map((row) => {
      const slug = clean(row.slug);
      if (!slug) return null;

      const path = marketPathFromNeedSlug(slug);
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
