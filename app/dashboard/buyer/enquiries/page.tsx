import { Suspense } from "react";
import BuyerEnquiriesPageClient from "./BuyerEnquiriesPageClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function BuyerEnquiriesPage() {
  return (
    <Suspense fallback={<div>Loading enquiries…</div>}>
      <BuyerEnquiriesPageClient />
    </Suspense>
  );
}