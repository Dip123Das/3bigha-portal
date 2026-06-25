"use client";

import { useSearchParams } from "next/navigation";

export default function BuildConOnboardingNotice() {
  const searchParams = useSearchParams();
  const program = searchParams.get("program");
  const source = searchParams.get("source");

  if (
    program !== "district-founding-vendor" &&
    program !== "founding-vendor" &&
    source !== "district-founder" &&
    source !== "whatsapp"
  ) {
    return null;
  }

  return (
    <section className="foundingPartnerOnboardingNotice">
      <p className="foundingPartnerNoticeKicker">🏆 3Bigha Founding Partners Programme</p>
      <h2>Free First-Year Access + Lifetime Founder Benefits</h2>
      <p>
        Complete your business onboarding now. One selected business from each
        segment in every district may receive first-year free listing access,
        subject to 3Bigha approval.
      </p>
      <div className="foundingPartnerNoticeSteps">
        <span>1. Apply</span>
        <span>2. Complete Profile</span>
        <span>3. Choose Segment</span>
        <span>4. Founder Review</span>
        <span>5. Founder Access</span>
      </div>
    </section>
  );
}
