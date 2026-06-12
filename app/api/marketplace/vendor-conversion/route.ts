import { NextResponse } from "next/server";
import {
  trackVendorConversionEvent,
  type VendorConversionEventType,
} from "@/lib/marketplace/vendor-conversion-analytics";

const ALLOWED_EVENTS = new Set<VendorConversionEventType>([
  "opportunity_viewed",
  "opportunity_clicked",
  "registration_started",
  "registration_completed",
  "vendor_approved",
  "first_listing_created",
]);

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const eventType = String(body?.eventType || body?.event_type || "").trim() as VendorConversionEventType;

    if (!ALLOWED_EVENTS.has(eventType)) {
      return NextResponse.json(
        { ok: false, error: "Invalid vendor conversion event type." },
        { status: 400 }
      );
    }

    const result = await trackVendorConversionEvent({
      eventType,
      opportunityId: body?.opportunityId || body?.opportunity_id || null,
      module: body?.module || null,
      category: body?.category || null,
      userId: body?.userId || body?.user_id || null,
      businessProfileId: body?.businessProfileId || body?.business_profile_id || null,
      listingId: body?.listingId || body?.listing_id || null,
      geoStateId: body?.geoStateId || body?.geo_state_id || null,
      geoDistrictId: body?.geoDistrictId || body?.geo_district_id || null,
      geoSubdivisionId: body?.geoSubdivisionId || body?.geo_subdivision_id || null,
      geoBlockId: body?.geoBlockId || body?.geo_block_id || null,
      geoPlaceId: body?.geoPlaceId || body?.geo_place_id || null,
      acquisitionSource: body?.acquisitionSource || body?.acquisition_source || null,
      acquisitionMedium: body?.acquisitionMedium || body?.acquisition_medium || null,
      acquisitionCampaign: body?.acquisitionCampaign || body?.acquisition_campaign || null,
      metadata: {
        source: body?.source || "vendor_conversion_api",
        href: body?.href || null,
        label: body?.label || null,
        ...((body?.metadata && typeof body.metadata === "object") ? body.metadata : {}),
      },
    });

    return NextResponse.json({ ok: result.ok });
  } catch (error: any) {
    console.error("vendor conversion route error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Vendor conversion tracking failed." },
      { status: 500 }
    );
  }
}
