import Link from "next/link";
import { redirect } from "next/navigation";

import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";

export const dynamic = "force-dynamic";

function formatDate(value: unknown) {
  const date = new Date(String(value || ""));
  if (!Number.isFinite(date.getTime())) return "Unavailable";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

export default async function VerificationNotificationsPage() {
  const access = await requireMasterAdmin();

  if ("error" in access) {
    if (access.status === 401) {
      redirect("/login?next=/admin/verification-notifications");
    }

    return <main style={{ padding: 24 }}>Access denied</main>;
  }

  const { data, error } = await access.admin
    .from("registration_operations_notifications")
    .select("id,severity,title,message,href,status,last_detected_at")
    .order("last_detected_at", { ascending: false })
    .limit(500);

  if (error) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Registration Notifications</h1>
        <pre>{error.message}</pre>
      </main>
    );
  }

  const rows = data || [];

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
          <div style={{ color: "#0f766e", fontWeight: 950, fontSize: 12 }}>
            REG-OPS-02
          </div>
          <h1 style={{ margin: "5px 0 6px" }}>Registration Notifications</h1>
          <p style={{ margin: 0, color: "#475569" }}>
            Human operational alerts for SLA breaches and review backlogs.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/admin/verification-operations">Operations dashboard</Link>
          <Link href="/admin/verification-reviews">Review workspace</Link>
        </div>
      </div>

      <div style={{ marginTop: 20, display: "grid", gap: 10 }}>
        {rows.map((row: any) => (
          <article
            key={row.id}
            style={{
              padding: 15,
              border:
                row.severity === "critical"
                  ? "1px solid #fecaca"
                  : row.severity === "warning"
                    ? "1px solid #fde68a"
                    : "1px solid #cbd5e1",
              borderRadius: 12,
              background:
                row.status === "resolved"
                  ? "#f8fafc"
                  : row.severity === "critical"
                    ? "#fef2f2"
                    : row.severity === "warning"
                      ? "#fffbeb"
                      : "white",
            }}
          >
            <strong>{row.title}</strong>
            <p style={{ margin: "6px 0", color: "#475569" }}>{row.message}</p>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              {row.status} · Last detected {formatDate(row.last_detected_at)}
            </div>
            <div style={{ marginTop: 8 }}>
              <Link href={row.href || "/admin/verification-reviews"}>Open case</Link>
            </div>
          </article>
        ))}

        {!rows.length ? (
          <div
            style={{
              padding: 16,
              border: "1px solid #bbf7d0",
              borderRadius: 12,
              background: "#f0fdf4",
              color: "#166534",
              fontWeight: 850,
            }}
          >
            No operational notification has been generated yet.
          </div>
        ) : null}
      </div>
    </main>
  );
}
