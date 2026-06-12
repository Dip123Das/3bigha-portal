import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type VendorConversionEventType =
  | "opportunity_viewed"
  | "opportunity_clicked"
  | "registration_started"
  | "registration_completed"
  | "vendor_approved"
  | "first_listing_created";

export type VendorConversionPayload = {
  eventType: VendorConversionEventType;
  opportunityId?: string | null;
  module?: string | null;
  category?: string | null;
  userId?: string | null;
  businessProfileId?: string | null;
  listingId?: string | null;
  geoStateId?: string | null;
  geoDistrictId?: string | null;
  geoSubdivisionId?: string | null;
  geoBlockId?: string | null;
  geoPlaceId?: string | null;
  acquisitionSource?: string | null;
  acquisitionMedium?: string | null;
  acquisitionCampaign?: string | null;
  metadata?: Record<string, unknown>;
};

function clean(value?: string | null) {
  const text = String(value || "").trim();
  return text.length ? text : null;
}

export async function trackVendorConversionEvent(payload: VendorConversionPayload) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.from("vendor_conversion_events").insert({
      event_type: payload.eventType,
      opportunity_id: clean(payload.opportunityId),
      module: clean(payload.module),
      category: clean(payload.category),
      user_id: clean(payload.userId),
      business_profile_id: clean(payload.businessProfileId),
      listing_id: clean(payload.listingId),
      geo_state_id: clean(payload.geoStateId),
      geo_district_id: clean(payload.geoDistrictId),
      geo_subdivision_id: clean(payload.geoSubdivisionId),
      geo_block_id: clean(payload.geoBlockId),
      geo_place_id: clean(payload.geoPlaceId),
      acquisition_source: clean(payload.acquisitionSource),
      acquisition_medium: clean(payload.acquisitionMedium),
      acquisition_campaign: clean(payload.acquisitionCampaign),
      metadata: payload.metadata || {},
    });

    if (error) {
      console.error("vendor conversion analytics insert failed:", error);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (error: any) {
    console.error("vendor conversion analytics failed:", error);
    return { ok: false, error: error?.message || "Tracking failed" };
  }
}

export function trackVendorOpportunityView(payload: Omit<VendorConversionPayload, "eventType">) {
  return trackVendorConversionEvent({ ...payload, eventType: "opportunity_viewed" });
}

export function trackVendorOpportunityClick(payload: Omit<VendorConversionPayload, "eventType">) {
  return trackVendorConversionEvent({ ...payload, eventType: "opportunity_clicked" });
}

export function trackVendorRegistrationStarted(payload: Omit<VendorConversionPayload, "eventType">) {
  return trackVendorConversionEvent({ ...payload, eventType: "registration_started" });
}

export function trackVendorRegistrationCompleted(payload: Omit<VendorConversionPayload, "eventType">) {
  return trackVendorConversionEvent({ ...payload, eventType: "registration_completed" });
}

export function trackVendorApproved(payload: Omit<VendorConversionPayload, "eventType">) {
  return trackVendorConversionEvent({ ...payload, eventType: "vendor_approved" });
}

export function trackVendorFirstListing(payload: Omit<VendorConversionPayload, "eventType">) {
  return trackVendorConversionEvent({ ...payload, eventType: "first_listing_created" });
}
