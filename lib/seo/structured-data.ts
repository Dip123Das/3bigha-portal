import type { SeoModule } from "@/lib/geo/india-geo";
import { siteConfig } from "@/lib/seo/site";

type SchemaGeo = {
  state: string;
  district?: string;
  city?: string;
  locality?: string;
};

function clean(value?: string) {
  return (value || "").trim();
}

function areaName(geo: SchemaGeo) {
  return [geo.locality, geo.city, geo.district, geo.state]
    .filter(Boolean)
    .join(", ");
}

function moduleName(module: SeoModule) {
  if (module === "property") return "Property";
  if (module === "materials") return "Building Materials";
  if (module === "services") return "Construction Services";
  return "Rental Services";
}

export function buildBreadcrumbSchema(items: { name: string; url: string }[]) {
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

export function buildRegionalSeoSchema({
  module,
  geo,
  url,
}: {
  module: SeoModule;
  geo: SchemaGeo;
  url: string;
}) {
  const area = areaName(geo);
  const name = `${moduleName(module)} in ${area}`;

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    url,
    description: `Explore ${moduleName(module).toLowerCase()} opportunities, vendors, listings and RFQ workflows in ${area} through 3Bigha.`,
    isPartOf: {
      "@type": "WebSite",
      name: siteConfig.name,
      url: siteConfig.url,
    },
    about: {
      "@type": "Thing",
      name: moduleName(module),
    },
    areaServed: {
      "@type": "Place",
      name: area,
      address: {
        "@type": "PostalAddress",
        addressRegion: clean(geo.state),
        addressLocality: clean(geo.city || geo.district || geo.state),
        addressCountry: "IN",
      },
    },
  };
}

export function buildMarketplaceSchema({
  module,
  geo,
  url,
}: {
  module: SeoModule;
  geo: SchemaGeo;
  url: string;
}) {
  const area = areaName(geo);

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: `3Bigha ${moduleName(module)} Marketplace - ${area}`,
    url,
    image: `${siteConfig.url}/og-image.jpg`,
    description: `3Bigha helps users discover ${moduleName(module).toLowerCase()}, vendors, listings, RFQs and marketplace opportunities in ${area}.`,
    areaServed: {
      "@type": "Place",
      name: area,
    },
    address: {
      "@type": "PostalAddress",
      addressRegion: clean(geo.state),
      addressLocality: clean(geo.city || geo.district || geo.state),
      addressCountry: "IN",
    },
  };
}

export function buildModuleSchema({
  module,
  geo,
  url,
}: {
  module: SeoModule;
  geo: SchemaGeo;
  url: string;
}) {
  const area = areaName(geo);

  if (module === "materials") {
    return {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `Building Materials in ${area}`,
      url,
      description: `Find cement, steel, sand, stone chips, bricks, doors, windows, plumbing, electrical and construction materials in ${area}.`,
      about: {
        "@type": "Thing",
        name: "Building Materials",
      },
      areaServed: {
        "@type": "Place",
        name: area,
      },
    };
  }

  if (module === "services") {
    return {
      "@context": "https://schema.org",
      "@type": "Service",
      name: `Construction Services in ${area}`,
      url,
      description: `Find contractors, architects, plumbers, electricians, masons, painters, carpenters and construction service providers in ${area}.`,
      serviceType: "Construction Services",
      areaServed: area,
    };
  }

  if (module === "rentals") {
    return {
      "@context": "https://schema.org",
      "@type": "Service",
      name: `Rental Services in ${area}`,
      url,
      description: `Find JCB rental, construction equipment rental, shuttering rental, scaffolding rental and property rental services in ${area}.`,
      serviceType: "Rental Services",
      areaServed: area,
    };
  }

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Property in ${area}`,
    url,
    description: `Find land, plots, flats, houses, commercial property and builder projects in ${area}.`,
    about: {
      "@type": "Thing",
      name: "Real Estate",
    },
    areaServed: area,
  };
}

export function buildFaqSchema(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function buildSearchActionSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteConfig.url}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildSeoSchemaGraph({
  module,
  geo,
  url,
  breadcrumbs,
  faqs,
}: {
  module: SeoModule;
  geo: SchemaGeo;
  url: string;
  breadcrumbs: { name: string; url: string }[];
  faqs?: { question: string; answer: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      buildSearchActionSchema(),
      buildBreadcrumbSchema(breadcrumbs),
      buildRegionalSeoSchema({ module, geo, url }),
      buildMarketplaceSchema({ module, geo, url }),
      buildModuleSchema({ module, geo, url }),
      ...(faqs?.length ? [buildFaqSchema(faqs)] : []),
    ],
  };
}