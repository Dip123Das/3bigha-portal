import Link from "next/link";
import {
  opportunityIcon,
  opportunityLevel,
  type PublicOpportunityModule,
  vendorTypeText,
} from "./public-vendor-opportunity-utils";

type Props = {
  module: PublicOpportunityModule;
  category?: string | null;
  location: string;
  district?: string;
  state?: string;
  vendorsNeeded: number;
  priority?: string | null;
};

export default function PublicVendorOpportunityCard({
  module,
  category,
  location,
  district,
  state,
  vendorsNeeded,
  priority,
}: Props) {
  const typeText = vendorTypeText(module, category);
  const level = opportunityLevel(priority);
  const icon = opportunityIcon(module, category);

  return (
    <article
      style={{
        border: "1px solid #dbeafe",
        borderRadius: 22,
        background: "#ffffff",
        padding: 16,
        boxShadow: "0 14px 35px rgba(15,23,42,0.06)",
      }}
    >
      <div style={{ fontSize: 28 }}>{icon}</div>

      <h3
        style={{
          marginTop: 8,
          fontSize: 18,
          lineHeight: 1.25,
          fontWeight: 950,
          color: "#0f172a",
        }}
      >
        Need {typeText}
        {location ? ` in ${location}` : ""}
      </h3>

      <div
        style={{
          marginTop: 12,
          display: "grid",
          gap: 8,
          fontSize: 13,
          color: "#334155",
          fontWeight: 750,
        }}
      >
        <div>
          <strong style={{ color: "#0f172a" }}>Location:</strong>{" "}
          {[location, district, state].filter(Boolean).join(", ") || "Active demand area"}
        </div>

        <div>
          <strong style={{ color: "#0f172a" }}>Vendor Type:</strong> {typeText}
        </div>

        <div>
          <strong style={{ color: "#0f172a" }}>Opportunity Level:</strong> {level}
        </div>

        <div>
          <strong style={{ color: "#0f172a" }}>Vendors Needed:</strong> {vendorsNeeded}
        </div>
      </div>

      <Link
        href="/onboarding/business"
        style={{
          marginTop: 14,
          display: "inline-flex",
          borderRadius: 999,
          background: "#059669",
          color: "#ffffff",
          padding: "10px 14px",
          fontSize: 13,
          fontWeight: 900,
          textDecoration: "none",
        }}
      >
        Become a Vendor →
      </Link>
    </article>
  );
}
