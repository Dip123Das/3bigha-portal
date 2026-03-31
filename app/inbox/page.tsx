// app/inbox/page.tsx
import { fetchCombinedInbox } from "@/lib/rfq/combined-inbox/server";
import CombinedInboxClient from "./CombinedInboxClient";

export const dynamic = "force-dynamic";

type RoleFilter = "" | "buyer" | "vendor";

function normalizeRole(v: string | undefined): RoleFilter {
  if (v === "buyer" || v === "vendor") return v;
  return "";
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        padding: 12,
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        minWidth: 160,
        background: "#fff",
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{value}</div>
    </div>
  );
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams?: { q?: string; role?: string };
}) {
  const q = (searchParams?.q ?? "").trim();
  const role = normalizeRole(searchParams?.role);

  const res = await fetchCombinedInbox({
    q: q || undefined,
    role,
  });

  const rows = res.rows ?? [];

  const total = rows.length;
  const unread = rows.reduce((sum, r) => sum + (r.unread_count ?? 0), 0);
  const buyerRows = rows.filter((r) => r.role === "buyer").length;
  const vendorRows = rows.filter((r) => r.role === "vendor").length;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Unified Inbox</h1>
          <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>
            Buyer + Vendor RFQ chat conversations in one place, with unread counts and latest message preview.
          </div>
        </div>
      </div>

      {!res.error && (
        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <StatCard label="Total Conversations" value={total} />
          <StatCard label="Unread Messages" value={unread} />
          <StatCard label="Buyer Side" value={buyerRows} />
          <StatCard label="Vendor Side" value={vendorRows} />
        </div>
      )}

      <form method="get" style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <input
          type="text"
          name="q"
          placeholder="Search RFQ / counterpart / message preview"
          defaultValue={q}
          style={{ padding: 8, width: 280 }}
        />

        <select name="role" defaultValue={role} style={{ padding: 8, minWidth: 180 }}>
          <option value="">All Roles</option>
          <option value="buyer">Buyer Side</option>
          <option value="vendor">Vendor Side</option>
        </select>

        <button type="submit" style={{ padding: "8px 16px" }}>
          Apply
        </button>
      </form>

      {res.error ? (
        <pre style={{ marginTop: 12, color: "crimson", whiteSpace: "pre-wrap" }}>{res.error}</pre>
      ) : (
        <CombinedInboxClient rows={rows} />
      )}
    </div>
  );
}