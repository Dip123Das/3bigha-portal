import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "3Bigha Founding Partners Programme",
  description:
    "Reserve your 3Bigha Founding Partner seat. One selected partner per business category in every district gets first-year free access and lifetime founder benefits, subject to approval.",
  alternates: {
    canonical: "https://www.3bigha.com/founding-vendors",
  },
};

const stats = [
  "🇮🇳 770+ Districts",
  "🏗 20+ Business Segments",
  "🏆 Founder Badge",
  "🚀 AI Marketplace Priority",
];

const benefits = [
  "Free registration for the first year",
  "Free listing access for the first year",
  "Founder badge and recognition",
  "District-level marketplace visibility",
  "RFQ and enquiry opportunities",
  "Lifetime preferential pricing",
  "Early access to future AI tools",
  "Manual founder review",
];

const categories = [
  "Manufacturers",
  "Building Material Suppliers",
  "Cement Suppliers",
  "Steel Dealers",
  "Hardware Dealers",
  "Contractors",
  "Builders / Developers",
  "Equipment Rental Providers",
  "Architects",
  "Interior Designers",
  "Property Sellers",
  "Service Providers",
];

const steps = [
  "Apply",
  "Complete Business Profile",
  "Choose Segment",
  "Add Listings",
  "Founder Review",
  "Approval",
  "Founder Badge",
  "Public Visibility",
];

export default function FoundingPartnersPage() {
  return (
    <main className="foundingPartnerPage">
      <section className="foundingHero">
        <p className="foundingEyebrow">🏆 3Bigha Founding Partners Programme</p>
        <h1>Reserve Your Official 3Bigha Founder Seat</h1>
        <p>
          Only one trusted business per category in each district will receive Founder status, first-year free access and lifetime founder benefits.
        </p>

        <div className="foundingStats">
          {stats.map((item) => (
            <div className="foundingStat" key={item}>{item}</div>
          ))}
        </div>

        <div className="foundingActions">
          <Link className="foundingPrimaryBtn" href="/onboarding/business?source=district-founder&program=district-founding-vendor">
            🏆 Reserve My Founder Seat
          </Link>
          <Link className="foundingSecondaryBtn" href="/onboarding/business?source=district-founder&program=district-founding-vendor&intent=start-listing">
            🧾 Create Business Profile
          </Link>
          <a className="foundingSecondaryBtn" href="https://wa.me/919614657110?text=Hello%20Dipankar%20Da%2C%20I%20want%20to%20apply%20as%20a%203Bigha%20Founding%20Partner.">
            💬 WhatsApp Founder Team
          </a>
        </div>
      </section>

      <section className="foundingCard foundingImportant">
        <h2>Only 1 Business Selected Per Category</h2>
        <p>
          Founder seats are allotted on a first-approved basis. Once a business is approved for a district and category, that Founder Seat closes for that segment.
        </p>
      </section>

      <section className="foundingCard">
        <h2>Why is 3Bigha doing this?</h2>
        <p>
          3Bigha is building India’s AI-powered marketplace for construction,
          property, materials, services and rentals. We are selecting trusted
          businesses across every district to become our early Founding Partners.
        </p>
        <p>
          These partners help establish verified local supply networks and, in
          return, receive first-year free access, founder recognition and
          lifetime preferential pricing compared to standard plans.
        </p>
      </section>

      <section className="foundingCard">
        <h2>Founder Benefits</h2>
        <div className="foundingGrid">
          {benefits.map((item) => (
            <div className="foundingMiniCard" key={item}>✓ {item}</div>
          ))}
        </div>
      </section>


      <section className="foundingCard foundingImportant">
        <h2>Founder Benefits Forever</h2>
        <div className="foundingGrid">
          <div className="foundingMiniCard">🏆 Permanent Founder Badge</div>
          <div className="foundingMiniCard">💰 Lifetime Preferential Pricing</div>
          <div className="foundingMiniCard">🚀 AI Marketplace Priority</div>
          <div className="foundingMiniCard">📍 District Recognition</div>
          <div className="foundingMiniCard" style={{ position: "fixed", left: "auto", right: 20, bottom: 20, zIndex: 60 }}>⚡ Early Access to Future AI Tools</div>
          <div className="foundingMiniCard">🤝 Priority Founder Support</div>
        </div>
      </section>

      <section className="foundingCard">
        <h2>How Approval Works</h2>
        <div className="foundingTimeline">
          {steps.map((item, index) => (
            <div className="foundingStep" key={item}>
              <span>{index + 1}</span>
              <strong>{item}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="foundingCard">
        <h2>Who Can Apply?</h2>
        <div className="foundingTags">
          {categories.map((item) => (
            <span className="foundingTag" key={item}>{item}</span>
          ))}
        </div>
      </section>

      <section className="foundingCard foundingImportant">
        <h2>Manual Founder Review</h2>
        <p>
          Applications are reviewed manually by the 3Bigha Founder. Only
          verified and suitable businesses will receive Founding Partner status.
          Public visibility starts only after approval.
        </p>
      </section>


      <section className="foundingCard">
        <h2>Frequently Asked Questions</h2>
        <div className="foundingFaq">
          <details open>
            <summary>Is registration free?</summary>
            <p>Yes. Applying and completing your business profile is free.</p>
          </details>
          <details>
            <summary>How long is free listing access available?</summary>
            <p>Approved Founding Partners receive first-year free listing access.</p>
          </details>
          <details>
            <summary>Can two businesses get the same Founder Seat?</summary>
            <p>No. Only one approved business per district and business category receives Founder status.</p>
          </details>
          <details>
            <summary>Will listings become public immediately?</summary>
            <p>No. Public visibility starts only after 3Bigha review and approval.</p>
          </details>
        </div>
      </section>

      <section className="foundingCard">
        <h2>Talk to the Founder Team</h2>
        <p><strong>Dipankar Das</strong><br />Founder, 3Bigha</p>
        <p>
          📞 <a href="tel:+919614657110">+91 9614657110</a><br />
          ✉️ <a href="mailto:vivek.abek@gmail.com">vivek.abek@gmail.com</a><br />
          🌐 <a href="https://www.3bigha.com">www.3bigha.com</a>
        </p>

        <div className="foundingActions">
          <Link className="foundingPrimaryBtn" href="/onboarding/business?source=district-founder&program=district-founding-vendor">
            🏆 Reserve My Founder Seat
          </Link>
        </div>
      </section>
    </main>
  );
}
