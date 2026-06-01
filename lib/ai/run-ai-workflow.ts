import {
  runMarketplaceAiOrchestrator,
  type MarketplaceAiContext,
  type MarketplaceAiResult,
} from "@/lib/ai/marketplace-orchestrator";

import { buildAiContext } from "@/lib/ai/build-ai-context";

export type AiWorkflowOptions = {
  smartDecision?: boolean;
  pricePrediction?: boolean;
  rfqIntelligence?: boolean;
  quoteRisk?: boolean;
  vendorDiscovery?: boolean;
  procurementGraph?: boolean;
};

export type AiWorkflowResult = {
  ok: boolean;
  context: MarketplaceAiContext;
  orchestrator: MarketplaceAiResult;
};

export async function runAiWorkflow(
  input: any,
  options?: AiWorkflowOptions
): Promise<AiWorkflowResult> {
  const context = buildAiContext(input);

  const orchestrator = await runMarketplaceAiOrchestrator(context, {
    smartDecision: options?.smartDecision ?? true,
    pricePrediction:
      options?.pricePrediction ??
      Boolean(context.priceData),

    rfqIntelligence:
      options?.rfqIntelligence ??
      Boolean(context.rfq || context.rfqId),

    quoteRisk:
      options?.quoteRisk ??
      Boolean(context.quote || context.quoteId),

    vendorDiscovery:
      options?.vendorDiscovery ?? true,

    procurementGraph:
      options?.procurementGraph ?? true,
  });

  return {
    ok: true,
    context,
    orchestrator,
  };
}
