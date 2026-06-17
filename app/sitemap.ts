import type { MetadataRoute } from "next";

import { createClient } from "@supabase/supabase-js";
import { siteConfig } from "@/lib/seo/site";
import { seoModules } from "@/lib/geo/india-geo";
import { getAllSeoUrlsFromDb } from "@/lib/geography/seoAdapter";
import { isIndexableStaticPath, hasSeoMinimumQuality, isSafePublicId } from "@/lib/seo/url-policy";

type SitemapRow = {
  id?: string | null;
  slug?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  published_at?: string | null;
};

function route(path: string) {
  return `${siteConfig.url}${path}`;
}

function lastModified(row: SitemapRow) {
  return row.updated_at || row.published_at || row.created_at || new Date();
}

function safeId(value: unknown) {
  return encodeURIComponent(String(value || "").trim());
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const regionalSeoRoutes = (await getAllSeoUrlsFromDb(seoModules))
    .filter((path) => path.startsWith("/seo/"))
    .filter((path) => !path.includes("/category/"));

const staticRoutes = [
  "",

  "/seo/property/west-bengal/cooch-behar/cooch-behar",
  "/seo/materials/west-bengal/cooch-behar/cooch-behar",
  "/seo/services/west-bengal/cooch-behar/cooch-behar",
  "/seo/rentals/west-bengal/cooch-behar/cooch-behar",


  "/property",
  "/materials",
  "/services",
  "/rentals",
  "/price-today",
  "/emi-calculator",
  "/land-area-calculator",
  "/cost-calculator",
  "/construction-cost",
  "/house-construction-cost",
  "/compare-rates",
  "/blog",
  "/investment",
  "/search",
  "/about",
  "/contact",
  "/privacy-policy",
  "/terms-and-conditions",
  "/refund-cancellation-policy",
  ...regionalSeoRoutes,
];

  const staticPages: MetadataRoute.Sitemap = staticRoutes
    .filter((path) => path.startsWith("/seo/") || isIndexableStaticPath(path))
    .map((path) => ({
    url: route(path),
    lastModified: now,
    changeFrequency:
    path === ""
      ? "hourly"
      : path.startsWith("/search/")
      ? "daily"
      : path.startsWith("/seo/")
      ? "daily"
      : "weekly",
    priority:
      path === ""
        ? 1
        : path.startsWith("/seo/")
        ? 0.88
        : path.startsWith("/search/")
        ? 0.84
        : [
            "/emi-calculator",
            "/land-area-calculator",
                      "/cost-calculator",
            "/construction-cost",
            "/house-construction-cost",
            "/compare-rates",
          ].includes(path)
        ? 0.86
        : 0.8,
  }));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return staticPages;
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
    },
  });

  const [
    propertyRes,
    materialRes,
    serviceRes,
    rentalRes,
    blogRes,
    investmentRes,
  ] = await Promise.allSettled([
    supabase
      .from("property_listings_public")
      .select("id,title,city,district,locality,state,description,updated_at,created_at,published_at")
      .limit(5000),

    supabase
      .from("material_listings")
      .select("id,title,description,local_name,updated_at,created_at")
      .eq("is_public", true)
      .eq("is_active", true)
      .limit(5000),

    supabase
      .from("service_listings")
      .select("id,title,description,updated_at,created_at")
      .limit(5000),

    supabase
      .from("rental_listings_public")
      .select("id,title,description,city,district,state,updated_at,created_at")
      .limit(5000),

    supabase
      .from("blog_posts")
      .select("slug,updated_at,created_at,published_at")
      .eq("status", "published")
      .limit(5000),

    supabase
      .from("investment_opportunities")
      .select("slug,updated_at,created_at,published_at")
      .limit(5000),
  ]);

  const dynamicPages: MetadataRoute.Sitemap = [];

  if (propertyRes.status === "fulfilled" && !propertyRes.value.error) {
    (propertyRes.value.data || []).forEach((row: SitemapRow & Record<string, any>) => {
      if (!isSafePublicId(row.id)) return;
      if (!hasSeoMinimumQuality(row as Record<string, any>)) return;

      const title = String(row.title || "").trim();
      const place = [row.locality, row.city, row.district, row.state].filter(Boolean).join(" ");
      const desc = String(row.description || "").trim();

      if (title.length < 6) return;
      if (!desc && place.length < 4) return;

      dynamicPages.push({
        url: route(`/property/${safeId(row.id)}`),
        lastModified: lastModified(row),
        changeFrequency: "weekly",
        priority: 0.75,
      });
    });
  }

  if (materialRes.status === "fulfilled" && !materialRes.value.error) {
    (materialRes.value.data || []).forEach((row: SitemapRow) => {
      if (!isSafePublicId(row.id)) return;
      if (!hasSeoMinimumQuality(row as Record<string, any>)) return;

      dynamicPages.push({
        url: route(`/materials/${safeId(row.id)}`),
        lastModified: lastModified(row),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    });
  }

  if (serviceRes.status === "fulfilled" && !serviceRes.value.error) {
    (serviceRes.value.data || []).forEach((row: SitemapRow) => {
      if (!isSafePublicId(row.id)) return;
      if (!hasSeoMinimumQuality(row as Record<string, any>)) return;

      dynamicPages.push({
        url: route(`/services/${safeId(row.id)}`),
        lastModified: lastModified(row),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    });
  }

  if (rentalRes.status === "fulfilled" && !rentalRes.value.error) {
    (rentalRes.value.data || []).forEach((row: SitemapRow) => {
      if (!isSafePublicId(row.id)) return;
      if (!hasSeoMinimumQuality(row as Record<string, any>)) return;

      dynamicPages.push({
        url: route(`/rentals/${safeId(row.id)}`),
        lastModified: lastModified(row),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    });
  }

  if (blogRes.status === "fulfilled" && !blogRes.value.error) {
    (blogRes.value.data || []).forEach((row: SitemapRow) => {
      if (!row.slug) return;

      dynamicPages.push({
        url: route(`/blog/${safeId(row.slug)}`),
        lastModified: lastModified(row),
        changeFrequency: "weekly",
        priority: 0.65,
      });
    });
  }

  if (investmentRes.status === "fulfilled" && !investmentRes.value.error) {
    (investmentRes.value.data || []).forEach((row: SitemapRow) => {
      if (!row.slug) return;

      dynamicPages.push({
        url: route(`/investment/opportunities/${safeId(row.slug)}`),
        lastModified: lastModified(row),
        changeFrequency: "weekly",
        priority: 0.65,
      });
    });
  }

  return [...staticPages, ...dynamicPages];
}