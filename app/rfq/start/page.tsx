// app/rfq/start/page.tsx
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";

function UnifiedRfqStartPageInner() {
  const sp = useSearchParams();

  const module = (sp.get("module") || "").toLowerCase(); // "materials" | "general" | ""
  const quickRoute = useMemo(() => {
    if (module === "materials") return "/rfq/new";
    if (module === "general") return "/rfq/general/new";
    return "";
  }, [module]);

  return (
    <div className="container pageBody" style={{ paddingTop: 16 }}>
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          display: "grid",
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Start RFQ</h1>
          <p style={{ marginTop: 8, opacity: 0.8 }}>
            Choose how you want to create your request for quotation.
          </p>
        </div>

        {quickRoute ? (
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 12,
            }}
          >
            <p style={{ marginTop: 0 }}>
              You came here with module: <strong>{module}</strong>
            </p>
            <Link
              href={quickRoute}
              style={{
                display: "inline-flex",
                padding: "10px 14px",
                borderRadius: 10,
                textDecoration: "none",
                border: "1px solid #111827",
              }}
            >
              Continue
            </Link>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 12,
              }}
            >
              <h2 style={{ marginTop: 0 }}>Materials RFQ</h2>
              <p>Create an RFQ for material requirements.</p>
              <Link
                href="/rfq/new"
                style={{
                  display: "inline-flex",
                  padding: "10px 14px",
                  borderRadius: 10,
                  textDecoration: "none",
                  border: "1px solid #111827",
                }}
              >
                Start Materials RFQ
              </Link>
            </div>

            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 12,
              }}
            >
              <h2 style={{ marginTop: 0 }}>General RFQ</h2>
              <p>Create a general-purpose RFQ.</p>
              <Link
                href="/rfq/general/new"
                style={{
                  display: "inline-flex",
                  padding: "10px 14px",
                  borderRadius: 10,
                  textDecoration: "none",
                  border: "1px solid #111827",
                }}
              >
                Start General RFQ
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function UnifiedRfqStartPage() {
  return (
    <Suspense
      fallback={
        <div className="container pageBody" style={{ paddingTop: 16 }}>
          Loading...
        </div>
      }
    >
      <UnifiedRfqStartPageInner />
    </Suspense>
  );
}