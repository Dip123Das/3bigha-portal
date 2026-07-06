export type DiscoverySection = {
  id: string;
  title: string;
  description: string;
  href: string;
  priority: "high" | "medium" | "low";
};

export function buildDiscoverySections(input?: {
  module?: string;
  category?: string | null;
  workflow?: string | null;
}) {
  const sections: DiscoverySection[] = [
    {
      id: "property",
      title: "Property Marketplace",
      description:
        "Browse land, plots, flats, commercial spaces and investment opportunities.",
      href: "/property",
      priority: "high",
    },

    {
      id: "materials",
      title: "Building Materials",
      description:
        "Discover cement, TMT, bricks, sand, electrical and construction materials.",
      href: "/materials",
      priority: "high",
    },

    {
      id: "services",
      title: "Construction Services",
      description:
        "Find contractors, engineers, architects and skilled service providers.",
      href: "/services",
      priority: "high",
    },

    {
      id: "rentals",
      title: "Machinery & Equipment Rentals",
      description:
        "Explore machinery, vehicles and equipment rental solutions.",
      href: "/rentals",
      priority: "medium",
    },

    {
      id: "price-today",
      title: "Live Market Prices",
      description:
        "Track regional material pricing and marketplace movement.",
      href: "/price-today",
      priority: "medium",
    },

    {
      id: "rfq",
      title: "Create RFQ",
      description:
        "Receive supplier quotations with workflow-driven procurement support.",
      href: "/rfq",
      priority: "high",
    },
  ];

  return sections;
}
