import { Suspense } from "react";
import BuyerEnquiriesPageClient from "./BuyerEnquiriesPageClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function BuyerEnquiriesPage() {
  return (
    <Suspense
      fallback={
        <main>
          <div style={{ width: "min(1120px, 92vw)", margin: "0 auto", padding: "24px 0" }}>
            <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 8 }}>
              My Enquiries
            </div>
            <div style={{ opacity: 0.8 }}>Preparing your inbox…</div>
          </div>
        </main>
      }
    >
      <BuyerEnquiriesPageClient />
    </Suspense>
  );
}