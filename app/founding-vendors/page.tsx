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
  "AI-powered buyer discovery",
  "District-level visibility",
  "RFQ and enquiry opportunities",
  "Priority marketplace exposure",
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
    <main style={{ background: "#fff7f1", padding: "24px", color: "#2b1535" }}>
      <section
        style={{
          borderRadius: 28,
          padding: "34px 28px",
          background: "linear-gradient(135deg,#ff4b1f,#8e168f)",
          color: "white",
          boxShadow: "0 18px 50px rgba(80,20,90,.22)",
        }}
      >
        <p style={{ fontWeight: 800, letterSpacing: ".08em" }}>
          🎉 BUILDCON SPECIAL EARLY ACCESS
        </p>
        <h1 style={{ fontSize: "clamp(34px,6vw,68px)", lineHeight: 1.02, margin: "12px 0" }}>
          Become a Founding Vendor on 3Bigha
        </h1>
        <p style={{ fontSize: 20, maxWidth: 920 }}>
          Free onboarding for construction, property, building materials,
          contractors, services and equipment rental businesses.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
          <Link
            href="/vendor/register?source=buildcon&program=founding-vendor"
            style={buttonPrimary}
          >
            🚀 Register Free as Founding Vendor
          </Link>
          <a
            href="https://wa.me/919614657110?text=Hello%20Dipankar%20Da%2C%20I%20want%20to%20join%203Bigha%20as%20a%20Founding%20Vendor."
            style={buttonLight}
          >
            💬 Join Through WhatsApp
          </a>
          <Link href="/vendor-opportunities" style={buttonLight}>
            📈 View Opportunities
          </Link>
        </div>
      </section>

      <section style={grid2}>
        <div style={card}>
          <h2>How Free Joining Works</h2>
          <ol style={{ lineHeight: 1.9, paddingLeft: 22 }}>
            <li>Register free as a founding vendor.</li>
            <li>Create your vendor profile.</li>
            <li>List your products, services or rentals.</li>
            <li>3Bigha reviews and approves your profile/listings.</li>
            <li>After approval, your business becomes publicly visible.</li>
          </ol>
          <p style={{ fontWeight: 800, color: "#8e168f" }}>
            No automatic public listing. Founder/vendor listings are approval-based.
          </p>
        </div>

        <div style={card}>
          <h2>Talk to the Founder</h2>
          <p>
            <strong>Dipankar Das</strong>
            <br />
            Founder, 3Bigha
          </p>
          <p style={{ lineHeight: 1.8 }}>
            📞 <a href="tel:+919614657110">+91 9614657110</a>
            <br />
            ✉️ <a href="mailto:vivek.abek@gmail.com">vivek.abek@gmail.com</a>
            <br />
            🌐 <a href="https://www.3bigha.com">www.3bigha.com</a>
          </p>
          <a
            href="https://wa.me/919614657110?text=Hello%20Dipankar%20Da%2C%20I%20met%20you%20at%20BuildCon%20and%20want%20to%20know%20about%203Bigha%20vendor%20listing."
            style={buttonPrimary}
          >
            Save / Message on WhatsApp
          </a>
        </div>
      </section>

      <section style={card}>
        <h2>Why Join 3Bigha Early?</h2>
        <div style={miniGrid}>
          {benefits.map((item) => (
            <div key={item} style={pillCard}>
              ✓ {item}
            </div>
          ))}
        </div>
      </section>

      <section style={card}>
        <h2>Who We Are Onboarding</h2>
        <div style={tagGrid}>
          {categories.map((item) => (
            <span key={item} style={tag}>
              {item}
            </span>
          ))}
        </div>
      </section>

      <section style={card}>
        <h2>Current Vendor Opportunities</h2>
        <div style={miniGrid}>
          {opportunities.map((item) => (
            <div key={item} style={opportunityCard}>
              🔎 {item}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 20 }}>
          <Link href="/vendor-opportunities" style={buttonPrimary}>
            Explore More Vendor Demand
          </Link>
        </div>
      </section>

      <section
        style={{
          ...card,
          background: "linear-gradient(135deg,#fff,#ffe8dc)",
          textAlign: "center",
        }}
      >
        <h2>Founding Vendor Program</h2>
        <p style={{ fontSize: 18 }}>
          First early vendors receive founding vendor recognition, priority
          activation and marketplace visibility benefits as 3Bigha expands.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <Link
            href="/vendor/register?source=buildcon&program=founding-vendor"
            style={buttonPrimary}
          >
            🚀 Register Free Now
          </Link>
          <a href="tel:+919614657110" style={buttonSecondary}>
            📞 Call Founder
          </a>
        </div>
      </section>
    </main>
  );
}

const card = {
  background: "white",
  borderRadius: 24,
  padding: 26,
  marginTop: 22,
  boxShadow: "0 12px 36px rgba(70,20,80,.10)",
  border: "1px solid rgba(142,22,143,.12)",
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
  gap: 22,
};

const miniGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: 14,
};

const tagGrid = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const tag = {
  padding: "10px 14px",
  borderRadius: 999,
  background: "#fff0e7",
  border: "1px solid #ffb48e",
  fontWeight: 800,
};

const pillCard = {
  padding: 18,
  borderRadius: 18,
  background: "#fff7f1",
  fontWeight: 800,
};

const opportunityCard = {
  padding: 18,
  borderRadius: 18,
  background: "#f7edff",
  fontWeight: 800,
};

const buttonPrimary = {
  display: "inline-block",
  padding: "14px 18px",
  borderRadius: 999,
  background: "#ff4b1f",
  color: "white",
  fontWeight: 900,
  textDecoration: "none",
};

const buttonLight = {
  display: "inline-block",
  padding: "14px 18px",
  borderRadius: 999,
  background: "white",
  color: "#7b167d",
  fontWeight: 900,
  textDecoration: "none",
};

const buttonSecondary = {
  display: "inline-block",
  padding: "14px 18px",
  borderRadius: 999,
  background: "#7b167d",
  color: "white",
  fontWeight: 900,
  textDecoration: "none",
};
