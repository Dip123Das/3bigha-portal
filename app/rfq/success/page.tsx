import Link from "next/link";

export default function RfqSuccessPage() {
  return (
    <div className="container pageBody" style={{ paddingTop: 20 }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Requirement submitted ✅</h1>
      <div style={{ opacity: 0.85, marginBottom: 14 }}>
        Vendors will review your requirement and send competitive quotations.
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link className="topBtn topBtnPrimary" href="/">
          Go Home
        </Link>

        <Link className="topBtn topBtnGhost" href="/dashboard/buyer/rfqs">
          View My Requirements →
        </Link>

        <Link className="topBtn topBtnGhost" href="/dashboard/buyer/inbox">
          Open Buyer Inbox →
        </Link>
      </div>
    </div>
  );
}