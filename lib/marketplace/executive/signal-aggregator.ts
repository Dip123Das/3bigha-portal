import type { AmeSignal } from "./types";

export interface SignalProvider {
  name: string;
  collect(): Promise<AmeSignal[]>;
}

const providers: SignalProvider[] = [];

/**
 * Registers a marketplace intelligence provider.
 * G16.2 keeps registration in-memory only.
 */
export function registerSignalProvider(provider: SignalProvider) {
  providers.push(provider);
}

/**
 * Collects normalized signals from all registered providers.
 * This function is completely read-only.
 */
export async function collectMarketplaceSignals(): Promise<AmeSignal[]> {
  const allSignals: AmeSignal[] = [];

  for (const provider of providers) {
    try {
      const signals = await provider.collect();

      if (Array.isArray(signals)) {
        allSignals.push(...signals);
      }
    } catch (error) {
      console.error(
        `[AME] Signal provider '${provider.name}' failed:`,
        error,
      );
    }
  }

  return allSignals;
}

/**
 * Returns currently registered providers.
 * Useful for diagnostics.
 */
export function getRegisteredSignalProviders(): string[] {
  return providers.map((provider) => provider.name);
}
