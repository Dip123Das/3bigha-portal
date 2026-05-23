"use client";

import Link from "next/link";
import {
  buildUnifiedSearchAutocomplete,
  type UnifiedSearchAutocompleteSuggestion,
} from "@/lib/search/unified-search-autocomplete";
import type { UnifiedMarketplaceModuleFilter } from "@/lib/search/unified-marketplace-brain";

export default function UnifiedSearchAutocomplete({
  query,
  module,
  recentLocations = [],
  onApply,
}: {
  query: string;
  module: UnifiedMarketplaceModuleFilter;
  recentLocations?: string[];
  onApply: (suggestion: UnifiedSearchAutocompleteSuggestion) => void;
}) {
  const suggestions = buildUnifiedSearchAutocomplete({
    query,
    module,
    recentLocations,
  });

  if (!suggestions.length) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: "calc(100% + 8px)",
        left: 0,
        right: 0,
        zIndex: 30,
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        boxShadow: "0 18px 40px rgba(15,23,42,0.14)",
        padding: 8,
        display: "grid",
        gap: 6,
      }}
    >
      {suggestions.map((item) => (
        <div
          key={item.href}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 8,
            alignItems: "center",
            borderRadius: 12,
            padding: 8,
            background: "#ffffff",
            border: "1px solid #eef2f7",
          }}
        >
          <button
            type="button"
            onClick={() => onApply(item)}
            style={{
              border: 0,
              background: "transparent",
              textAlign: "left",
              cursor: "pointer",
              display: "grid",
              gap: 3,
              padding: 0,
              color: "#0f172a",
            }}
          >
            <strong style={{ fontSize: 13, fontWeight: 950 }}>
              {item.icon} {item.label}
            </strong>
            <span style={{ fontSize: 12, color: "#64748b", fontWeight: 750 }}>
              {item.badge} suggestion
            </span>
          </button>

          <Link
            href={item.href}
            style={{
              textDecoration: "none",
              borderRadius: 12,
              padding: "7px 9px",
              background: "#ffffff",
              color: "#1d4ed8",
              fontSize: 12,
              fontWeight: 950,
              whiteSpace: "nowrap",
            }}
          >
            Open →
          </Link>
        </div>
      ))}
    </div>
  );
}