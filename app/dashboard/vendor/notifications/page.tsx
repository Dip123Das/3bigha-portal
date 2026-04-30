"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { useRouter } from "next/navigation";

export default function VendorNotificationsPage() {
  const supabase = getSupabaseBrowser();
  const router = useRouter();

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user?.id) return;

      const { data, error } = await supabase
        .from("vendor_notifications")
        .select("*")
        .eq("vendor_user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error) setRows(data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>
        🔔 Notifications
      </h1>

      {loading ? (
        <div>Loading...</div>
      ) : rows.length === 0 ? (
        <div>No notifications yet</div>
      ) : (
        rows.map((n) => (
          <div
            key={n.id}
            style={{
              border: "1px solid #ddd",
              padding: 12,
              borderRadius: 10,
              marginTop: 10,
              cursor: "pointer",
            }}
            onClick={() => {
              if (n.rfq_id) {
                router.push(`/dashboard/vendor/rfqs/${n.rfq_id}`);
              }
            }}
          >
            <div style={{ fontWeight: 900 }}>{n.title}</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>{n.message}</div>

            {n.whatsapp_url && (
            <a
                href={n.whatsapp_url}
                target="_blank"
                style={{
                display: "inline-block",
                marginTop: 8,
                background: "#25D366",
                color: "white",
                padding: "6px 10px",
                borderRadius: 6,
                fontWeight: 900,
                textDecoration: "none",
                }}
            >
                📲 Send via WhatsApp
            </a>
            )}
            <div style={{ fontSize: 11, marginTop: 6, opacity: 0.6 }}>
              {new Date(n.created_at).toLocaleString()}
            </div>
          </div>
        ))
      )}
    </div>
  );
}