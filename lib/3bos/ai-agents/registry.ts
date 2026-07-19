import type {
  ThreeBOSAiAgentCapability,
  ThreeBOSAiAgentDefinition,
  ThreeBOSAiAgentDomain,
  ThreeBOSAiAgentId,
  ThreeBOSAiAgentRegistry,
} from "./types";

export const THREE_BOS_AI_AGENT_REGISTRY = {
  "procurement-assistant": {
    id: "procurement-assistant",
    title: "Procurement Assistant",
    description:
      "Default contextual assistant backed by the shared 3BOS AI workflow.",
    domain: "general",
    capabilities: [
      "conversation",
      "contextual-assistance",
      "procurement-guidance",
    ],
    transport: "http",
    endpoint: "/api/ai/procurement-assistant",
    method: "POST",
    risk: "advisory",
    availability: "default",
    acceptsFreeText: true,
    supportsFallback: true,
    requiresConfirmation: false,
    requestHints: [
      "message",
      "module",
      "category",
      "rfq",
      "priceData",
      "quote",
    ],
    responseHints: ["ok", "workflow", "assistant", "result", "error"],
    priority: 100,
    enabled: true,
  },

  "procurement-copilot": {
    id: "procurement-copilot",
    title: "Procurement Copilot",
    description:
      "Conversational procurement assistant with marketplace and location context.",
    domain: "procurement",
    capabilities: [
      "conversation",
      "contextual-assistance",
      "procurement-guidance",
    ],
    transport: "http",
    endpoint: "/api/ai/procurement-copilot",
    method: "POST",
    risk: "advisory",
    availability: "contextual",
    acceptsFreeText: true,
    supportsFallback: true,
    requiresConfirmation: false,
    requestHints: [
      "message",
      "text",
      "requirement",
      "module",
      "category",
      "city",
      "district",
      "locality",
      "rfq",
      "priceData",
      "quote",
    ],
    responseHints: ["ok", "copilot", "source", "context", "error"],
    priority: 90,
    enabled: true,
  },

  "procurement-command": {
    id: "procurement-command",
    title: "Procurement Command Interpreter",
    description:
      "Interprets a procurement question or operational command.",
    domain: "procurement",
    capabilities: [
      "command-interpretation",
      "procurement-guidance",
      "operational-intelligence",
    ],
    transport: "http",
    endpoint: "/api/ai/procurement-copilot-command",
    method: "POST",
    risk: "advisory",
    availability: "specialized",
    acceptsFreeText: true,
    supportsFallback: false,
    requiresConfirmation: false,
    requestHints: ["question"],
    responseHints: ["ok", "answer", "actions", "error"],
    priority: 70,
    enabled: true,
  },

  "marketplace-discovery": {
    id: "marketplace-discovery",
    title: "Marketplace Discovery",
    description:
      "Finds relevant marketplace opportunities using search and location context.",
    domain: "marketplace",
    capabilities: ["marketplace-search", "contextual-assistance"],
    transport: "http",
    endpoint: "/api/ai/marketplace-discovery",
    method: "POST",
    risk: "read-only",
    availability: "specialized",
    acceptsFreeText: true,
    supportsFallback: false,
    requiresConfirmation: false,
    requestHints: [
      "query",
      "searchIntent",
      "city",
      "district",
      "locality",
      "category",
    ],
    responseHints: ["ok", "results", "recommendations", "error"],
    priority: 80,
    enabled: true,
  },

  "marketplace-orchestrator": {
    id: "marketplace-orchestrator",
    title: "Marketplace Orchestrator",
    description:
      "Coordinates marketplace intelligence from a structured marketplace context.",
    domain: "marketplace",
    capabilities: [
      "marketplace-orchestration",
      "operational-intelligence",
    ],
    transport: "http",
    endpoint: "/api/ai/marketplace-orchestrator",
    method: "POST",
    risk: "advisory",
    availability: "specialized",
    acceptsFreeText: false,
    supportsFallback: false,
    requiresConfirmation: false,
    requestHints: ["context", "options"],
    responseHints: ["result", "recommendations", "actions", "error"],
    priority: 60,
    enabled: true,
  },

  "rfq-generator": {
    id: "rfq-generator",
    title: "RFQ Generator",
    description:
      "Converts a natural-language requirement into a structured RFQ draft.",
    domain: "rfq",
    capabilities: ["rfq-drafting", "contextual-assistance"],
    transport: "http",
    endpoint: "/api/ai/rfq-generator",
    method: "POST",
    risk: "advisory",
    availability: "specialized",
    acceptsFreeText: true,
    supportsFallback: true,
    requiresConfirmation: true,
    requestHints: ["text", "query", "requirement"],
    responseHints: ["ok", "rfq", "source", "error"],
    priority: 85,
    enabled: true,
  },

  "quote-risk-analysis": {
    id: "quote-risk-analysis",
    title: "Quote Risk Analysis",
    description:
      "Evaluates quote pricing, delivery, vendor risk, and commercial completeness.",
    domain: "quote",
    capabilities: ["quote-risk-analysis", "operational-intelligence"],
    transport: "http",
    endpoint: "/api/ai/quote-risk-analysis",
    method: "POST",
    risk: "read-only",
    availability: "specialized",
    acceptsFreeText: false,
    supportsFallback: true,
    requiresConfirmation: false,
    requestHints: [
      "quotePrice",
      "marketAverage",
      "trustScore",
      "aiScore",
      "vendorRisk",
      "deliveryDays",
      "validTill",
      "subtotal",
      "gstAmount",
      "vendorId",
      "quoteId",
    ],
    responseHints: [
      "risk",
      "riskScore",
      "recommendations",
      "source",
      "error",
    ],
    priority: 75,
    enabled: true,
  },

  "unified-cognition": {
    id: "unified-cognition",
    title: "Unified Procurement Cognition",
    description:
      "Produces higher-level operational intelligence from procurement context.",
    domain: "intelligence",
    capabilities: ["operational-intelligence", "procurement-guidance"],
    transport: "http",
    endpoint: "/api/ai/procurement-unified-cognition",
    method: "GET",
    risk: "read-only",
    availability: "contextual",
    acceptsFreeText: false,
    supportsFallback: false,
    requiresConfirmation: false,
    requestHints: ["query parameters", "procurement context"],
    responseHints: ["ok", "cognition", "recommendations", "error"],
    priority: 50,
    enabled: true,
  },
} as const satisfies ThreeBOSAiAgentRegistry;

