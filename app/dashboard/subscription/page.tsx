import { Suspense } from "react";
import SubscriptionPageClient from "./SubscriptionPageClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function SubscriptionPage() {
  return (
    <Suspense fallback={<div>Loading subscription…</div>}>
      <SubscriptionPageClient />
    </Suspense>
  );
}