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

type ProcurementRecommendation = {
  ok?: boolean;
  source?: string;
  recommendationScore?: number;
  demandSignal?: string;
  budgetRisk?: string;
  supplierPrediction?: string;
  recurringProcurementHint?: string;
  conversionInsight?: string;
  nextAction?: string;
  cards?: { title: string; detail: string }[];
};

type ProcurementMemoryGraph = {
  ok?: boolean;
  source?: string;
  memoryScore?: number;
  memoryType?: string;
  buyerBehavior?: string;
  vendorReliability?: string;
  negotiationMemory?: string;
  lifecycleMemory?: string;
  supplierReputationSignal?: string;
  anomalySignal?: string;
  learningSummary?: string;
  graphNodes?: { type: string; label: string }[];
  nextLearningAction?: string;
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

  const [procurementRecommendation, setProcurementRecommendation] =
    useState<ProcurementRecommendation | null>(null);

  const [procurementMemory, setProcurementMemory] =
    useState<ProcurementMemoryGraph | null>(null);

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

        try {
          const rfqCount =
            rfqRes.status === "fulfilled" ? Number(rfqRes.value.count || 0) : 0;
          const conversationCount =
            conversationRes.status === "fulfilled" ? Number(conversationRes.value.count || 0) : 0;
          const unreadCount =
            unreadVendorAlertRes.status === "fulfilled"
              ? Number(unreadVendorAlertRes.value.count || 0)
              : 0;
          const priceSignalCount =
            priceRes.status === "fulfilled" ? Number(priceRes.value.count || 0) : 0;

          const recRes = await fetch("/api/ai/procurement-recommendations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              side: "platform",
              rfqCount,
              activeRfqs: rfqCount,
              vendorCount: Math.max(1, conversationCount),
              unreadCount,
              priceTrend: priceSignalCount > 5 ? "stable" : "unknown",
              momentumScore: Math.min(100, 35 + rfqCount * 6 + conversationCount * 8 + priceSignalCount * 2),
              budgetRisk: unreadCount > 0 ? "high" : "medium",
            }),
          });

          const recJson = await recRes.json().catch(() => null);

          if (recJson?.ok) {
            setProcurementRecommendation(recJson);
          }

          const memoryRes = await fetch("/api/ai/procurement-memory", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              side: "platform",
              rfqCount,
              vendorCount: Math.max(1, conversationCount),
              closedDeals: 0,
              unreadCount,
              avgResponseHours: unreadCount > 0 ? 48 : 18,
              repeatCategoryCount: rfqCount >= 3 ? 2 : 0,
              priceVariance: priceSignalCount > 5 ? 10 : 25,
              messages: [],
            }),
          });

          const memoryJson = await memoryRes.json().catch(() => null);

          if (memoryJson?.ok) {
            setProcurementMemory(memoryJson);
          }
        } catch {
          setProcurementRecommendation(null);
          setProcurementMemory(null);
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

                {procurementRecommendation ? (
          <div
            style={{
              marginTop: 14,
              border: "1px solid rgba(124,58,237,0.25)",
              background: "linear-gradient(135deg, rgba(124,58,237,0.08), #ffffff)",
              borderRadius: 16,
              padding: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 1000, color: "#5b21b6", fontSize: 18 }}>
                  🔮 AI Recommendation & Forecasting Engine
                </div>
                <div style={{ marginTop: 4, color: "#475569", fontSize: 13, fontWeight: 800 }}>
                  Platform-wide supplier prediction, demand signal, budget risk and conversion insight.
                </div>
              </div>

              <div
                style={{
                  background: "#ede9fe",
                  color: "#5b21b6",
                  borderRadius: 999,
                  padding: "8px 12px",
                  fontWeight: 1000,
                  alignSelf: "center",
                }}
              >
                Score {procurementRecommendation.recommendationScore ?? "—"}/100
              </div>
            </div>

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
              {[
                ["Demand", procurementRecommendation.demandSignal || "—", "📈"],
                ["Budget Risk", procurementRecommendation.budgetRisk || "—", "💰"],
                ["Source", procurementRecommendation.source || "heuristic", "🧠"],
              ].map(([label, value, icon]) => (
                <div
                  key={label}
                  style={{
                    border: "1px solid #e2e8f0",
                    background: "#ffffff",
                    borderRadius: 12,
                    padding: 10,
                  }}
                >
                  <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>
                    {icon} {label}
                  </div>
                  <div style={{ marginTop: 5, color: "#0f172a", fontWeight: 1000 }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: 12, padding: 10 }}>
                <div style={{ color: "#1e3a8a", fontWeight: 1000 }}>Best Supplier Prediction</div>
                <div style={{ marginTop: 5, color: "#1e40af", fontSize: 13, fontWeight: 800 }}>
                  {procurementRecommendation.supplierPrediction || "More RFQ/vendor data needed."}
                </div>
              </div>

              <div style={{ border: "1px solid #bbf7d0", background: "#f0fdf4", borderRadius: 12, padding: 10 }}>
                <div style={{ color: "#166534", fontWeight: 1000 }}>AI Next Best Action</div>
                <div style={{ marginTop: 5, color: "#14532d", fontSize: 13, fontWeight: 800 }}>
                  {procurementRecommendation.nextAction || "Create RFQs and monitor procurement signals."}
                </div>
              </div>
            </div>

            {procurementRecommendation.cards?.length ? (
              <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                {procurementRecommendation.cards.map((card) => (
                  <div
                    key={card.title}
                    style={{
                      border: "1px solid rgba(15,23,42,0.08)",
                      background: "#ffffff",
                      borderRadius: 12,
                      padding: 10,
                    }}
                  >
                    <div style={{ fontWeight: 1000, color: "#0f172a" }}>{card.title}</div>
                    <div style={{ marginTop: 4, color: "#475569", fontSize: 13, fontWeight: 800 }}>
                      {card.detail}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        
                {procurementMemory ? (
          <div
            style={{
              marginTop: 14,
              border: "1px solid rgba(16,185,129,0.25)",
              background: "linear-gradient(135deg, rgba(16,185,129,0.08), #ffffff)",
              borderRadius: 16,
              padding: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 1000, color: "#047857", fontSize: 18 }}>
                  🧬 AI Procurement Memory & Learning Graph
                </div>
                <div style={{ marginTop: 4, color: "#475569", fontSize: 13, fontWeight: 800 }}>
                  Platform memory connects RFQs, suppliers, conversations, pricing, closure and anomaly signals.
                </div>
              </div>

              <div
                style={{
                  background: "#dcfce7",
                  color: "#166534",
                  borderRadius: 999,
                  padding: "8px 12px",
                  fontWeight: 1000,
                  alignSelf: "center",
                }}
              >
                Memory Score {procurementMemory.memoryScore ?? "—"}/100
              </div>
            </div>

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
              {[
                ["Buyer Behavior", procurementMemory.buyerBehavior || "—", "🧑‍💼"],
                ["Vendor Reliability", procurementMemory.vendorReliability || "—", "🏆"],
                ["Anomaly", procurementMemory.anomalySignal || "—", "⚠️"],
              ].map(([label, value, icon]) => (
                <div
                  key={label}
                  style={{
                    border: "1px solid #e2e8f0",
                    background: "#ffffff",
                    borderRadius: 12,
                    padding: 10,
                  }}
                >
                  <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>
                    {icon} {label}
                  </div>
                  <div style={{ marginTop: 5, color: "#0f172a", fontWeight: 1000 }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ border: "1px solid #bbf7d0", background: "#f0fdf4", borderRadius: 12, padding: 10 }}>
                <div style={{ color: "#166534", fontWeight: 1000 }}>Learning Summary</div>
                <div style={{ marginTop: 5, color: "#14532d", fontSize: 13, fontWeight: 800 }}>
                  {procurementMemory.learningSummary || "Learning graph is collecting procurement signals."}
                </div>
              </div>

              <div style={{ border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: 12, padding: 10 }}>
                <div style={{ color: "#1e3a8a", fontWeight: 1000 }}>Next Learning Action</div>
                <div style={{ marginTop: 5, color: "#1e40af", fontSize: 13, fontWeight: 800 }}>
                  {procurementMemory.nextLearningAction || "Continue collecting RFQ, chat and closure signals."}
                </div>
              </div>
            </div>

            {procurementMemory.graphNodes?.length ? (
              <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                {procurementMemory.graphNodes.map((node) => (
                  <div
                    key={`${node.type}-${node.label}`}
                    style={{
                      border: "1px solid rgba(15,23,42,0.08)",
                      background: "#ffffff",
                      borderRadius: 12,
                      padding: 10,
                    }}
                  >
                    <div style={{ fontWeight: 1000, color: "#0f172a" }}>
                      {node.type.replaceAll("_", " ").toUpperCase()}
                    </div>
                    <div style={{ marginTop: 4, color: "#475569", fontSize: 13, fontWeight: 800 }}>
                      {node.label}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
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