"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import {
  getDefaultPostLoginPath,
  resolveAccessForUser,
} from "@/lib/access/resolveAccess";

type AnalyticsStats = {
  rfqs: number;
  vendorAlerts: number;
  unreadVendorAlerts: number;
  conversations: number;
  priceSignals: number;
  latestRole: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading AI procurement analytics...");
  const [stats, setStats] = useState<AnalyticsStats>({
    rfqs: 0,
    vendorAlerts: 0,
    unreadVendorAlerts: 0,
    conversations: 0,
    priceSignals: 0,
    latestRole: "user",
  });

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const { data: sessionRes, error: sessionErr } =
          await supabase.auth.getSession();

        if (!alive) return;

        if (sessionErr) {
          setMessage(sessionErr.message || "Unable to load session.");
          setLoading(false);
          return;
        }

        const session = sessionRes.session;

        if (!session?.user?.id) {
          router.replace("/login?next=/dashboard");
          return;
        }

        const access = await resolveAccessForUser(
          supabase,
          session.user.id,
          session.user.email ?? null
        );

        const [
          profileRes,
          rfqRes,
          vendorAlertRes,
          unreadVendorAlertRes,
          conversationRes,
          priceRes,
        ] = await Promise.allSettled([
          supabase
            .from("profiles")
            .select("role,requested_role")
            .eq("id", session.user.id)
            .maybeSingle(),

          supabase
            .from("rfqs")
            .select("id", { count: "exact", head: true }),

          supabase
            .from("vendor_notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", session.user.id),

          supabase
            .from("vendor_notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", session.user.id)
            .eq("is_read", false),

          supabase
            .from("conversations")
            .select("id", { count: "exact", head: true })
            .or(`buyer_user_id.eq.${session.user.id},vendor_user_id.eq.${session.user.id}`),

          supabase
            .from("material_price_updates")
            .select("id", { count: "exact", head: true })
            .eq("verified", true),
        ]);

        const profile =
          profileRes.status === "fulfilled" ? profileRes.value.data : null;

        setStats({
          rfqs:
            rfqRes.status === "fulfilled"
              ? Number(rfqRes.value.count || 0)
              : 0,
          vendorAlerts:
            vendorAlertRes.status === "fulfilled"
              ? Number(vendorAlertRes.value.count || 0)
              : 0,
          unreadVendorAlerts:
            unreadVendorAlertRes.status === "fulfilled"
              ? Number(unreadVendorAlertRes.value.count || 0)
              : 0,
          conversations:
            conversationRes.status === "fulfilled"
              ? Number(conversationRes.value.count || 0)
              : 0,
          priceSignals:
            priceRes.status === "fulfilled"
              ? Number(priceRes.value.count || 0)
              : 0,
          latestRole: String(profile?.role || profile?.requested_role || "user"),
        });

        const target = getDefaultPostLoginPath(access);

        if (target && target !== "/dashboard") {
          setMessage(`AI analytics ready. Your default workspace is ${target}.`);
        } else {
          setMessage("AI procurement analytics ready.");
        }

        setLoading(false);
      } catch (e: any) {
        if (!alive) return;
        setMessage(e?.message || "Something went wrong while loading analytics.");
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [router, supabase]);

  const analyticsScore = Math.max(
    1,
    Math.min(
      100,
      Math.round(
        stats.rfqs * 6 +
          stats.conversations * 8 +
          stats.priceSignals * 2 +
          stats.vendorAlerts * 4 -
          stats.unreadVendorAlerts * 3
      )
    )
  );

  const forecast =
    analyticsScore >= 75
      ? "Strong procurement activity detected."
      : analyticsScore >= 45
      ? "Moderate procurement activity. More RFQs and vendor responses will improve intelligence."
      : "Early-stage procurement data. Create RFQs and collect vendor/price signals.";

  return (
    <div className="container pageBody" style={{ paddingTop: 16, paddingBottom: 32 }}>
      <div
        style={{
          border: "1px solid rgba(79,70,229,0.25)",
          background: "linear-gradient(135deg, rgba(79,70,229,0.08), #ffffff)",
          borderRadius: 18,
          padding: 18,
          boxShadow: "0 14px 30px rgba(79,70,229,0.08)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 1000, color: "#3730a3" }}>
              🧠 AI Procurement Analytics & Forecasting Hub
            </div>
            <div style={{ marginTop: 5, color: "#475569", fontSize: 14, fontWeight: 800 }}>
              Unified view of RFQs, conversations, vendor alerts, price intelligence and procurement forecasting.
            </div>
          </div>

          <div
            style={{
              background: analyticsScore >= 75 ? "#dcfce7" : analyticsScore >= 45 ? "#fef3c7" : "#fee2e2",
              color: analyticsScore >= 75 ? "#166534" : analyticsScore >= 45 ? "#92400e" : "#991b1b",
              borderRadius: 999,
              padding: "9px 14px",
              fontWeight: 1000,
              alignSelf: "center",
            }}
          >
            Analytics Score {analyticsScore}/100
          </div>
        </div>

        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10 }}>
          {[
            ["RFQs", stats.rfqs, "📦"],
            ["Conversations", stats.conversations, "💬"],
            ["Vendor Alerts", stats.vendorAlerts, "🔔"],
            ["Unread Alerts", stats.unreadVendorAlerts, "⚡"],
            ["Price Signals", stats.priceSignals, "📈"],
          ].map(([label, value, icon]) => (
            <div key={String(label)} style={{ border: "1px solid #e2e8f0", background: "#ffffff", borderRadius: 14, padding: 12 }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>
                {icon} {label}
              </div>
              <div style={{ marginTop: 5, color: "#0f172a", fontWeight: 1000, fontSize: 22 }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: 12, padding: 12 }}>
            <div style={{ color: "#1e3a8a", fontWeight: 1000 }}>🔮 AI Forecast</div>
            <div style={{ marginTop: 5, color: "#1e40af", fontSize: 13, fontWeight: 800 }}>
              {forecast}
            </div>
          </div>

          <div style={{ border: "1px solid #bbf7d0", background: "#f0fdf4", borderRadius: 12, padding: 12 }}>
            <div style={{ color: "#166534", fontWeight: 1000 }}>🎯 AI Next Best Action</div>
            <div style={{ marginTop: 5, color: "#14532d", fontSize: 13, fontWeight: 800 }}>
              {stats.unreadVendorAlerts > 0
                ? "Clear unread vendor alerts and follow up active procurement threads."
                : "Create or compare RFQs, monitor price trends, and use the AI inbox for execution."}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/dashboard/buyer" className="topBtn topBtnPrimary">
            Buyer Intelligence →
          </Link>
          <Link href="/dashboard/vendor" className="topBtn topBtnGhost">
            Vendor Intelligence →
          </Link>
          <Link href="/dashboard/inbox-v2" className="topBtn topBtnGhost">
            AI Inbox →
          </Link>
          <Link href="/dashboard/buyer/rfqs" className="topBtn topBtnGhost">
            RFQ Command Center →
          </Link>
          <Link href="/price-today" className="topBtn topBtnGhost">
            Predictive Prices →
          </Link>
          <Link href="/rfq/general/new" className="topBtn topBtnGhost">
            + New AI RFQ →
          </Link>
        </div>
      </div>

      <div style={{ marginTop: 14, opacity: 0.75, fontSize: 13 }}>
        {loading ? message : `${message} Current detected role: ${stats.latestRole}.`}
      </div>
    </div>
  );
}