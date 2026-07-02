import type { ExecutiveSignalAdapter } from "./base";
import { createHealthyAdapterStatus } from "./base";
import { getMosOpportunitySignals } from "@/lib/marketplace/services/mos";

export const mosAdapter: ExecutiveSignalAdapter = {
  name: "mos",

  enabled: true,

  priority: 100,

  async collect() {
    // G16.5 keeps this adapter read-only.
    // A Supabase client will be injected in the next milestone.
    return [];
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
