"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { ActionButton } from "@/components/ui/ActionButton";
import { EmptyState } from "@/components/ui/EmptyState";

type VendorNotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  is_read: boolean;
  whatsapp_sent: boolean;
  push_sent: boolean;
  created_at: string;
};

function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function getWhatsAppUrl(n: VendorNotificationRow) {
  const url = n.data?.whatsapp_url;
  if (typeof url === "string" && url.startsWith("https://wa.me/")) {
    return url;
  }

  const fallbackText = [
    "3Bigha Vendor Alert",
    "",
    n.message,
    "",
    "Open your vendor dashboard to improve visibility:",
    "https://www.3bigha.com/dashboard/vendor",
  ].join("\n");

  return `https://wa.me/?text=${encodeURIComponent(fallbackText)}`;
}

export default function VendorNotificationsPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [rows, setRows] = useState<VendorNotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function loadNotifications() {
    setLoading(true);
    setErr(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      router.replace("/login?next=/dashboard/vendor/notifications");
      return;
    }

    const { data, error } = await supabase
      .from("vendor_notifications")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      setErr(error.message);
      setRows([]);
    } else {
      setRows((data || []) as VendorNotificationRow[]);
    }

    setLoading(false);
  }

  async function markAsRead(id: string) {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, is_read: true } : row))
    );

    await supabase
      .from("vendor_notifications")
      .update({ is_read: true })
      .eq("id", id);
  }

  useEffect(() => {
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main>
      <Container>
        <SectionHeader
          title="Vendor Notifications"
          subtitle="Rank alerts, visibility changes, and future WhatsApp or push alerts will appear here."
        />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <ActionButton href="/dashboard/vendor" variant="secondary">
            ← Back to Vendor Dashboard
          </ActionButton>

          <button
            type="button"
            onClick={() => loadNotifications()}
            style={{
              height: 40,
              padding: "0 14px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "white",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ opacity: 0.75, fontWeight: 800 }}>Loading notifications…</div>
        ) : err ? (
          <div style={{ color: "crimson", fontWeight: 900 }}>{err}</div>
        ) : rows.length === 0 ? (
          <EmptyState message="No notifications yet. Rank drops, improvements, and important vendor alerts will appear here." />
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {rows.map((n) => (
              <div
                key={n.id}
                style={{
                  border: n.is_read ? "1px solid #e5e7eb" : "1px solid #f59e0b",
                  background: n.is_read
                    ? "#ffffff"
                    : "linear-gradient(135deg, #fffbeb, #ffffff)",
                  padding: 14,
                  borderRadius: 12,
                  boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 950, fontSize: 16 }}>{n.title}</div>
                    <div style={{ marginTop: 5, fontSize: 13, color: "#475569", fontWeight: 800 }}>
                      {n.message}
                    </div>
                  </div>

                  {!n.is_read ? (
                    <span style={{ fontSize: 12, fontWeight: 950, color: "#b45309" }}>
                      NEW
                    </span>
                  ) : null}
                </div>

                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.65, fontWeight: 800 }}>
                  {fmtDateTime(n.created_at)}
                </div>

                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {!n.is_read ? (
                    <button
                      type="button"
                      onClick={() => markAsRead(n.id)}
                      style={{
                        background: "#111827",
                        color: "white",
                        border: "none",
                        padding: "8px 12px",
                        borderRadius: 10,
                        fontWeight: 900,
                        cursor: "pointer",
                      }}
                    >
                      Mark as read
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => router.push("/dashboard/subscription/boost")}
                    style={{
                      background: "#f59e0b",
                      color: "white",
                      border: "none",
                      padding: "8px 12px",
                      borderRadius: 10,
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    Improve visibility
                  </button>

                  <a
                    href={getWhatsAppUrl(n)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={async () => {
                      setRows((prev) =>
                        prev.map((row) =>
                          row.id === n.id ? { ...row, whatsapp_sent: true } : row
                        )
                      );

                      await supabase
                        .from("vendor_notifications")
                        .update({ whatsapp_sent: true })
                        .eq("id", n.id);
                    }}
                    style={{
                      background: n.whatsapp_sent ? "#dcfce7" : "#25D366",
                      color: n.whatsapp_sent ? "#166534" : "white",
                      border: "none",
                      padding: "8px 12px",
                      borderRadius: 10,
                      fontWeight: 900,
                      cursor: "pointer",
                      textDecoration: "none",
                    }}
                  >
                    {n.whatsapp_sent ? "WhatsApp prepared" : "📲 Share on WhatsApp"}
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </Container>
    </main>
  );
}