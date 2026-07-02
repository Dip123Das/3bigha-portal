import { prepareAmeAction } from "./action-engine";
import { makeAmeDecision } from "./decision-engine";
import { learnFromAmeDecision } from "./learning-engine";
import { rememberAmeDecision } from "./memory-engine";
import { estimateSignalValue } from "./prediction-engine";
import {
  collectMarketplaceSignals,
  getRegisteredSignalProviders,
  registerSignalProvider,
} from "./signal-aggregator";
import type { AmeDecision, AmeSignal } from "./types";

export async function runMarketplaceExecutive(
  externalSignals: AmeSignal[] = [],
): Promise<AmeDecision> {
  const collectedSignals = await collectMarketplaceSignals();

  const signals = [
    ...collectedSignals,
    ...externalSignals,
  ];

  const decision = makeAmeDecision(signals);

  const estimatedValue = estimateSignalValue(signals);

  const enrichedDecision: AmeDecision = {
    ...decision,
    estimated_value: estimatedValue,
  };

  const preparedDecision = prepareAmeAction(enrichedDecision);
  const learnedDecision = learnFromAmeDecision(preparedDecision);

  return rememberAmeDecision(learnedDecision);
}

export * from "./types";

export {
  registerSignalProvider,
  getRegisteredSignalProviders,
};

export { getRecentAmeDecisions } from "./memory-engine";