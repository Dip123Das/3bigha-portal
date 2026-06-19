import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Become a Founding Vendor | 3Bigha",
  description:
    "Join 3Bigha as a founding vendor. Free registration and free listing access for BuildCon vendors, subject to 3Bigha approval.",
  alternates: {
    canonical: "https://www.3bigha.com/founding-vendors",
  },
};

const benefits = [
  "Free vendor registration",
  "Free product / service / rental listing access",
  "Founding Vendor recognition",
  "Priority marketplace visibility",
  "District-level buyer discovery",
  "RFQ and enquiry opportunities",
];

const categories = [
  "Manufacturers",
  "Dealers",
  "Cement Suppliers",
  "Steel Dealers",
  "Brick Manufacturers",
  "Building Material Suppliers",
  "Contractors",
  "Builders",
  "Equipment Rentals",
  "Property Sellers",
  "Architects",
  "Interior Designers",
  "Service Providers",
];

const opportunities = [
  "Need Cement Suppliers in Khagrabari",
  "Need Electricians in Cooch Behar Town",
  "Need Building Material Suppliers in Battala",
  "Need JCB Rentals in Baneswar",
  "Need Property Sellers in Tufanganj",
];

export default function FoundingVendorsPage() {
  return (
    <main className="foundingVendorPage">
      <section className="foundingHero">
        <p className="foundingEyebrow">🎉 BuildCon Special Early Access</p>
        <h1>Become a Founding Vendor on 3Bigha</h1>
        <p>
          Free registration and free listing access for construction, property,
          building materials, contractors, services and equipment rental businesses.
        </p>

        <div className="foundingActions">
          <Link className="foundingPrimaryBtn" href="/vendor/register?source=buildcon&program=founding-vendor">
            🚀 Register Free as Founding Vendor
          </Link>
          <Link className="foundingSecondaryBtn" href="/post-list?source=buildcon&program=founding-vendor">
            🧾 List Products / Services Free
          </Link>
          <a className="foundingSecondaryBtn" href="https://wa.me/919614657110?text=Hello%20Dipankar%20Da%2C%20I%20want%20to%20join%203Bigha%20as%20a%20Founding%20Vendor.">
            💬 Join Through WhatsApp
          </a>
        </div>
      </section>

      <section className="foundingCard foundingImportant">
        <h2>Free Joining + Free Listing Access</h2>
        <p>
          BuildCon vendors can register free and add their products, services,
          rentals or business details on 3Bigha.
        </p>
        <p>
          <strong>Important:</strong> Founding Vendor profiles and listings will
          be reviewed and approved by 3Bigha before becoming publicly visible.
        </p>
      </section>

      <section className="foundingCard">
        <h2>Why Join 3Bigha Early?</h2>
        <div className="foundingGrid">
          {benefits.map((item) => (
            <div className="foundingMiniCard" key={item}>✓ {item}</div>
          ))}
        </div>
      </section>

      <section className="foundingCard">
        <h2>Who Can Join?</h2>
        <div className="foundingTags">
          {categories.map((item) => (
            <span className="foundingTag" key={item}>{item}</span>
          ))}
        </div>
      </section>

      <section className="foundingCard">
        <h2>Current Vendor Opportunities</h2>
        <div className="foundingGrid">
          {opportunities.map((item) => (
            <div className="foundingMiniCard" key={item}>🔎 {item}</div>
          ))}
        </div>
        <Link className="foundingPrimaryBtn foundingInlineBtn" href="/vendor-opportunities">
          Explore More Vendor Demand
        </Link>
      </section>

      <section className="foundingCard">
        <h2>Talk to the Founder</h2>
        <p>
          <strong>Dipankar Das</strong><br />
          Founder, 3Bigha
        </p>
        <p>
          📞 <a href="tel:+919614657110">+91 9614657110</a><br />
          ✉️ <a href="mailto:vivek.abek@gmail.com">vivek.abek@gmail.com</a><br />
          🌐 <a href="https://www.3bigha.com">www.3bigha.com</a>
        </p>
      </section>
    </main>
  );
}
