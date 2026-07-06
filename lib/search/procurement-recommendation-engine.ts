import {
  analyzeUnifiedMarketplaceIntent,
  type UnifiedMarketplaceModuleFilter,
} from "@/lib/search/unified-marketplace-brain";

export type ProcurementRecommendationItem = {
  title: string;
  description: string;
  href: string;
  icon: string;
  module: UnifiedMarketplaceModuleFilter;
  tone: "blue" | "green" | "purple" | "amber";
};

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function uniqueItems(items: ProcurementRecommendationItem[]) {
  return items
    .filter(
      (item, index, arr) =>
        arr.findIndex((x) => x.href === item.href || x.title === item.title) === index
    )
    .slice(0, 8);
}

export function buildProcurementRecommendations(input: {
  query: string;
  module: UnifiedMarketplaceModuleFilter;
}) {
  const query = cleanText(input.query);
  const brain = analyzeUnifiedMarketplaceIntent(query);
  const clean = encodeURIComponent(query || "marketplace workflow");

  const module =
    input.module !== "all"
      ? input.module
      : brain.primaryModule !== "all"
        ? brain.primaryModule
        : "all";

  const items: ProcurementRecommendationItem[] = [];

  if (module === "materials") {
    items.push(
      {
        title: "Compare TMT rod suppliers",
        description: "Continue construction procurement with steel and reinforcement materials.",
        href: "/search?q=TMT%20rod&module=materials",
        icon: "🧱",
        module: "materials",
        tone: "blue",
      },
      {
        title: "Sand and aggregate sourcing",
        description: "Find nearby sand, stone chips and aggregate suppliers.",
        href: "/search?q=sand%20aggregate&module=materials",
        icon: "🏗️",
        module: "materials",
        tone: "purple",
      },
      {
        title: "Construction labour workflow",
        description: "Hire masons, contractors and labour for site execution.",
        href: "/search?q=rajmistri&module=services",
        icon: "👷",
        module: "services",
        tone: "green",
      },
      {
        title: "Send bulk RFQ",
        description: "Create a structured RFQ for multiple suppliers.",
        href: `/rfq?query=${clean}`,
        icon: "⚡",
        module: "materials",
        tone: "amber",
      }
    );
  }

  if (module === "services") {
    items.push(
      {
        title: "Material procurement workflow",
        description: "Continue procurement with cement, TMT and building materials.",
        href: "/search?q=cement&module=materials",
        icon: "🏗️",
        module: "materials",
        tone: "purple",
      },
      {
        title: "Equipment rental workflow",
        description: "Find mixer machines, scaffolding and construction rentals.",
        href: "/search?q=construction%20rental&module=rentals",
        icon: "🚜",
        module: "rentals",
        tone: "amber",
      },
      {
        title: "Turnkey construction packages",
        description: "Explore turnkey and complete construction workflows.",
        href: "/services/turnkey",
        icon: "🏠",
        module: "services",
        tone: "blue",
      }
    );
  }

  if (module === "property") {
    items.push(
      {
        title: "Estimate construction cost",
        description: "Calculate estimated house construction cost after land purchase.",
        href: "/house-construction-cost",
        icon: "📊",
        module: "services",
        tone: "green",
      },
      {
        title: "Find architect and contractor",
        description: "Continue into design and construction execution workflows.",
        href: "/search?q=architect%20contractor&module=services",
        icon: "👷",
        module: "services",
        tone: "purple",
      },
      {
        title: "Material procurement planning",
        description: "Plan future construction material sourcing.",
        href: "/search?q=building%20materials&module=materials",
        icon: "🧱",
        module: "materials",
        tone: "blue",
      }
    );
  }

  if (module === "rentals") {
    items.push(
      {
        title: "Construction contractor workflow",
        description: "Find contractors and labour along with equipment rental.",
        href: "/search?q=contractor&module=services",
        icon: "👷",
        module: "services",
        tone: "green",
      },
      {
        title: "Bulk procurement workflow",
        description: "Continue toward materials and procurement sourcing.",
        href: "/search?q=cement&module=materials",
        icon: "🏗️",
        module: "materials",
        tone: "purple",
      }
    );
  }

  if (brain.wantsInvestment || module === "property") {
    items.push({
      title: "Investment opportunity workflow",
      description: "Review investment and future growth opportunities.",
      href: `/investment/opportunities?q=${clean}`,
      icon: "📈",
      module: "property",
      tone: "green",
    });
  }

  items.push({
    title: "Discover nearby vendors",
    description: "Continue through vendor discovery and procurement workflows.",
    href: `/vendor/discovery?q=${clean}`,
    icon: "🎯",
    module,
    tone: "blue",
  });

  return uniqueItems(items);
}

export function procurementRecommendationTone(
  tone: ProcurementRecommendationItem["tone"]
) {
  if (tone === "green") {
    return {
      background: "#ecfdf5",
      border: "1px solid #bbf7d0",
      color: "#047857",
    };
  }

  if (tone === "purple") {
    return {
      background: "#f5f3ff",
      border: "1px solid #ddd6fe",
      color: "#6d28d9",
    };
  }

  if (tone === "amber") {
    return {
      background: "#fffbeb",
      border: "1px solid #fde68a",
      color: "#b45309",
    };
  }

  return {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    color: "#1d4ed8",
  };
}