"use client";

import Link from "next/link";
import {
  buildProcurementRecommendations,
  procurementRecommendationTone,
} from "@/lib/search/procurement-recommendation-engine";
import type { UnifiedMarketplaceModuleFilter } from "@/lib/search/unified-marketplace-brain";

export default function ProcurementRecommendationSidebar({
  query,
  module,
}: {
  query: string;
  module: UnifiedMarketplaceModuleFilter;
}) {
  const items = buildProcurementRecommendations({
    query,
    module,
  });

  if (!items.length) return null;

  return (
    <div
      style={{
        display: "grid",
        gap: 12,
      }}
    >
      <div
        style={{
          borderRadius: 20,
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          padding: 14,
          boxShadow: "0 10px 28px rgba(15,23,42,0.06)",
          display: "grid",
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 950,
              color: "#475569",
            }}
          >
            Procurement Recommendation Engine
          </div>

          <div
            style={{
              marginTop: 4,
              fontSize: 18,
              fontWeight: 800,
              color: "#0f172a",
            }}
          >
            🔄 Continue Your Workflow
          </div>

          <div
            style={{
              marginTop: 4,
              fontSize: 12,
              lineHeight: 1.5,
              color: "#64748b",
              fontWeight: 700,
            }}
          >
            3Bigha detected related procurement, construction and vendor workflows for this search.
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: 10,
          }}
        >
          {items.map((item) => {
            const tone = procurementRecommendationTone(item.tone);

            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  ...tone,
                  borderRadius: 12,
                  padding: 10,
                  textDecoration: "none",
                  display: "grid",
                  gap: 4,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 950,
                  }}
                >
                  {item.icon} {item.title}
                </div>

                <div
                  style={{
                    fontSize: 12,
                    lineHeight: 1.5,
                    fontWeight: 700,
                    opacity: 0.92,
                  }}
                >
                  {item.description}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}