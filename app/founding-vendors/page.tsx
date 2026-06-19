import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Become a Founding Vendor | 3Bigha",
  description:
    "Join 3Bigha as a founding vendor. Free onboarding for manufacturers, suppliers, contractors, builders, rental providers and service professionals.",
  alternates: {
    canonical: "https://www.3bigha.com/founding-vendors",
  },
};

const benefits = [
  "Free early registration",
  "Founding vendor recognition",
  "AI-powered discovery",
  "District-level visibility",
  "RFQ opportunities",
  "Priority marketplace exposure",
];

const categories = [
  "Manufacturers",
  "Dealers",
  "Building Material Suppliers",
  "Contractors",
  "Builders",
  "Equipment Rentals",
  "Property Sellers",
  "Architects",
  "Interior Designers",
  "Service Providers",
];

export default function FoundingVendorsPage() {
  return (
    <main className="pageShell">
      <section className="heroPanel">
        <p className="eyebrow">BuildCon Early Access</p>
        <h1>Become a Founding Vendor on 3Bigha</h1>
        <p className="heroLead">
          AI-powered marketplace for Construction, Property, Building Materials,
          Services and Equipment Rentals.
        </p>
        <p className="heroLead">
          Join free during our early growth phase and get priority visibility as
          3Bigha expands district by district.
        </p>
        <div className="actionRow">
          <Link className="primaryButton" href="/vendor/register">
            Join Free
          </Link>
          <Link className="secondaryButton" href="/vendor-opportunities">
            View Opportunities
          </Link>
          <a className="secondaryButton" href="tel:+919614657110">
            Contact Founder
          </a>
        </div>
      </section>

      <section className="contentSection">
        <h2>Why Join 3Bigha Early?</h2>
        <div className="featureGrid">
          {benefits.map((item) => (
            <article className="featureCard" key={item}>
              <strong>✓ {item}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="contentSection">
        <h2>Who Can Join?</h2>
        <div className="tagGrid">
          {categories.map((item) => (
            <span className="tagPill" key={item}>
              {item}
            </span>
          ))}
        </div>
      </section>

      <section className="contentSection highlightPanel">
        <h2>BuildCon Special Vendor Access</h2>
        <p>
          Visitors meeting us at BuildCon can join 3Bigha with free onboarding,
          early vendor recognition, priority activation and future featured
          placement opportunities.
        </p>
      </section>

      <section className="contentSection">
        <h2>Live Marketplace Demand</h2>
        <p>
          3Bigha is already mapping local vendor demand such as cement suppliers,
          electricians, building material dealers, JCB rentals, contractors and
          property sellers.
        </p>
        <Link className="secondaryButton" href="/vendor-opportunities">
          Explore Vendor Demand
        </Link>
      </section>

      <section className="contentSection founderPanel">
        <h2>Talk to the Founder</h2>
        <p>
          <strong>Dipankar Das</strong>
          <br />
          Founder, 3Bigha
        </p>
        <p>
          📞 <a href="tel:+919614657110">+91 9614657110</a>
          <br />
          ✉️ <a href="mailto:vivek.abek@gmail.com">vivek.abek@gmail.com</a>
          <br />
          🌐 <a href="https://www.3bigha.com">www.3bigha.com</a>
        </p>
      </section>
    </main>
  );
}
