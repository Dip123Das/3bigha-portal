export type CrossModuleSuggestion = {
  title: string;
  subtitle: string;
  href: string;
  icon: string;
  badge: string;
};

function compactLocation(input: {
  locality?: string | null;
  city?: string | null;
  district?: string | null;
}) {
  return input.locality || input.city || input.district || "your area";
}

export function buildPropertyCrossModuleSuggestions(input: {
  title?: string | null;
  propertyType?: string | null;
  category?: string | null;
  locality?: string | null;
  city?: string | null;
  district?: string | null;
}): CrossModuleSuggestion[] {
  const location = compactLocation(input);
  const propertyText = `${input.title || ""} ${input.propertyType || ""} ${input.category || ""}`.toLowerCase();
  const isLand = propertyText.includes("land") || propertyText.includes("plot");
  const isHouse = propertyText.includes("house") || propertyText.includes("villa") || propertyText.includes("home");
  const isCommercial = propertyText.includes("commercial") || propertyText.includes("shop") || propertyText.includes("office");

  const q = encodeURIComponent(location);

  const base: CrossModuleSuggestion[] = [
    {
      title: "Find construction materials",
      subtitle: `Cement, TMT, bricks, sand and tiles near ${location}.`,
      href: `/materials?q=${q}`,
      icon: "🧱",
      badge: "Materials",
    },
    {
      title: "Find local contractors",
      subtitle: `Mason, architect, electrician, plumber and legal help near ${location}.`,
      href: `/services?q=${q}`,
      icon: "🛠️",
      badge: "Services",
    },
    {
      title: "Rent machinery nearby",
      subtitle: `JCB, mixer, scaffolding and construction equipment around ${location}.`,
      href: `/rentals?q=${q}`,
      icon: "🚜",
      badge: "Rentals",
    },
    {
      title: "Estimate construction cost",
      subtitle: "Calculate BOQ, budget, timeline and material requirement.",
      href: `/construction-cost?location=${q}`,
      icon: "🧮",
      badge: "AI Cost",
    },
  ];

  if (isLand) {
    return [
      {
        title: "Plan house construction",
        subtitle: `Turn this land into a budget, BOQ and contractor plan for ${location}.`,
        href: `/house-construction-cost?location=${q}`,
        icon: "🏗️",
        badge: "Next Step",
      },
      ...base,
    ];
  }

  if (isHouse) {
    return [
      {
        title: "Renovation & finishing services",
        subtitle: `Painting, tiles, false ceiling and interior work near ${location}.`,
        href: `/services?q=${encodeURIComponent(`renovation ${location}`)}`,
        icon: "🎨",
        badge: "Upgrade",
      },
      ...base,
    ];
  }

  if (isCommercial) {
    return [
      {
        title: "Commercial setup support",
        subtitle: `Electrical, glass, shutter, signage and interior vendors near ${location}.`,
        href: `/services?q=${encodeURIComponent(`commercial setup ${location}`)}`,
        icon: "🏪",
        badge: "Business",
      },
      ...base,
    ];
  }

  return base;
}