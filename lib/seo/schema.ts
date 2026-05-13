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

export function aiMarketplaceSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",

    name: "3bigha.com",
    alternateName: ["3bigha", "3 bigha"],

    url: "https://www.3bigha.com",

    description:
      "AI-powered property, construction, RFQ, materials, rentals and vendor marketplace platform in India.",

    potentialAction: {
      "@type": "SearchAction",

      target:
        "https://www.3bigha.com/search?q={search_term_string}",

      "query-input": "required name=search_term_string",
    },

    keywords: [
      "property marketplace",
      "construction marketplace",
      "RFQ marketplace",
      "materials marketplace",
      "vendor marketplace",
      "construction services",
      "rental marketplace",
      "AI procurement",
      "3bigha",
      "3 bigha",
    ],

    areaServed: {
      "@type": "Country",
      name: "India",
    },
  };
}

export function marketplaceFaqSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",

    mainEntity: [
      {
        "@type": "Question",
        name: "What is 3bigha.com?",

        acceptedAnswer: {
          "@type": "Answer",

          text:
            "3bigha.com is an AI-powered marketplace platform for property, construction materials, RFQ procurement, rentals, vendors and local services in India.",
        },
      },

      {
        "@type": "Question",
        name: "Can users submit RFQ requirements on 3bigha.com?",

        acceptedAnswer: {
          "@type": "Answer",

          text:
            "Users can submit procurement and construction RFQ requirements and receive vendor quotations through AI-assisted marketplace workflows.",
        },
      },

      {
        "@type": "Question",
        name: "Does 3bigha.com support local marketplace discovery?",

        acceptedAnswer: {
          "@type": "Answer",

          text:
            "3bigha.com supports regional and local marketplace discovery for property, construction materials, rentals, services and verified vendors.",
        },
      },
    ],
  };
}