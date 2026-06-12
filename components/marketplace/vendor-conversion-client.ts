export type VendorConversionClientPayload = {
  eventType:
    | "opportunity_viewed"
    | "opportunity_clicked"
    | "registration_started"
    | "registration_completed"
    | "vendor_approved"
    | "first_listing_created";
  opportunityId?: string | null;
  module?: string | null;
  category?: string | null;
  listingId?: string | null;
  geoStateId?: string | null;
  geoDistrictId?: string | null;
  geoSubdivisionId?: string | null;
  geoBlockId?: string | null;
  geoPlaceId?: string | null;
  source?: string | null;
  acquisitionSource?: string | null;
  acquisitionMedium?: string | null;
  acquisitionCampaign?: string | null;
  label?: string | null;
  href?: string | null;
  metadata?: Record<string, unknown>;
};

export function trackVendorConversionClient(payload: VendorConversionClientPayload) {
  try {
    const body = JSON.stringify({
      ...payload,
      href: payload.href || (typeof window !== "undefined" ? window.location.href : null),
    });

    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/marketplace/vendor-conversion", blob);
      return;
    }

    fetch("/api/marketplace/vendor-conversion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Silent analytics failure.
  }
}
