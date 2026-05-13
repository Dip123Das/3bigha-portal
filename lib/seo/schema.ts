import { siteConfig } from "@/lib/seo/site";

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",

    name: siteConfig.name,

    url: siteConfig.url,

    logo: `${siteConfig.url}/logo.png`,

    image: `${siteConfig.url}/og-image-new.jpg`,

    description: siteConfig.description,

    sameAs: [
      siteConfig.url,
    ],

    areaServed: {
      "@type": "Country",
      name: "India",
    },

    address: {
      "@type": "PostalAddress",
      addressLocality: "Cooch Behar",
      addressRegion: "West Bengal",
      addressCountry: "IN",
    },

    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "support@3bigha.com",
      areaServed: "IN",
      availableLanguage: ["English", "Bengali", "Hindi"],
    },
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",

    "@type": "WebSite",

    name: siteConfig.name,

    alternateName: "3bigha.com",

    url: siteConfig.url,

    description: siteConfig.description,

    inLanguage: ["en-IN", "bn-IN", "hi-IN"],

    potentialAction: {
      "@type": "SearchAction",

      target: `${siteConfig.url}/search?q={search_term_string}`,

      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}