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
          "/vendor-opportunities/",
          "/seo/",
          "/search/",
          "/price-today",
          "/investment/",
          "/emi-calculator",
          "/cost-calculator",
          "/construction-cost",
          "/house-construction-cost",
          "/compare-rates",
          "/about",
          "/contact",
        ],
        disallow: [
          "/admin/",
          "/dashboard/",
          "/api/",
          "/login",
          "/signup",
          "/thread/",
          "/inbox/",
          "/chat/",
          "/rfq/",
          "/subscription/",
          "/checkout/",
          "/payment/",
          "/*?*",
        ],
      },
    ],
    sitemap: [
      "https://www.3bigha.com/sitemap.xml",
      "https://www.3bigha.com/seo-sitemap.xml",
      "https://www.3bigha.com/seo-sitemap-categories.xml",
    ],
  };
}