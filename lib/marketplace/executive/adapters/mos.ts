import type { ExecutiveContext } from "../context";
import type { ExecutiveSignalAdapter } from "./base";
import { createHealthyAdapterStatus } from "./base";
import { getMosOpportunitySignals } from "@/lib/marketplace/services/mos";

export const mosAdapter: ExecutiveSignalAdapter = {
  name: "mos",

  enabled: true,

  priority: 100,

  async collect(context: ExecutiveContext) {
    if (!context.supabase) return [];

    return getMosOpportunitySignals({
      supabase: context.supabase,
      limit: context.config.signalLimit,
    });
  },

  async health() {
    return createHealthyAdapterStatus(this);
  },
};

export async function collectMosSignals(params: {
  supabase: any;
  limit?: number;
}) {
  return getMosOpportunitySignals(params);
}
