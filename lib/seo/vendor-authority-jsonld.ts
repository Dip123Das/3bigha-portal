import { getVendorAuthoritySummary } from "@/lib/seo/vendor-authority-graph";

type VendorJsonLdInput = {
  graph: any;
  url: string;
  logo?: string | null;
};

export function buildVendorAuthorityJsonLd({
  graph,
  url,
  logo,
}: VendorJsonLdInput) {
  const summary = getVendorAuthoritySummary(graph);

  return {
    "@context": "https://schema.org",
    "@type": "Organization",

    name: summary.vendorName,

    url,

    logo: logo || undefined,

    description: summary.summary,

    areaServed: summary.locations.map((location: string) => ({
      "@type": "Place",
      name: location,
    })),

    knowsAbout: [
      ...summary.categories,
      ...summary.services,
      ...summary.materials,
    ],

    keywords: [
      ...summary.categories,
      ...summary.services,
      ...summary.materials,
      ...summary.locations,
    ].join(", "),

    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: Math.max(
        1,
        Math.min(5, summary.authorityScore / 20)
      ).toFixed(1),

      reviewCount: graph.edges.length + graph.nodes.length,
    },

    hasOfferCatalog: {
      "@type": "OfferCatalog",

      name: `${summary.vendorName} Marketplace Services`,

      itemListElement: [
        ...summary.services.map((service: string) => ({
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: service,
          },
        })),

        ...summary.materials.map((material: string) => ({
          "@type": "Offer",
          itemOffered: {
            "@type": "Product",
            name: material,
          },
        })),
      ],
    },
  };
}