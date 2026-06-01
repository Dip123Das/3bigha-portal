import type { MarketplaceAiContext } from "@/lib/ai/marketplace-orchestrator";

export function buildAiContext(input: any): MarketplaceAiContext {
  return {
    module: input?.module || "marketplace",
    category: input?.category || null,

    buyerIntent:
      input?.buyerIntent ||
      input?.query ||
      input?.message ||
      input?.text ||
      input?.requirement ||
      input?.rfq?.description ||
      input?.rfq?.title ||
      null,

    city: input?.city || null,
    district: input?.district || null,
    locality: input?.locality || null,
    pincode: input?.pincode || null,

    urgency:
      input?.urgency ||
      input?.meta?.urgency ||
      null,

    budget:
      input?.budget ||
      input?.meta?.budget ||
      null,

    rfqId:
      input?.rfqId ||
      input?.rfq?.id ||
      null,

    quoteId:
      input?.quoteId ||
      input?.quote?.id ||
      null,

    vendorId:
      input?.vendorId ||
      input?.quote?.vendor_id ||
      null,

    rfq: input?.rfq || null,
    quote: input?.quote || null,

    items:
      input?.items ||
      input?.rfq?.items ||
      [],

    vendors:
      input?.vendors ||
      [],

    priceData:
      input?.priceData ||
      null,

    messages:
      input?.messages ||
      [],

    meta:
      input?.meta ||
      {},
  };
}
