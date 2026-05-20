import {
  analyzeUnifiedMarketplaceIntent,
  type UnifiedMarketplaceModuleFilter,
} from "@/lib/search/unified-marketplace-brain";

export type ProcurementActionCopilotItem = {
  title: string;
  description: string;
  href: string;
  icon: string;
  priority: "High" | "Medium" | "Normal";
};

export type ProcurementActionCopilotInsight = {
  show: boolean;
  title: string;
  subtitle: string;
  actions: ProcurementActionCopilotItem[];
};

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

export function buildProcurementActionCopilot(input: {
  query: string;
  module: UnifiedMarketplaceModuleFilter;
  readinessScore?: number;
  negotiationScore?: number;
}) {
  const query = cleanText(input.query);
  const brain = analyzeUnifiedMarketplaceIntent(query);
  const clean = encodeURIComponent(query || "marketplace requirement");

  const module =
    input.module !== "all"
      ? input.module
      : brain.primaryModule !== "all"
        ? brain.primaryModule
        : "all";

  const actions: ProcurementActionCopilotItem[] = [];

  if (brain.wantsProcurement || brain.isBulk || module === "materials") {
    actions.push({
      title: "Strengthen this RFQ",
      description: brain.quantityHint
        ? `Quantity is detected as ${brain.quantityHint}. Add brand, delivery location and payment terms.`
        : "Add quantity, preferred brand, delivery location and expected timeline before sending RFQ.",
      href: `/rfq/general/new?query=${clean}${module !== "all" ? `&module=${encodeURIComponent(module)}` : ""}`,
      icon: "⚡",
      priority: "High",
    });

    actions.push({
      title: "Check price before negotiation",
      description: "Use Price Today to avoid overpaying and improve negotiation confidence.",
      href: `/price-today?q=${clean}`,
      icon: "📊",
      priority: "High",
    });
  }

  if (brain.wantsVendor || brain.wantsProcurement || module === "services" || module === "rentals") {
    actions.push({
      title: "Shortlist vendors first",
      description: "Compare local vendors before committing to RFQ or negotiation.",
      href: `/vendor/discovery?q=${clean}${module !== "all" ? `&module=${encodeURIComponent(module)}` : ""}`,
      icon: "🎯",
      priority: input.negotiationScore && input.negotiationScore >= 68 ? "High" : "Medium",
    });
  }

  if (brain.isUrgent) {
    actions.push({
      title: "Mark timeline clearly",
      description: "This looks urgent. Mention delivery or service deadline in the RFQ to get faster replies.",
      href: `/rfq/general/new?query=${clean}%20urgent`,
      icon: "⏱️",
      priority: "High",
    });
  }

  if (module === "property" || brain.wantsInvestment) {
    actions.push({
      title: "Plan after-purchase workflow",
      description: "Estimate construction cost, contractor needs and material procurement before decision.",
      href: "/house-construction-cost",
      icon: "🏗️",
      priority: "Medium",
    });
  }

  if (module === "services") {
    actions.push({
      title: "Add project size",
      description: "Mention square feet, work type and timeline so contractors can quote accurately.",
      href: `/rfq/general/new?query=${clean}`,
      icon: "👷",
      priority: "Medium",
    });
  }

  if (module === "rentals") {
    actions.push({
      title: "Confirm availability window",
      description: "Add rental duration, location and machine type to improve vendor response.",
      href: `/rentals?search=${clean}`,
      icon: "🚜",
      priority: "Medium",
    });
  }

  actions.push({
    title: "Continue marketplace discovery",
    description: "Explore related materials, services, rentals and procurement workflows.",
    href: `/search?q=${clean}${module !== "all" ? `&module=${encodeURIComponent(module)}` : ""}`,
    icon: "🔎",
    priority: "Normal",
  });

  const unique = actions
    .filter((item, index, arr) => arr.findIndex((x) => x.href === item.href && x.title === item.title) === index)
    .slice(0, 5);

  return {
    show: Boolean(query),
    title:
      input.readinessScore && input.readinessScore >= 75
        ? "Copilot recommends immediate procurement action"
        : "Copilot found ways to improve this workflow",
    subtitle:
      "3Bigha is converting search intelligence into practical procurement steps, RFQ improvements and vendor actions.",
    actions: unique,
  } satisfies ProcurementActionCopilotInsight;
}