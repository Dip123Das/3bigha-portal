import {
  createMarketplaceOpportunityEvent,
  getDemandAroundMe,
} from "@/lib/marketplace/mos";

export type MarketplaceEventType =
  | "rfq_created"
  | "rfq_updated"
  | "high_value_rfq"
  | "low_competition_market"
  | "vendor_rank_changed"
  | "subscription_changed"
  | "boost_expired";

export async function dispatchMarketplaceEvent(params: {
  supabase: any;
  userId: string;
  eventType: MarketplaceEventType;
  payload?: Record<string, any>;
}) {
  const demandAroundMe = await getDemandAroundMe({
    supabase: params.supabase,
    userId: params.userId,
  });

  const opportunity = await createMarketplaceOpportunityEvent({
    supabase: params.supabase,
    userId: params.userId,
    demandAroundMe,
  });

  return {
    ok: true,
    eventType: params.eventType,
    opportunity,
    payload: params.payload || {},
  };
}
