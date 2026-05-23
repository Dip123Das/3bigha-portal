"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type VendorRow = {
  user_id: string;
  business_name: string | null;
  phone: string | null;
  city: string | null;
  district: string | null;
  subscription_plan: string | null;
  subscription_status: string | null;
  boost_priority: number | null;
  boost_expires_at: string | null;
  risk_score?: number;
  reputation_score?: number;
  ai_visibility_status?: string | null;
  ai_visibility_reason?: string | null;
};

export default function AdminVendorControlPage() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [rows, setRows] = useState<VendorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    setMsg("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setMsg("Please login again.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/admin/vendor-control", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const json = await res.json();

    if (!res.ok) {
      setMsg(json?.error || "Failed to load vendors.");
      setRows([]);
    } else {
      setRows(json.rows || []);
    }

    setLoading(false);
  }

  async function updateBoost(vendorUserId: string, action: "boost" | "reset") {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) return;

    const res = await fetch("/api/admin/vendor-control", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        vendor_user_id: vendorUserId,
        action,
        boost_priority: 20,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      setMsg(json?.error || "Action failed.");
      return;
    }

    setMsg("Updated successfully.");
    await load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main style={{ padding: 14, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 26, fontWeight: 950 }}>🧠 Admin Vendor Control AI</h1>

      <div style={{ marginTop: 8, color: "#64748b", fontWeight: 800 }}>
        Control vendor boost, visibility priority, and marketplace ranking pressure.
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a href="/admin/dashboard" style={{ fontWeight: 900 }}>
          ← Back to Admin Dashboard
        </a>

        <button
          type="button"
          onClick={load}
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            padding: "8px 12px",
            background: "white",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      {msg ? (
        <div style={{ marginTop: 12, fontWeight: 900, color: msg.includes("success") ? "#065f46" : "#b91c1c" }}>
          {msg}
        </div>
      ) : null}

      {loading ? (
        <div style={{ marginTop: 20, fontWeight: 900 }}>Loading vendors...</div>
      ) : (
        <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
          {rows.map((row) => (
            <div
              key={row.user_id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 14,
                background: row.boost_priority ? "#fffbeb" : "white",
              }}
            >
              <div style={{ fontWeight: 950 }}>
                {row.business_name || "Unnamed Vendor"}
              </div>

              <div style={{ marginTop: 4, fontSize: 13, color: "#64748b", fontWeight: 800 }}>
                {row.city || "—"} · {row.district || "—"} · {row.phone || "No phone"}
              </div>

              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12, fontWeight: 900 }}>
                <span>Plan: {row.subscription_plan || "free"}</span>
                <span>Status: {row.subscription_status || "free"}</span>
                <span>Boost: +{row.boost_priority || 0}</span>
                <span
                  style={{
                    color:
                      row.ai_visibility_status === "restricted"
                        ? "#dc2626"
                        : "#16a34a",
                  }}
                >
                  Status: {row.ai_visibility_status || "normal"}
                </span>
                <span style={{ color: (row.risk_score || 0) > 40 ? "#dc2626" : "#16a34a" }}>
                  Risk: {row.risk_score || 0}
                </span>

                <span style={{ color: (row.reputation_score || 0) > 60 ? "#16a34a" : "#dc2626" }}>
                  Reputation: {row.reputation_score || 0}
                </span>
                <span>
                  Expires:{" "}
                  {row.boost_expires_at
                    ? new Date(row.boost_expires_at).toLocaleDateString()
                    : "—"}
                </span>
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => updateBoost(row.user_id, "boost")}
                  style={{
                    border: "none",
                    borderRadius: 10,
                    padding: "8px 12px",
                    background: "#f59e0b",
                    color: "white",
                    fontWeight: 950,
                    cursor: "pointer",
                  }}
                >
                  🚀 Admin Boost
                </button>

                                <button
                  type="button"
                  onClick={() => updateBoost(row.user_id, "soft_ban" as any)}
                  style={{
                    border: "none",
                    borderRadius: 10,
                    padding: "8px 12px",
                    background: "#991b1b",
                    color: "white",
                    fontWeight: 950,
                    cursor: "pointer",
                  }}
                >
                  🚫 Soft Ban
                </button>

                <button
                  type="button"
                  onClick={() => updateBoost(row.user_id, "restore" as any)}
                  style={{
                    border: "none",
                    borderRadius: 10,
                    padding: "8px 12px",
                    background: "#16a34a",
                    color: "white",
                    fontWeight: 950,
                    cursor: "pointer",
                  }}
                >
                  ✅ Restore
                </button>

                <button
                  type="button"
                  onClick={() => updateBoost(row.user_id, "reset")}
                  style={{
                    border: "none",
                    borderRadius: 10,
                    padding: "8px 12px",
                    background: "#ef4444",
                    color: "white",
                    fontWeight: 950,
                    cursor: "pointer",
                  }}
                >
                  ❌ Reset Boost
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}