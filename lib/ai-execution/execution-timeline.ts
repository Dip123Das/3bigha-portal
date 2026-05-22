export type AiTimelineStageStatus = "done" | "active" | "risk" | "pending";

export type AiTimelineStage = {
  id: string;
  label: string;
  detail: string;
  icon: string;
  status: AiTimelineStageStatus;
};

export function buildAiExecutionTimeline(input: {
  module?: string | null;
  stage?: string | null;
  workflowRisk?: "High" | "Medium" | "Low" | string | null;
  closurePrediction?: "High" | "Medium" | "Low" | string | null;
  vendorCount?: number | null;
  hasAcceptedQuote?: boolean;
  hasPriceSignal?: boolean;
  hasDeliverySignal?: boolean;
}) {
  const module = String(input.module || "").toLowerCase();
  const stage = String(input.stage || "").toLowerCase();
  const risk = String(input.workflowRisk || "Low");
  const closure = String(input.closurePrediction || "Low");
  const vendorCount = Number(input.vendorCount || 0);

  const hasAccepted = Boolean(input.hasAcceptedQuote);
  const hasVendors = vendorCount > 0;
  const hasNegotiation =
    stage.includes("negotiation") ||
    stage.includes("terms") ||
    stage.includes("closing") ||
    closure === "High";

  const hasCommercial =
    hasAccepted ||
    hasNegotiation ||
    Boolean(input.hasPriceSignal);

  const hasDelivery =
    hasAccepted ||
    Boolean(input.hasDeliverySignal) ||
    stage.includes("delivery");

  const isRisk = risk === "High";

  return [
    {
      id: "requirement",
      label: "Requirement",
      detail: module ? `${module} intent captured` : "Marketplace intent captured",
      icon: "📝",
      status: "done",
    },
    {
      id: "vendor-match",
      label: "Vendor Match",
      detail: hasVendors ? `${vendorCount} vendor signal(s)` : "Supplier response pending",
      icon: "🎯",
      status: hasVendors ? "done" : isRisk ? "risk" : "pending",
    },
    {
      id: "rfq",
      label: "RFQ",
      detail: "Structured procurement workflow",
      icon: "📦",
      status: hasVendors || module === "materials" ? "done" : "active",
    },
    {
      id: "negotiation",
      label: "Negotiation",
      detail: hasNegotiation ? "Terms are moving" : "Confirm price, GST, delivery and payment",
      icon: "🤝",
      status: hasNegotiation ? "active" : isRisk ? "risk" : "pending",
    },
    {
      id: "commercial",
      label: "Commercial",
      detail: hasCommercial ? "Commercial decision signal detected" : "Final quote/payment terms pending",
      icon: "💰",
      status: hasAccepted ? "done" : hasCommercial ? "active" : "pending",
    },
    {
      id: "delivery",
      label: "Delivery",
      detail: hasDelivery ? "Delivery/work timeline signal detected" : "Delivery execution pending",
      icon: "🚚",
      status: hasAccepted ? "active" : hasDelivery ? "active" : "pending",
    },
    {
      id: "closure",
      label: "Closure",
      detail: hasAccepted ? "Workflow closed" : closure === "High" ? "Ready for final confirmation" : "Deal not closed yet",
      icon: "✅",
      status: hasAccepted ? "done" : closure === "High" ? "active" : "pending",
    },
  ] satisfies AiTimelineStage[];
}