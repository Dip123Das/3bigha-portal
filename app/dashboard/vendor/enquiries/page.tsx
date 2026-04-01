import { Suspense } from "react";
import VendorEnquiriesInboxPageClient from "./VendorEnquiriesInboxPageClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function VendorEnquiriesInboxPage() {
  return (
    <Suspense fallback={<div>Loading vendor enquiries…</div>}>
      <VendorEnquiriesInboxPageClient />
    </Suspense>
  );
}