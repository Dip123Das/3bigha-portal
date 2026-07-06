// app/rfq/start/page.tsx
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { SectionSkeleton } from "@/components/ui/Skeleton";
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
          <Card>
            <CardBody>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ fontWeight: 900, color: "#0f172a" }}>
                  Continue your {module} requirement
                </div>
                <p style={{ margin: 0, color: "#475569", fontWeight: 700 }}>
                  We will open the right RFQ form directly, so you do not need to choose again.
                </p>
                <Link className="ui-btn ui-btn--primary" href={quickRoute}>
                  Continue RFQ
                </Link>
              </div>
            </CardBody>
          </Card>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            <Card>
              <CardBody>
                <div style={{ display: "grid", gap: 10 }}>
                  <h2 style={{ margin: 0 }}>Materials RFQ</h2>
                  <p style={{ margin: 0, color: "#475569", fontWeight: 700 }}>
                    Cement, steel, sand, bricks, tiles, fittings and other construction materials.
                  </p>
                  <Link className="ui-btn ui-btn--primary" href="/rfq">
                    Start Materials RFQ
                  </Link>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div style={{ display: "grid", gap: 10 }}>
                  <h2 style={{ margin: 0 }}>General RFQ</h2>
                  <p style={{ margin: 0, color: "#475569", fontWeight: 700 }}>
                    Services, rentals, labour, machines, mixed requirements and custom needs.
                  </p>
                  <Link className="ui-btn ui-btn--secondary" href="/rfq">
                    Start General RFQ
                  </Link>
                </div>
              </CardBody>
            </Card>
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
          <SectionSkeleton cards={2} />
        </div>
      }
    >
      <UnifiedRfqStartPageInner />
    </Suspense>
  );
}