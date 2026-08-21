import Link from "next/link";
import { redirect } from "next/navigation";

import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";

export const dynamic = "force-dynamic";

function ageHours(value: unknown) {
  const time = new Date(String(value || "")).getTime();
  return Number.isFinite(time)
    ? Math.max(0, Math.floor((Date.now() - time) / 3_600_000))
    : 0;
}

function card(label: string, value: number, note: string) {
  return (
    <div
      style={{
        padding: 16,
        border: "1px solid #cbd5e1",
        borderRadius: 14,
        background: "white",
      }}
    >
      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 850 }}>
        {label}
      </div>
      <div style={{ marginTop: 5, fontSize: 30, fontWeight: 950 }}>
        {value}
      </div>
      <div style={{ marginTop: 4, fontSize: 13, color: "#475569" }}>
        {note}
      </div>
    </div>
  );
}

export default async function VerificationOperationsPage() {
  const access = await requireMasterAdmin();

  if ("error" in access) {
    if (access.status === 401) {
      redirect("/login?next=/admin/verification-operations");
    }

    return <main style={{ padding: 24 }}>Access denied</main>;
  }

  const { admin } = access;
  const since = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  const [casesRes, eventsRes, docsRes, crossRes] = await Promise.all([
    admin
      .from("registration_verification_cases")
      .select("id,user_id,status,created_at")
      .order("created_at", { ascending: false })
      .limit(1000),
    admin
      .from("registration_verification_events")
      .select("id,event_type,decided_by,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(2000),
    admin
      .from("registration_document_intelligence")
      .select("id,status")
      .limit(1000),
    admin
      .from("registration_cross_verification")
      .select("id,status,recommended_action")
      .limit(1000),
  ]);

  const loadError =
    casesRes.error || eventsRes.error || docsRes.error || crossRes.error;

  if (loadError) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Registration Operations</h1>
        <pre>{loadError.message}</pre>
      </main>
    );
  }

  const latestByUser = new Map<string, any>();

  for (const item of casesRes.data || []) {
    if (!latestByUser.has(item.user_id)) {
      latestByUser.set(item.user_id, item);
    }
  }

  const closed = new Set([
    "auto_verified",
    "admin_verified",
    "restricted",
    "rejected",
  ]);

  const pending = [...latestByUser.values()].filter(
    (item: any) => !closed.has(item.status)
  );
  const pending24 = pending.filter(
    (item: any) => ageHours(item.created_at) >= 24
  );
  const pending72 = pending.filter(
    (item: any) => ageHours(item.created_at) >= 72
  );
  const docsReview = (docsRes.data || []).filter(
    (item: any) => item.status === "needs_manual_review"
  );
  const crossReview = (crossRes.data || []).filter(
    (item: any) => item.status === "needs_manual_review"
  );
  const decisions = (eventsRes.data || []).filter(
    (item: any) =>
      String(item.event_type || "").startsWith("admin_registration_")
  );
  const reviewers = new Set(
    decisions.map((item: any) => item.decided_by).filter(Boolean)
  );

  return (
    <main style={{ padding: 24, width: "100%" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              color: "#0f766e",
              fontWeight: 950,
              fontSize: 12,
              letterSpacing: 0.6,
            }}
          >
            REG-OPS-01
          </div>
          <h1 style={{ margin: "5px 0 6px" }}>
            Registration Operations
          </h1>
          <p style={{ margin: 0, color: "#475569" }}>
            Human queue health, SLA monitoring, reviewer activity,
            and operational alerts. No new AI scoring.
          </p>
        </div>

        <Link href="/admin/verification-reviews">
          Open review workspace
        </Link>
      </div>

      <section
        style={{
          marginTop: 20,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 12,
        }}
      >
        {card("Pending cases", pending.length, "Latest unresolved registrations")}
        {card("Pending 24+ hours", pending24.length, "Approaching SLA breach")}
        {card("Pending 72+ hours", pending72.length, "Requires escalation")}
        {card("Document review needed", docsReview.length, "Low-confidence extraction")}
        {card("Cross-check review needed", crossReview.length, "Mismatch or duplicate risk")}
        {card("Human decisions in 7 days", decisions.length, "Recorded admin decisions")}
        {card("Active reviewers", reviewers.size, "Reviewers with recent decisions")}
      </section>

      <section
        style={{
          marginTop: 22,
          padding: 18,
          border: "1px solid #e2e8f0",
          borderRadius: 14,
          background: "white",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Operational alerts</h2>

        {pending72.length ? (
          <p style={{ color: "#991b1b", fontWeight: 850 }}>
            {pending72.length} registration case(s) have been pending
            for at least 72 hours.
          </p>
        ) : null}

        {pending24.length ? (
          <p style={{ color: "#92400e", fontWeight: 850 }}>
            {pending24.length} registration case(s) have been pending
            for at least 24 hours.
          </p>
        ) : null}

        {docsReview.length ? (
          <p style={{ color: "#92400e", fontWeight: 850 }}>
            {docsReview.length} document intelligence result(s) require
            human review.
          </p>
        ) : null}

        {crossReview.length ? (
          <p style={{ color: "#92400e", fontWeight: 850 }}>
            {crossReview.length} cross-verification result(s) require
            human review.
          </p>
        ) : null}

        {!pending24.length &&
        !pending72.length &&
        !docsReview.length &&
        !crossReview.length ? (
          <p style={{ color: "#166534", fontWeight: 850 }}>
            No active registration operations alert.
          </p>
        ) : null}
      </section>

      <section
        style={{
          marginTop: 22,
          padding: 18,
          border: "1px solid #e2e8f0",
          borderRadius: 14,
          background: "white",
          overflowX: "auto",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Oldest pending cases</h2>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 620,
          }}
        >
          <thead>
            <tr>
              {["Status", "Age", "Action"].map((label) => (
                <th
                  key={label}
                  style={{
                    textAlign: "left",
                    padding: 9,
                    borderBottom: "1px solid #cbd5e1",
                  }}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...pending]
              .sort(
                (left: any, right: any) =>
                  ageHours(right.created_at) -
                  ageHours(left.created_at)
              )
              .slice(0, 20)
              .map((item: any) => (
                <tr key={item.id}>
                  <td style={{ padding: 9, borderBottom: "1px solid #e2e8f0" }}>
                    {String(item.status || "").replaceAll("_", " ")}
                  </td>
                  <td style={{ padding: 9, borderBottom: "1px solid #e2e8f0" }}>
                    {ageHours(item.created_at)}h
                  </td>
                  <td style={{ padding: 9, borderBottom: "1px solid #e2e8f0" }}>
                    <Link
                      href={`/admin/verification-reviews?case=${encodeURIComponent(
                        item.id
                      )}`}
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>

      <p style={{ marginTop: 18, color: "#64748b", fontSize: 13 }}>
        This dashboard is read-only, uses capped operational queries,
        and does not change registration, evidence, approval,
        dashboard, or subscription state.
      </p>
    </main>
  );
}
