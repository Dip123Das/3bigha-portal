"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  opportunityIcon,
  opportunityLevel,
  type PublicOpportunityModule,
  vendorTypeText,
} from "./public-vendor-opportunity-utils";
import { trackVendorConversionClient } from "./vendor-conversion-client";

type Props = {
  id?: string | null;
  opportunityId?: string | null;
  module: PublicOpportunityModule;
  category?: string | null;
  location: string;
  district?: string;
  state?: string;
  vendorsNeeded: number;
  priority?: string | null;
  promotionType?: string | null;
  promotionScore?: number | null;
};

export default function PublicVendorOpportunityCard({
  id,
  opportunityId,
  module,
  category,
  location,
  district,
  state,
  vendorsNeeded,
  priority,
  promotionType,
  promotionScore,
}: Props) {
  const typeText = vendorTypeText(module, category);
  const level = opportunityLevel(priority);
  const icon = opportunityIcon(module, category);
  const finalOpportunityId = opportunityId || id || null;
  const promotionLabel =
    promotionType === "featured"
      ? "🔥 Featured"
      : promotionType === "promoted"
      ? "🚀 Promoted"
      : promotionType === "recommended"
      ? "⭐ Recommended"
      : null;

  useEffect(() => {
    trackVendorConversionClient({
      eventType: "opportunity_viewed",
      opportunityId: finalOpportunityId,
      module,
      category,
      source: "public_vendor_opportunity_card",
      acquisitionSource: "vendor_opportunities",
      acquisitionMedium: "opportunity_card",
      acquisitionCampaign: "vendor_opportunity_marketplace",
      label: `Need ${typeText}${location ? ` in ${location}` : ""}`,
      metadata: {
        location,
        district,
        state,
        vendorsNeeded,
        priority,
      },
    });
  }, [finalOpportunityId, module, category, typeText, location, district, state, vendorsNeeded, priority]);

  return (
    <article
      style={{
        border: "1px solid #dbeafe",
        borderRadius: 22,
        background: "#ffffff",
        padding: 16,
        boxShadow: "0 14px 35px rgba(15,23,42,0.06)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div style={{ fontSize: 28 }}>{icon}</div>
        {promotionLabel ? (
          <div
            style={{
              border: "1px solid #bbf7d0",
              borderRadius: 999,
              background: "#ecfdf5",
              color: "#047857",
              padding: "5px 9px",
              fontSize: 11,
              fontWeight: 950,
            }}
          >
            {promotionLabel}
            {promotionScore ? ` · ${Math.round(Number(promotionScore))}` : ""}
          </div>
        ) : null}
      </div>

      <h3
        style={{
          marginTop: 8,
          fontSize: 18,
          lineHeight: 1.25,
          fontWeight: 950,
          color: "#0f172a",
        }}
      >
        Need {typeText}
        {location ? ` in ${location}` : ""}
      </h3>

      <div
        style={{
          marginTop: 12,
          display: "grid",
          gap: 8,
          fontSize: 13,
          color: "#334155",
          fontWeight: 750,
        }}
      >
        <div>
          <strong style={{ color: "#0f172a" }}>Location:</strong>{" "}
          {[location, district, state].filter(Boolean).join(", ") || "Active demand area"}
        </div>

        <div>
          <strong style={{ color: "#0f172a" }}>Vendor Type:</strong> {typeText}
        </div>

        <div>
          <strong style={{ color: "#0f172a" }}>Opportunity Level:</strong> {level}
        </div>

        <div>
          <strong style={{ color: "#0f172a" }}>Vendors Needed:</strong> {vendorsNeeded}
        </div>
      </div>

      <Link
        href="/onboarding/business"
        onClick={() =>
          trackVendorConversionClient({
            eventType: "opportunity_clicked",
            opportunityId: finalOpportunityId,
            module,
            category,
            source: "public_vendor_opportunity_card",
            acquisitionSource: "vendor_opportunities",
            acquisitionMedium: "opportunity_card_cta",
            acquisitionCampaign: "vendor_opportunity_marketplace",
            label: "Become a Vendor",
            metadata: {
              location,
              district,
              state,
              vendorsNeeded,
              priority,
            },
          })
        }
        style={{
          marginTop: 14,
          display: "inline-flex",
          borderRadius: 999,
          background: "#059669",
          color: "#ffffff",
          padding: "10px 14px",
          fontSize: 13,
          fontWeight: 900,
          textDecoration: "none",
        }}
      >
        Become a Vendor →
      </Link>
    </article>
  );
}
