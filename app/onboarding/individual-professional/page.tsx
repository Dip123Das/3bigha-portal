import { Suspense } from "react";
import IndividualProfessionalOnboardingClient from "./IndividualProfessionalOnboardingClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function IndividualProfessionalOnboardingPage() {
  return (
    <Suspense
      fallback={
        <main
          style={{
            minHeight: "100vh",
            padding: "40px 20px",
            background: "#f8fafc",
          }}
        >
          <div
            style={{
              maxWidth: 900,
              margin: "0 auto",
              padding: 24,
              borderRadius: 18,
              border: "1px solid #e2e8f0",
              background: "white",
            }}
          >
            <strong>Preparing your skilled professional registration…</strong>
          </div>
        </main>
      }
    >
      <IndividualProfessionalOnboardingClient />
    </Suspense>
  );
}