export const THREE_BOS_AI_AGENTS = Object.freeze(
  Object.values(THREE_BOS_AI_AGENT_REGISTRY)
) as readonly ThreeBOSAiAgentDefinition[];

export function getThreeBOSAiAgent(
  id: ThreeBOSAiAgentId
): ThreeBOSAiAgentDefinition {
  return THREE_BOS_AI_AGENT_REGISTRY[id];
}

export function hasThreeBOSAiAgent(
  value: string
): value is ThreeBOSAiAgentId {
  return Object.prototype.hasOwnProperty.call(
    THREE_BOS_AI_AGENT_REGISTRY,
    value
  );
}

export function listThreeBOSAiAgents(options?: {
  enabledOnly?: boolean;
  domain?: ThreeBOSAiAgentDomain;
  capability?: ThreeBOSAiAgentCapability;
}): ThreeBOSAiAgentDefinition[] {
  const enabledOnly = options?.enabledOnly ?? true;

  return THREE_BOS_AI_AGENTS
    .filter((agent) => !enabledOnly || agent.enabled)
    .filter((agent) => !options?.domain || agent.domain === options.domain)
    .filter(
      (agent) =>
        !options?.capability ||
        agent.capabilities.includes(options.capability)
    )
    .sort((left, right) => right.priority - left.priority);
}

export function getDefaultThreeBOSAiAgent(): ThreeBOSAiAgentDefinition {
  const defaultAgent = listThreeBOSAiAgents().find(
    (agent) => agent.availability === "default"
  );

  if (!defaultAgent) {
    throw new Error("No default 3BOS AI agent is registered.");
  }

  return defaultAgent;
}
