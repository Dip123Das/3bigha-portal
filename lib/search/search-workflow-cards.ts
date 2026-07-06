import {
  analyzeUnifiedMarketplaceIntent,
  type UnifiedMarketplaceModule,
  type UnifiedMarketplaceModuleFilter,
} from "@/lib/search/unified-marketplace-brain";

export type SearchWorkflowCard = {
  label: string;
  text: string;
  href: string;
  icon: string;
  tone: "blue" | "green" | "purple" | "amber" | "slate";
};

export function getSearchWorkflowCards(input: {
  query: string;
  module: UnifiedMarketplaceModule;
  title?: string | null;
  subtitle?: string | null;
  meta?: string | null;
  moduleFilter: UnifiedMarketplaceModuleFilter;
}): SearchWorkflowCard[] {
  const brain = analyzeUnifiedMarketplaceIntent(input.query);
  const clean = encodeURIComponent(input.query || input.title || "marketplace requirement");
  const cards: SearchWorkflowCard[] = [];

  if (input.module === "materials") {
    if (brain.isBulk || brain.wantsProcurement || brain.wantsRfq) {
      cards.push({
        label: "Bulk Procurement Ready",
        text: brain.quantityHint
          ? `Detected ${brain.quantityHint}. Send this to suppliers as an RFQ.`
          : "This material search is ready for supplier quotation.",
        href: `/rfq?query=${clean}`,
        icon: "🏗️",
        tone: "purple",
      });
    }

    cards.push({
      label: "Price Intelligence",
      text: "Check market rate before purchase or negotiation.",
      href: `/price-today?q=${clean}`,
      icon: "📊",
      tone: "blue",
    });

    cards.push({
      label: "Supplier Match",
      text: "Find nearby dealers, suppliers and vendors.",
      href: `/vendor/discovery?q=${clean}&module=materials`,
      icon: "🚚",
      tone: "green",
    });
  }

  if (input.module === "services") {
    cards.push({
      label: "Contractor Workflow Ready",
      text: "Compare service providers and move this into vendor discovery.",
      href: `/vendor/discovery?q=${clean}&module=services`,
      icon: "👷",
      tone: "green",
    });

    if (brain.isUrgent || brain.wantsRfq) {
      cards.push({
        label: "Quick Hiring Recommended",
        text: "Send your requirement to service providers for faster response.",
        href: `/rfq?query=${clean}`,
        icon: "⚡",
        tone: "amber",
      });
    }
  }

  if (input.module === "property") {
    cards.push({
      label: brain.wantsInvestment ? "Investment Opportunity" : "Property Discovery",
      text: brain.wantsInvestment
        ? "Review growth, resale and investment potential."
        : "Open this property and continue local discovery.",
      href: brain.wantsInvestment
        ? `/investment/opportunities?q=${clean}`
        : `/search?module=property&q=${clean}`,
      icon: brain.wantsInvestment ? "📈" : "🏘️",
      tone: brain.wantsInvestment ? "green" : "blue",
    });

    cards.push({
      label: "Build After Buying",
      text: "Estimate construction cost, materials and service needs.",
      href: `/house-construction-cost?location=${encodeURIComponent(brain.locationHint || "")}`,
      icon: "🏗️",
      tone: "purple",
    });
  }

  if (input.module === "rentals") {
    cards.push({
      label: "Equipment Rental Ready",
      text: "Check equipment availability and rental workflow.",
      href: `/rentals?search=${clean}`,
      icon: "🚜",
      tone: "amber",
    });

    if (brain.isUrgent) {
      cards.push({
        label: "Urgent Availability",
        text: "Use vendor discovery to find faster local rental response.",
        href: `/vendor/discovery?q=${clean}&module=rentals`,
        icon: "⏱️",
        tone: "green",
      });
    }
  }

  if (input.module === "blog") {
    cards.push({
      label: "Knowledge Result",
      text: "Use this result to understand market, price or process.",
      href: `/search?q=${clean}`,
      icon: "📰",
      tone: "slate",
    });
  }

  if (cards.length === 0) {
    cards.push({
      label: "Workflow Ready",
      text: "Continue through search, RFQ or vendor discovery.",
      href: `/search?q=${clean}`,
      icon: "⚡",
      tone: "blue",
    });
  }

  return cards.slice(0, 3);
}

export function workflowCardToneStyle(tone: SearchWorkflowCard["tone"]) {
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
      color: "#5b21b6",
    };
  }

  if (tone === "amber") {
    return {
      background: "#fffbeb",
      border: "1px solid #fde68a",
      color: "#92400e",
    };
  }

  if (tone === "slate") {
    return {
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      color: "#334155",
    };
  }

  return {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    color: "#1d4ed8",
  };
}