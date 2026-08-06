import { Suspense } from "react";
import CustomerOnboardingClient from "./CustomerOnboardingClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function CustomerOnboardingPage() {
  return (
    <Suspense
      fallback={
        <main style={{ padding: "40px 20px" }}>
          Loading customer setup…
        </main>
      }
    >
      <CustomerOnboardingClient />
    </Suspense>
  );
}
