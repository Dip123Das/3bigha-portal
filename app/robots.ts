import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",

        disallow: [
          "/admin/",
          "/dashboard/",
          "/api/",
          "/login/",
          "/register/",
          "/forgot-password/",
          "/reset-password/",
          "/thread/",
          "/vendor/inbox-v2/",
        ],
      },
    ],

    sitemap: [
      `${siteConfig.url}/sitemap.xml`,
      `${siteConfig.url}/seo-sitemap.xml`,
    ],

    host: siteConfig.url,
  };
}