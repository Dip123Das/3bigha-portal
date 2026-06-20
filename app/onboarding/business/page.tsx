import { Suspense } from "react";
import BusinessOnboardingPageClient from "./BusinessOnboardingPageClient";
import BuildConOnboardingNotice from "@/app/_components/BuildConOnboardingNotice";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function BusinessOnboardingPage() {
  return (
    <Suspense fallback={<div>Loading business onboarding…</div>}>
      <BuildConOnboardingNotice />
      <BusinessOnboardingPageClient />
    </Suspense>
  );
}