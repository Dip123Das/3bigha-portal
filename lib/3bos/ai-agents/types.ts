export type ThreeBOSAiAgentId =
  | "procurement-assistant"
  | "procurement-copilot"
  | "procurement-command"
  | "marketplace-discovery"
  | "marketplace-orchestrator"
  | "rfq-generator"
  | "quote-risk-analysis"
  | "unified-cognition";

export type ThreeBOSAiAgentDomain =
  | "general"
  | "procurement"
  | "marketplace"
  | "rfq"
  | "quote"
  | "intelligence";

export type ThreeBOSAiAgentCapability =
  | "conversation"
  | "contextual-assistance"
  | "procurement-guidance"
  | "command-interpretation"
  | "marketplace-search"
  | "marketplace-orchestration"
  | "rfq-drafting"
  | "quote-risk-analysis"
  | "operational-intelligence";

export type ThreeBOSAiAgentTransport = "http";

export type ThreeBOSAiAgentMethod = "GET" | "POST";

export type ThreeBOSAiAgentRisk =
  | "read-only"
  | "advisory"
  | "action-capable";

export type ThreeBOSAiAgentAvailability =
  | "default"
  | "specialized"
  | "contextual";

export type ThreeBOSAiAgentDefinition = {
  id: ThreeBOSAiAgentId;
  title: string;
  description: string;
  domain: ThreeBOSAiAgentDomain;
  capabilities: ThreeBOSAiAgentCapability[];

  transport: ThreeBOSAiAgentTransport;
  endpoint: string;
  method: ThreeBOSAiAgentMethod;

  risk: ThreeBOSAiAgentRisk;
  availability: ThreeBOSAiAgentAvailability;

  acceptsFreeText: boolean;
  supportsFallback: boolean;
  requiresConfirmation: boolean;

  requestHints: string[];
  responseHints: string[];

  priority: number;
  enabled: boolean;
};

export type ThreeBOSAiAgentRegistry = Readonly<
  Record<ThreeBOSAiAgentId, ThreeBOSAiAgentDefinition>
>;
