"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  moduleCta,
  moduleLabel,
  opportunityLevel,
  type PublicOpportunityModule,
  vendorTypeText,
} from "./public-vendor-opportunity-utils";

type Row = {
  id: string;
  module: PublicOpportunityModule;
  category?: string | null;
  vendorsNeeded: number;
  priority?: string | null;
  location: string;
  district?: string;
  state?: string;
};

export default function PublicVendorOpportunityBanner({
  module,
}: {
  module: PublicOpportunityModule;
}) {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    let live = true;

    fetch(`/api/public/vendor-opportunities?module=${module}`, {
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((json) => {
        if (live) setRows(Array.isArray(json?.rows) ? json.rows : []);
      })
      .catch(() => {
        if (live) setRows([]);
      });

    return () => {
      live = false;
    };
  }, [module]);

  const totalNeed = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.vendorsNeeded || 0), 0),
    [rows]
  );

  if (!rows.length) return null;

  return (
    <section
      style={{
        marginTop: 16,
        border: "1px solid #bbf7d0",
        borderRadius: 22,
        background: "linear-gradient(135deg,#ecfdf5,#f0f9ff)",
        padding: 16,
        boxShadow: "0 12px 30px rgba(15,23,42,0.06)",
      }}
    >
      <div style={{ display: "flex", gap: 14, justifyContent: "space-between", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 950, letterSpacing: "0.18em", textTransform: "uppercase", color: "#047857" }}>
            🚀 Vendor Opportunity
          </div>

          <h2 style={{ marginTop: 6, fontSize: 20, fontWeight: 950, color: "#064e3b" }}>
            {moduleLabel(module)} required in active demand areas
          </h2>

          <p style={{ marginTop: 6, maxWidth: 760, fontSize: 13, fontWeight: 700, lineHeight: 1.6, color: "#334155" }}>
            Buyer demand is active in these locations. Verified vendors joining now may receive better visibility and local enquiries.
          </p>
        </div>

        <div style={{ border: "1px solid #a7f3d0", borderRadius: 18, background: "#ffffff", padding: "10px 14px", minWidth: 140 }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: "#64748b" }}>Suggested vendors</div>
          <div style={{ fontSize: 28, fontWeight: 950, color: "#065f46" }}>{totalNeed}</div>
        </div>
      </div>

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
        {rows.map((row) => (
          <div key={row.id} style={{ border: "1px solid #d1fae5", borderRadius: 18, background: "#ffffff", padding: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 950, color: "#0f172a" }}>
              Need {vendorTypeText(module, row.category)} in {row.location}
            </div>

            <div style={{ marginTop: 4, fontSize: 12, fontWeight: 750, color: "#475569" }}>
              {[row.district, row.state].filter(Boolean).join(", ")}
            </div>

            <div style={{ marginTop: 8, fontSize: 13, fontWeight: 900, color: "#047857" }}>
              {opportunityLevel(row.priority)} · Need {row.vendorsNeeded} vendor{row.vendorsNeeded > 1 ? "s" : ""}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link href="/onboarding/business" style={{ borderRadius: 999, background: "#059669", color: "#ffffff", padding: "10px 14px", fontSize: 13, fontWeight: 900, textDecoration: "none" }}>
          {moduleCta(module)} →
        </Link>

        <Link href="/vendor-opportunities" style={{ borderRadius: 999, border: "1px solid #a7f3d0", background: "#ffffff", color: "#047857", padding: "10px 14px", fontSize: 13, fontWeight: 900, textDecoration: "none" }}>
          View Opportunities
        </Link>
      </div>
    </section>
  );
}
