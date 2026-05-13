import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/property/",
          "/materials/",
          "/services/",
          "/rentals/",
          "/blog/",
          "/seo/",
          "/search",
        ],
        disallow: [
          "/admin/",
          "/dashboard/",
          "/api/",
          "/login",
          "/thread/",
          "/buyer/",
          "/vendor/",
          "/rfq/",
          "/subscription/",
          "/checkout/",
          "/payment/",
        ],
      },
    ],
    sitemap: [
      "https://www.3bigha.com/sitemap.xml",
      "https://www.3bigha.com/seo-sitemap.xml",
    ],
  };
}