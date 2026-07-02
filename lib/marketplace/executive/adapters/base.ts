import type { ExecutiveContext } from "../context";
import type { AmeSignal } from "../types";

export type ExecutiveAdapterHealth = {
  name: string;
  enabled: boolean;
  healthy: boolean;
  message?: string;
};

export interface ExecutiveSignalAdapter {
  name: string;
  enabled: boolean;
  priority: number;
  collect(context: ExecutiveContext): Promise<AmeSignal[]>;
  health(): Promise<ExecutiveAdapterHealth>;
}

export function createHealthyAdapterStatus(
  adapter: ExecutiveSignalAdapter,
): ExecutiveAdapterHealth {
  return {
    name: adapter.name,
    enabled: adapter.enabled,
    healthy: true,
    message: "Adapter is available.",
  };
}

export function createDisabledAdapterStatus(
  adapter: ExecutiveSignalAdapter,
): ExecutiveAdapterHealth {
  return {
    name: adapter.name,
    enabled: adapter.enabled,
    healthy: false,
    message: "Adapter is disabled.",
  };
}
