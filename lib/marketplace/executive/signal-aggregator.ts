import type { ExecutiveSignalAdapter } from "./adapters/base";
import { createExecutiveContext, type ExecutiveContext } from "./context";
import type { AmeSignal } from "./types";

const adapters = new Map<string, ExecutiveSignalAdapter>();

export function registerSignalProvider(adapter: ExecutiveSignalAdapter) {
  adapters.set(adapter.name, adapter);
}

export async function collectMarketplaceSignals(
  context: ExecutiveContext = createExecutiveContext(),
): Promise<AmeSignal[]> {
  const allSignals: AmeSignal[] = [];

  const sortedAdapters = [...adapters.values()]
    .filter((adapter) => adapter.enabled)
    .sort((a, b) => b.priority - a.priority);

  for (const adapter of sortedAdapters) {
    try {
      const signals = await adapter.collect(context);

      if (Array.isArray(signals)) {
        allSignals.push(...signals);
      }
    } catch (error) {
      context.logger.error(`[AME] Adapter '${adapter.name}' failed:`, error);
    }
  }

  return allSignals;
}

export function getRegisteredSignalProviders(): string[] {
  return [...adapters.keys()];
}

export async function getSignalProviderHealth() {
  const healthChecks = await Promise.all(
    [...adapters.values()].map((adapter) => adapter.health()),
  );

  return healthChecks.sort((a, b) => a.name.localeCompare(b.name));
}
