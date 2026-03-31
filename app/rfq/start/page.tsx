// app/rfq/start/page.tsx
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

export default function UnifiedRfqStartPage() {
  const sp = useSearchParams();

  const module = (sp.get("module") || "").toLowerCase(); // "materials" | "general" | ""
  const quickRoute = useMemo(() => {
    if (module === "materials") return "/rfq/new";
    if (module === "general") return "/rfq/general/new";
    return "";
  }, [module]);

  return (
    <div className="container pageBody" style={{ paddingTop: 16 }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Submit Requirement (Unified RFQ)</h1>
      <div style={{ opacity: 0.8, marginBottom: 16 }}>
        Choose what you want to request. Nearby vendors will send competitive quotations.
      </div>

      {quickRoute ? (
        <div style={{ marginBottom: 12 }}>
          <Link className="topBtn topBtnPrimary" href={quickRoute}>
            Continue →
          </Link>
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 12,
        }}
      >
        <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 12, background: "white" }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>🧱 Material RFQ</div>
          <div style={{ opacity: 0.8, marginBottom: 10 }}>
            Cement, steel, bricks, tiles, paint, plumbing, electrical items etc.
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link className="topBtn topBtnPrimary" href="/rfq/new">
              Start Material RFQ →
            </Link>
            <Link className="topBtn topBtnGhost" href="/materials" target="_blank" rel="noreferrer">
              Browse Materials →
            </Link>
          </div>
        </div>

        <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 12, background: "white" }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>🧾 General RFQ</div>
          <div style={{ opacity: 0.8, marginBottom: 10 }}>
            Any requirement that isn’t strictly materials (multi-category / mixed / custom).
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link className="topBtn topBtnPrimary" href="/rfq/general/new">
              Start General RFQ →
            </Link>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, opacity: 0.8 }}>
        Vendors can track all RFQs in{" "}
        <Link href="/vendor/inbox-v2">Vendor Inbox</Link>.
      </div>
    </div>
  );
}