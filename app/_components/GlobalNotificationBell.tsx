"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

export default function GlobalNotificationBell({
  className = "",
  label = "Alerts",
}: {
  className?: string;
  label?: string;
}) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [count, setCount] = useState(0);

  async function loadCount() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        setCount(0);
        return;
      }

      const { count: unreadCount } = await supabase
        .from("vendor_notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", session.user.id)
        .eq("is_read", false);

      setCount(unreadCount || 0);
    } catch {
      setCount(0);
    }
  }

  useEffect(() => {
    loadCount();

    const timer = window.setInterval(() => {
      loadCount();
    }, 30000);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Link
      href="/dashboard/vendor/notifications"
      className={className}
      title="Open notifications"
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      🔔 {label}
      {count > 0 ? (
        <span
          style={{
            minWidth: 18,
            height: 18,
            padding: "0 5px",
            borderRadius: 999,
            background: "#dc2626",
            color: "white",
            fontSize: 11,
            fontWeight: 950,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
          }}
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}