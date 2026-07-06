import Link from "next/link";

export default function GeneralRfqPlaceholderPage() {
  return (
    <div className="container pageBody" style={{ paddingTop: 20 }}>
      <h1 style={{ fontSize: 18, marginBottom: 8 }}>Start General RFQ (Unified) 🧩</h1>

      <div style={{ opacity: 0.85, marginBottom: 14 }}>
        This is a placeholder for the unified RFQ flow (materials + services + rentals + properties).
        We will connect this to the new <b>rfqs</b> table with <b>module</b> selection and smarter forms.
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link className="topBtn topBtnPrimary" href="/rfq">
          Start Material RFQ →
        </Link>
        <Link className="topBtn topBtnGhost" href="/">
          Go Home
        </Link>
      </div>
    </div>
  );
}