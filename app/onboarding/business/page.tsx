import { Suspense } from "react";
import BusinessOnboardingPageClient from "./BusinessOnboardingPageClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function BusinessOnboardingPage() {
  return (
    <Suspense fallback={<div>Loading business onboarding…</div>}>
      <BusinessOnboardingPageClient />
    </Suspense>
  );
}