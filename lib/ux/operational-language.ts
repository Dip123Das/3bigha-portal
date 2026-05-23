export type OperationalTermKey =
  | "aiProcurementSummary"
  | "aiAutoAction"
  | "aiDealRecoveryQueue"
  | "aiAutomationQueue"
  | "aiProcurementReadinessEngine"
  | "aiProcurementAssistant"
  | "aiProcurementCopilot"
  | "aiProgressiveRfqBuilder"
  | "aiConstructionBudgetPrediction"
  | "aiResumeIntelligence"
  | "aiCopilot"
  | "aiActions"
  | "aiNegotiation"
  | "aiSupplier"
  | "aiFollowUp"
  | "aiClosure";

const operationalTerms: Record<
  OperationalTermKey,
  {
    label: string;
    helper: string;
    subtleAiLabel: string;
  }
> = {
  aiProcurementSummary: {
    label: "Conversation Summary",
    helper: "Understand what is happening and what action is needed.",
    subtleAiLabel: "AI-powered",
  },
  aiAutoAction: {
    label: "Suggested Next Step",
    helper: "Recommended action based on the current workflow.",
    subtleAiLabel: "AI-assisted",
  },
  aiDealRecoveryQueue: {
    label: "Deals Needing Follow-up",
    helper: "Conversations that may lose momentum without action.",
    subtleAiLabel: "AI-prioritized",
  },
  aiAutomationQueue: {
    label: "Tasks Needing Action",
    helper: "Important follow-ups, replies, and reviews for today.",
    subtleAiLabel: "AI-prioritized",
  },
  aiProcurementReadinessEngine: {
    label: "Requirement Progress",
    helper: "See what is complete and what details are still missing.",
    subtleAiLabel: "AI-assisted",
  },
  aiProcurementAssistant: {
    label: "Need Help Writing?",
    helper: "Describe your requirement naturally and get a clear draft.",
    subtleAiLabel: "AI-assisted",
  },
  aiProcurementCopilot: {
    label: "Requirement Guidance",
    helper: "Get help understanding, improving, and completing the requirement.",
    subtleAiLabel: "AI-powered",
  },
  aiProgressiveRfqBuilder: {
    label: "Step-by-Step RFQ Builder",
    helper: "Complete your requirement gradually with helpful suggestions.",
    subtleAiLabel: "AI-guided",
  },
  aiConstructionBudgetPrediction: {
    label: "Budget Estimate",
    helper: "Estimate possible construction cost before submitting.",
    subtleAiLabel: "AI-estimated",
  },
  aiResumeIntelligence: {
    label: "Continue Your Work",
    helper: "Resume the last useful search, RFQ, comparison, or workflow.",
    subtleAiLabel: "AI-assisted",
  },
  aiCopilot: {
    label: "Need Help?",
    helper: "Ask for help only when you need support with this work.",
    subtleAiLabel: "AI-powered",
  },
  aiActions: {
    label: "Recommended Actions",
    helper: "Suggested actions for the current workflow.",
    subtleAiLabel: "AI-assisted",
  },
  aiNegotiation: {
    label: "Negotiation Guidance",
    helper: "Understand what to ask, confirm, or negotiate next.",
    subtleAiLabel: "AI-assisted",
  },
  aiSupplier: {
    label: "Supplier Reliability",
    helper: "Understand supplier strength, response quality, and risk.",
    subtleAiLabel: "AI-assisted",
  },
  aiFollowUp: {
    label: "Follow-up Guidance",
    helper: "Know when and how to follow up.",
    subtleAiLabel: "AI-assisted",
  },
  aiClosure: {
    label: "Closure Readiness",
    helper: "Check whether the deal is ready to finalize.",
    subtleAiLabel: "AI-assisted",
  },
};

export function operationalTerm(key: OperationalTermKey) {
  return operationalTerms[key];
}

export function simplifyAiLabel(label: string) {
  return label
    .replace(/^AI\s+/i, "")
    .replace(/\bAI\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function scoreToHumanMeaning(score?: number | null) {
  const n = Number(score || 0);

  if (n >= 80) return "Strong chance of success";
  if (n >= 60) return "Good progress";
  if (n >= 40) return "Needs follow-up";
  if (n > 0) return "Needs more details";

  return "Not enough information yet";
}

export function riskToHumanMeaning(risk?: string | null) {
  const value = String(risk || "").toLowerCase();

  if (value.includes("critical") || value.includes("high")) {
    return "Needs attention now";
  }

  if (value.includes("medium") || value.includes("watch")) {
    return "Keep watch";
  }

  if (value.includes("low") || value.includes("healthy")) {
    return "Looks stable";
  }

  return "Status unclear";
}
