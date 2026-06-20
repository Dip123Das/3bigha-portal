"use client";

import { useSearchParams } from "next/navigation";

export default function BuildConOnboardingNotice() {
  const searchParams = useSearchParams();
  const program = searchParams.get("program");
  const source = searchParams.get("source");

  if (program !== "founding-vendor" && source !== "buildcon") return null;

  return (
    <section className="buildconOnboardingNotice">
      <p className="buildconNoticeKicker">🎉 Bharat BuildCon 2026 Founding Vendor Program</p>
      <h2>Free Registration + Free Listing Access</h2>
      <p>
        Complete your business onboarding now. Your Founding Vendor access will
        be reviewed by 3Bigha before public visibility is activated.
      </p>
      <div className="buildconNoticeSteps">
        <span>1. Register</span>
        <span>2. Complete Profile</span>
        <span>3. Add Listings</span>
        <span>4. 3Bigha Approval</span>
      </div>
    </section>
  );
}
