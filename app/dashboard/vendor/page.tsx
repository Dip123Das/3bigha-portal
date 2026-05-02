"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { resolveAccessForUser, type VendorCapabilityKey } from "@/lib/access/resolveAccess";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ActionButton } from "@/components/ui/ActionButton";
import { Grid } from "@/components/ui/Grid";
import { EmptyState } from "@/components/ui/EmptyState";

type CompletenessRow = {
  user_id?: string;
  business_profile_complete?: boolean;
  is_complete?: boolean;
  completion_percent?: number;
  percent?: number;
};

type EnquiryStatus = "new" | "contacted" | "closed" | "spam" | string;

type PriceIntelligenceStats = {
  totalUpdates: number;
  aiOptimizedCount: number;
  competitiveCount: number;
  overpricedCount: number;
  averageDeviation: number | null;
};

type EnquiryRow = {
  id: string;
  buyer_user_id: string;
  vendor_user_id: string;
  subject_type: string;
  subject_id: string | null;
  buyer_name: string | null;
  buyer_phone: string | null;
  buyer_email: string | null;
  message: string;
  status: EnquiryStatus;
  created_at: string;
};

function getUpsellMessage(plan: string) {
  const p = String(plan || "free").toLowerCase();

  if (p === "free") {
    return {
      show: true,
      text: "You are currently on Free plan. Your visibility is limited in AI vendor matching.",
      highlight: "Upgrade to get more buyer enquiries.",
    };
  }

  if (p === "basic_vendor") {
    return {
      show: true,
      text: "You are getting some visibility, but higher plans rank above you.",
      highlight: "Upgrade to increase your RFQ chances.",
    };
  }

  return { show: false };
}

function toNumber(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function clip(s: string, n = 90) {
  const t = (s ?? "").trim();
  if (t.length <= n) return t;
  return t.slice(0, n - 1) + "…";
}

function titleCase(s: string) {
  const t = (s ?? "").replace(/_/g, " ").trim();
  return t.length ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "warn" | "ok";
}) {
  const base =
    "inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold border";
  const cls =
    tone === "warn"
      ? `${base} border-amber-200 bg-amber-50 text-amber-900`
      : tone === "ok"
      ? `${base} border-emerald-200 bg-emerald-50 text-emerald-900`
      : `${base} border-neutral-200 bg-neutral-50 text-neutral-800`;

  return <span className={cls}>{children}</span>;
}

function StatusPill({ status }: { status: EnquiryStatus }) {
  const s = (status ?? "new").toLowerCase();
  if (s === "new") return <Pill tone="warn">new</Pill>;
  if (s === "contacted") return <Pill>contacted</Pill>;
  if (s === "closed") return <Pill tone="ok">closed</Pill>;
  if (s === "spam") return <Pill>spam</Pill>;
  return <Pill>{s}</Pill>;
}

function capabilityLabel(cap: VendorCapabilityKey) {
  if (cap === "property_owner") return "Property Owner";
  if (cap === "property_builder") return "Property Builder";
  if (cap === "materials") return "Materials";
  if (cap === "services") return "Services";
  if (cap === "rentals") return "Rentals";
  if (cap === "blog_author") return "Blog Author";
  if (cap === "investor") return "Investor";
  return titleCase(String(cap));
}

function getPlanBoostLabel(plan: string, boostPriority: number) {
  const p = String(plan || "free").toLowerCase();

  if (p === "platinum") return "Platinum AI Boost";
  if (p === "gold") return "Gold AI Boost";
  if (p === "silver") return "Silver AI Boost";
  if (boostPriority > 0) return "Manual Boost Active";

  return "Free Visibility";
}

function getPlanBoostPower(plan: string, boostPriority: number) {
  const p = String(plan || "free").toLowerCase();

  if (p === "platinum") return 20 + boostPriority;
  if (p === "gold") return 10 + boostPriority;
  if (p === "silver") return 5 + boostPriority;

  return boostPriority;
}

export default function VendorDashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [email, setEmail] = useState<string | null>(null);

  const [isVendor, setIsVendor] = useState(false);
  const [vendorComplete, setVendorComplete] = useState<boolean | null>(null);
  const [vendorPct, setVendorPct] = useState<number | null>(null);

  const [vendorCapabilities, setVendorCapabilities] = useState<VendorCapabilityKey[]>([]);
    const uniqueVendorCapabilities = useMemo(
    () => Array.from(new Set(vendorCapabilities)),
    [vendorCapabilities]
  );
  const [vendorHasFullAccess, setVendorHasFullAccess] = useState(false);
    const dashboardTitle = vendorHasFullAccess
    ? "Vendor Hub Dashboard"
    : uniqueVendorCapabilities.includes("property_builder") &&
      uniqueVendorCapabilities.length === 1
    ? "Builder Dashboard"
    : uniqueVendorCapabilities.includes("investor") &&
      uniqueVendorCapabilities.length === 1
    ? "Investor Dashboard"
    : "Vendor Dashboard";

  const [enquiriesLoading, setEnquiriesLoading] = useState(false);
  const [enquiriesErr, setEnquiriesErr] = useState<string | null>(null);
  const [recentEnquiries, setRecentEnquiries] = useState<EnquiryRow[]>([]);

  // 🔥 RFQ ANALYTICS
 const [leadStats, setLeadStats] = useState({
  leadsLast7Days: 0,
  leadsLast30Days: 0,
  newLeadCount: 0,
  viewedLeadCount: 0,
  estimatedPremiumLeads: 0,
});

const [successStats, setSuccessStats] = useState({
  totalDeals: 0,
  dealsCompleted: 0,
  successRate: 0,
});

const [funnelStats, setFunnelStats] = useState({
  totalLeads: 0,
  repliedLeads: 0,
});

const [aiTips, setAiTips] = useState<string[]>([]);

const [priceIntelligenceStats, setPriceIntelligenceStats] =
  useState<PriceIntelligenceStats>({
    totalUpdates: 0,
    aiOptimizedCount: 0,
    competitiveCount: 0,
    overpricedCount: 0,
    averageDeviation: null,
  });

const missedLeads = Math.max(
  0,
  (leadStats.leadsLast7Days || 0) - (leadStats.viewedLeadCount || 0)
);

const vendorPerformanceLevel =
  successStats.dealsCompleted >= 10 && successStats.successRate >= 50
    ? "Top Performing Vendor"
    : successStats.dealsCompleted >= 3 && successStats.successRate >= 30
    ? "Trusted Vendor"
    : funnelStats.repliedLeads > 0 || leadStats.viewedLeadCount > 0
    ? "Active Vendor"
    : "New Vendor";

const vendorPerformanceTone =
  vendorPerformanceLevel === "Top Performing Vendor" ||
  vendorPerformanceLevel === "Trusted Vendor"
    ? "ok"
    : vendorPerformanceLevel === "Active Vendor"
    ? "neutral"
    : "warn";

const monetizationIntent =
  funnelStats.totalLeads > funnelStats.repliedLeads
    ? "boost_replies"
    : successStats.successRate < 20
    ? "ai_followups"
    : vendorPerformanceLevel === "Top Performing Vendor"
    ? "premium_maintain"
    : "boost_visibility";

const successCtaLabel =
  monetizationIntent === "boost_replies"
    ? "⚡ Recover Missed Leads"
    : monetizationIntent === "ai_followups"
    ? "🎯 Improve Deal Closing"
    : monetizationIntent === "premium_maintain"
    ? "🏆 Maintain Premium Visibility"
    : "🚀 Boost to Top Vendor";

const dealProgressPercent = Math.min(
  100,
  Math.round((successStats.dealsCompleted / 10) * 100)
);

const successRateProgressPercent = Math.min(
  100,
  Math.round((successStats.successRate / 50) * 100)
);

const topVendorProgressPercent = Math.min(
  100,
  Math.round((dealProgressPercent + successRateProgressPercent) / 2)
);

  // ⭐ BOOST / SUBSCRIPTION VISIBILITY
  const [vendorPlan, setVendorPlan] = useState("free");
  const [vendorStatus, setVendorStatus] = useState("free");
  const [vendorBoostPriority, setVendorBoostPriority] = useState(0);

  const upsell = getUpsellMessage(vendorPlan);

  const hiddenVendorWarning =
    getPlanBoostPower(vendorPlan, vendorBoostPriority) <= 0 &&
    (missedLeads > 0 ||
      priceIntelligenceStats.overpricedCount > 0 ||
      priceIntelligenceStats.totalUpdates === 0);

  async function load() {
    setLoading(true);
    setErr(null);
    setEnquiriesErr(null);

    const { data: s, error: sErr } = await supabase.auth.getSession();
    if (sErr) {
      setErr(sErr.message);
      setVendorCapabilities([]);
      setVendorHasFullAccess(false);
      setLoading(false);
      return;
    }

    const session = s.session;
    if (!session) {
      router.replace("/login?next=/dashboard/vendor");
      return;
    }

    setEmail(session.user.email ?? null);

    const access = await resolveAccessForUser(
      supabase,
      session.user.id,
      session.user.email ?? null
    );

    const v = access.isVendor || access.isHubVendor;
    setIsVendor(v);
    setVendorCapabilities(access.vendorCapabilities);
    setVendorHasFullAccess(access.vendorHasFullAccess);

    if (!v) {
      setVendorComplete(null);
      setVendorPct(null);
      setVendorCapabilities([]);
      setVendorHasFullAccess(false);
      setRecentEnquiries([]);
      setLoading(false);
      return;
    }

    const { data: comp, error: compErr } = await supabase
      .from("v_vendor_profile_completeness")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (!compErr && comp) {
      const row = comp as CompletenessRow;
      const pct = toNumber(row.completion_percent) ?? toNumber(row.percent) ?? null;
      const complete =
        row.business_profile_complete === true || row.is_complete === true;

      setVendorPct(pct);
      setVendorComplete(complete);
    } else {
      setVendorPct(null);
      setVendorComplete(null);
    }

    const { data: businessPlan } = await supabase
      .from("business_profiles")
      .select("subscription_plan,subscription_status,boost_priority")
      .eq("user_id", session.user.id)
      .maybeSingle();

    setVendorPlan(String(businessPlan?.subscription_plan || "free"));
    setVendorStatus(String(businessPlan?.subscription_status || "free"));
    setVendorBoostPriority(Number(businessPlan?.boost_priority || 0));

    const { data: priceRows } = await supabase
      .from("material_price_updates")
      .select("ai_price_deviation_percent")
      .eq("created_by", session.user.id)
      .not("ai_price_deviation_percent", "is", null)
      .limit(50);

    const deviations = (priceRows || [])
      .map((row: { ai_price_deviation_percent: number | string | null }) =>
        Math.abs(Number(row.ai_price_deviation_percent || 0))
      )
      .filter((value) => Number.isFinite(value));

    setPriceIntelligenceStats({
      totalUpdates: deviations.length,
      aiOptimizedCount: deviations.filter((value) => value <= 3).length,
      competitiveCount: deviations.filter((value) => value > 3 && value <= 12).length,
      overpricedCount: deviations.filter((value) => value > 12).length,
      averageDeviation:
        deviations.length > 0
          ? Math.round(
              deviations.reduce((sum, value) => sum + value, 0) / deviations.length
            )
          : null,
    });

    const { data: participantRows } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", session.user.id);

    const conversationIds = (participantRows || [])
      .map((row: { conversation_id: string | null }) => row.conversation_id)
      .filter(Boolean) as string[];

    if (conversationIds.length > 0) {
      const { data: conversationRows } = await supabase
        .from("conversations")
        .select("id,is_closed")
        .in("id", conversationIds);

      const totalDeals = conversationRows?.length || 0;
      const dealsCompleted =
        conversationRows?.filter((row: { is_closed: boolean | null }) => row.is_closed === true)
          .length || 0;

      setSuccessStats({
        totalDeals,
        dealsCompleted,
        successRate: totalDeals > 0 ? Math.round((dealsCompleted / totalDeals) * 100) : 0,
      });

      // 👉 Funnel Logic
      const { data: messageRows } = await supabase
        .from("conversation_messages")
        .select("conversation_id,sender_id")
        .in("conversation_id", conversationIds);

      const repliedConversationSet = new Set(
        (messageRows || [])
          .filter((msg: { sender_id: string }) => msg.sender_id === session.user.id)
          .map((msg: { conversation_id: string }) => msg.conversation_id)
      );

      setFunnelStats({
        totalLeads: totalDeals,
        repliedLeads: repliedConversationSet.size,
      });
    } else {
      setSuccessStats({
        totalDeals: 0,
        dealsCompleted: 0,
        successRate: 0,
      });

      setFunnelStats({
        totalLeads: 0,
        repliedLeads: 0,
      });
    }

    setEnquiriesLoading(true);
    setEnquiriesErr(null);

    const { data: { session: currentSession } } = await supabase.auth.getSession();

    const rfqRes = await fetch("/api/vendor/rfqs?limit=100", {
      headers: {
        Authorization: `Bearer ${currentSession?.access_token}`,
      },
    });

    const rfqJson = await rfqRes.json();

    if (!rfqRes.ok) {
      setEnquiriesErr(rfqJson?.error || "Failed to load RFQs");
      setRecentEnquiries([]);
    } else {
      const rows = rfqJson.rows || [];
      setRecentEnquiries(rows.slice(0, 5));
      setLeadStats(rfqJson.analytics || {});
    }

    setEnquiriesLoading(false);
    setLoading(false);
    }

    useEffect(() => {
      load();

      fetch("/api/ai/vendor-coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stats: {
            leads: 10,
            replies: 5,
            conversion: 2,
          },
        }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d?.tips) setAiTips(d.tips);
        })
        .catch(() => {
          setAiTips([]);
        });

      const refreshTimer = window.setInterval(() => {
        load();
      }, 60000);

      return () => window.clearInterval(refreshTimer);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loading) {
      return (
        <main>
          <Container>
            <SectionHeader title={dashboardTitle} subtitle="Loading..." />
            <div style={{ opacity: 0.8 }}>Preparing your vendor workspace…</div>
          </Container>
        </main>
      );
    }

    if (err) {
      return (
        <main>
          <Container>
            <SectionHeader title={dashboardTitle} subtitle="Something went wrong." />

            <EmptyState message="Something went wrong while loading your vendor dashboard." />

            <div style={{ marginTop: 12, color: "crimson", fontWeight: 800 }}>
              {err}
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <ActionButton href="/dashboard" variant="secondary">
                ← Back to Dashboard
              </ActionButton>

              <button
                type="button"
                onClick={() => load()}
                style={{
                  height: 40,
                  padding: "0 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.12)",
                  background: "white",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Retry
              </button>
            </div>
          </Container>
        </main>
      );
    }

  if (!isVendor) {
    return (
      <main>
        <Container>
          <SectionHeader title={dashboardTitle} subtitle="Vendor access required." />

          <div
          style={{
            marginBottom: 16,
            borderRadius: 18,
            padding: 16,
            border: "1px solid #bbf7d0",
            background: "linear-gradient(135deg, #ecfdf5, #ffffff)",
            boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 950, color: "#064e3b" }}>
            💡 AI Price Intelligence
          </div>

          <div style={{ marginTop: 6, color: "#475569", fontSize: 13, lineHeight: 1.5 }}>
            Your pricing accuracy now affects vendor matching and buyer lead visibility.
          </div>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            <div style={{ border: "1px solid #dcfce7", borderRadius: 14, padding: 12, background: "#fff" }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>AI Optimized</div>
              <div style={{ marginTop: 4, fontSize: 26, fontWeight: 950, color: "#047857" }}>
                {priceIntelligenceStats.aiOptimizedCount}
              </div>
            </div>

            <div style={{ border: "1px solid #dbeafe", borderRadius: 14, padding: 12, background: "#fff" }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>Competitive</div>
              <div style={{ marginTop: 4, fontSize: 26, fontWeight: 950, color: "#1d4ed8" }}>
                {priceIntelligenceStats.competitiveCount}
              </div>
            </div>

            <div style={{ border: "1px solid #fed7aa", borderRadius: 14, padding: 12, background: "#fff7ed" }}>
              <div style={{ fontSize: 12, color: "#9a3412", fontWeight: 900 }}>Needs Correction</div>
              <div style={{ marginTop: 4, fontSize: 26, fontWeight: 950, color: "#c2410c" }}>
                {priceIntelligenceStats.overpricedCount}
              </div>
            </div>

            <div style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 12, background: "#fff" }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>Avg. Deviation</div>
              <div style={{ marginTop: 4, fontSize: 26, fontWeight: 950, color: "#0f172a" }}>
                {priceIntelligenceStats.averageDeviation === null
                  ? "—"
                  : `${priceIntelligenceStats.averageDeviation}%`}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <ActionButton href="/vendor/price-updates/new" variant="primary">
              Update Smart Price →
            </ActionButton>
            <span style={{ color: "#475569", fontSize: 13, alignSelf: "center", fontWeight: 800 }}>
              Keep prices close to AI suggestion to improve ranking.
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <ActionButton href="/dashboard" variant="secondary">
              ← Back
            </ActionButton>

            <ActionButton href="/auth/register-role" variant="primary">
              Start Vendor Registration →
            </ActionButton>
          </div>

          <EmptyState message="You do not currently have vendor access. Start vendor registration to unlock your business dashboard." />

          <div style={{ marginTop: 12, color: "#5b6472", fontSize: 13 }}>
            Signed in as: <b>{email ?? "—"}</b>
          </div>
        </Container>
      </main>
    );
  }

  return (
    <main>
      <Container>
        <SectionHeader
          title={dashboardTitle}
          subtitle="Manage your listings, profile, and business actions from one place."
        />

                {aiTips.length > 0 ? (
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              background: "#f1f5f9",
              borderRadius: 8,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              🤖 AI Growth Suggestions
            </div>

            {aiTips.map((tip, i) => (
              <div key={i} style={{ fontSize: 14 }}>
                • {tip}
              </div>
            ))}
          </div>
        ) : null}

        {hiddenVendorWarning ? (
          <div
            style={{
              marginBottom: 14,
              border: "1px solid #fb7185",
              background: "linear-gradient(135deg, #fff1f2, #ffffff)",
              borderRadius: 18,
              padding: 16,
              boxShadow: "0 12px 28px rgba(190,18,60,0.10)",
            }}
          >
            <div style={{ color: "#be123c", fontWeight: 950, fontSize: 18 }}>
              🚨 You are NOT in Top Vendor Matches
            </div>

            <div
              style={{
                marginTop: 8,
                fontSize: 13,
                color: "#475569",
                fontWeight: 800,
                lineHeight: 1.6,
              }}
            >
              Your current ranking is below visibility threshold. Buyers are mostly seeing AI-optimized and paid vendors before you.
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Badge>
                Current Plan: {vendorPlan.replace(/_/g, " ").toUpperCase()}
              </Badge>
              <Badge>
                AI Boost: +{getPlanBoostPower(vendorPlan, vendorBoostPriority)}
              </Badge>
              <Badge>Missed Leads: {missedLeads}</Badge>
              <Badge>
                Avg Deviation:{" "}
                {priceIntelligenceStats.averageDeviation === null
                  ? "No AI data"
                  : `${priceIntelligenceStats.averageDeviation}%`}
              </Badge>
            </div>

            <div
              style={{
                marginTop: 12,
                padding: 10,
                borderRadius: 12,
                background: "#fff",
                border: "1px dashed #fb7185",
                fontWeight: 900,
                fontSize: 13,
                color: "#7f1d1d",
              }}
            >
              🔒 Your position is locked outside Top 5 matches
            </div>

            <button
              type="button"
              onClick={() =>
                router.push("/dashboard/subscription?focus=boost")
              }
              style={{
                marginTop: 12,
                background: "#be123c",
                color: "#fff",
                border: "none",
                padding: "10px 14px",
                borderRadius: 12,
                fontWeight: 950,
                cursor: "pointer",
              }}
            >
              🔥 Unlock Top Position (Upgrade Now)
            </button>
          </div>
        ) : null}

        {upsell.show ? (
          <div
            style={{
              marginBottom: 14,
              border: "1px solid #fecaca",
              background: "linear-gradient(135deg, #fff1f2, #ffffff)",
              borderRadius: 16,
              padding: 14,
              fontWeight: 800,
            }}
          >
            <div style={{ color: "#b91c1c", fontWeight: 900 }}>
              ⚠️ AI Visibility Alert
            </div>

            <div style={{ marginTop: 6, fontSize: 13, color: "#475569" }}>
              {upsell.text}
            </div>

            <div style={{ marginTop: 6, fontSize: 13, color: "#111827" }}>
              {upsell.highlight}
            </div>

            <button
              type="button"
              onClick={() => router.push("/dashboard/subscription")}
              style={{
                marginTop: 10,
                background: "#dc2626",
                color: "#fff",
                border: "none",
                padding: "8px 12px",
                borderRadius: 10,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              🚀 Upgrade Now
            </button>
          </div>
        ) : null}

        <div
          style={{
            marginBottom: 16,
            borderRadius: 18,
            padding: 16,
            border:
              getPlanBoostPower(vendorPlan, vendorBoostPriority) > 0
                ? "1px solid #f59e0b"
                : "1px solid #e5e7eb",
            background:
              getPlanBoostPower(vendorPlan, vendorBoostPriority) > 0
                ? "linear-gradient(135deg, #fffbeb, #ffffff)"
                : "linear-gradient(135deg, #f8fafc, #ffffff)",
            boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
            fontWeight: 800,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 14,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: 18, fontWeight: 950, color: "#111827" }}>
                ⭐ AI Visibility Boost
              </div>

              <div style={{ marginTop: 6, color: "#475569", fontSize: 13, lineHeight: 1.5 }}>
                {getPlanBoostPower(vendorPlan, vendorBoostPriority) > 0 ? (
                  <>
                    Your account is running <b>{getPlanBoostLabel(vendorPlan, vendorBoostPriority)}</b>.
                    You receive extra ranking power in AI vendor matching.
                  </>
                ) : (
                  <>
                    You are currently on <b>Free Visibility</b>. Upgrade to get higher
                    placement in AI vendor matching and receive more buyer RFQs.
                  </>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push("/dashboard/subscription")}
              style={{
                background: "#f59e0b",
                color: "white",
                border: "none",
                padding: "10px 14px",
                borderRadius: 12,
                fontWeight: 950,
                cursor: "pointer",
                boxShadow: "0 8px 18px rgba(245,158,11,0.28)",
              }}
            >
              💰 Boost My Leads
            </button>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Badge>
              Plan: {vendorPlan.replace(/_/g, " ").toUpperCase()}
            </Badge>
            <Badge>
              Status: {vendorStatus.toUpperCase()}
            </Badge>
            <Badge>
              AI Boost Power: +{getPlanBoostPower(vendorPlan, vendorBoostPriority)}
            </Badge>
            <Badge>
              More visibility = more buyer enquiries
            </Badge>
          </div>
        </div>

        <div
          style={{
            marginBottom: 16,
            borderRadius: 18,
            padding: 16,
            border: "1px solid #bbf7d0",
            background: "linear-gradient(135deg, #ecfdf5, #ffffff)",
            boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 950, color: "#064e3b" }}>
            🏆 Vendor Success Proof
          </div>

          <div style={{ marginTop: 6, color: "#475569", fontSize: 13, lineHeight: 1.5 }}>
            Buyers trust active vendors. Completed deals improve your business proof and help motivate upgrades.
          </div>

          <div style={{ marginTop: 10, fontSize: 13, fontWeight: 900, color: "#334155" }}>
            {successStats.successRate >= 50
              ? "🔥 You are performing better than most vendors."
              : successStats.successRate >= 20
              ? "⚡ You are doing good, but top vendors perform even better."
              : "🚀 Top vendors close 3x more deals. Improve visibility to grow faster."}
          </div>

          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
            <div style={{ border: "1px solid #dcfce7", borderRadius: 14, padding: 12, background: "#fff" }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>Deals Completed</div>
              <div style={{ marginTop: 4, fontSize: 28, fontWeight: 950, color: "#065f46" }}>
                {successStats.dealsCompleted}
              </div>
            </div>

            <div style={{ border: "1px solid #dcfce7", borderRadius: 14, padding: 12, background: "#fff" }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>Success Rate</div>
              <div style={{ marginTop: 4, fontSize: 28, fontWeight: 950, color: "#065f46" }}>
                {successStats.successRate}%
              </div>
            </div>

            <div style={{ border: "1px solid #fed7aa", borderRadius: 14, padding: 12, background: "#fff7ed" }}>
              <div style={{ fontSize: 12, color: "#9a3412", fontWeight: 900 }}>Upgrade Motivation</div>
              <div style={{ marginTop: 4, fontSize: 13, color: "#7c2d12", fontWeight: 850, lineHeight: 1.5 }}>
                Top vendors close 3x more deals with better visibility, faster replies, and AI boost ranking.
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: "#0f172a" }}>
              📊 Lead Conversion Funnel
            </div>

            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 10, background: "#fff" }}>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>Leads Received</div>
                <div style={{ fontSize: 22, fontWeight: 950 }}>{funnelStats.totalLeads}</div>
              </div>

              <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 10, background: "#fff" }}>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>Leads Replied</div>
                <div style={{ fontSize: 22, fontWeight: 950 }}>{funnelStats.repliedLeads}</div>
              </div>

              <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 10, background: "#fff" }}>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>Deals Closed</div>
                <div style={{ fontSize: 22, fontWeight: 950 }}>{successStats.dealsCompleted}</div>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              borderRadius: 14,
              border: "1px solid #bfdbfe",
              background: "#eff6ff",
              padding: 12,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 950, color: "#1e3a8a" }}>
              🤖 AI Business Coach
            </div>

            <div style={{ marginTop: 6, fontSize: 13, fontWeight: 850, color: "#1e40af", lineHeight: 1.5 }}>
              {funnelStats.totalLeads > funnelStats.repliedLeads
                ? "Reply to every buyer lead quickly. Faster replies can improve your deal conversion."
                : successStats.successRate < 20
                ? "You are replying, but deal closure is low. Improve follow-up quality and use AI reply suggestions."
                : successStats.successRate < 50
                ? "Your funnel is active. Boost visibility and faster follow-ups can help you reach top vendor level."
                : "Excellent performance. Keep your visibility active to maintain buyer trust and lead flow."}
            </div>
          </div>

          <div
            style={{
              marginTop: 12,
              borderRadius: 14,
              border: "1px solid #fed7aa",
              background: "linear-gradient(135deg, #fff7ed, #ffffff)",
              padding: 12,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 950, color: "#9a3412" }}>
              🏅 Vendor Leaderboard Benchmark
            </div>

            <div style={{ marginTop: 6, fontSize: 13, fontWeight: 850, color: "#7c2d12", lineHeight: 1.5 }}>
              Top vendors in your area usually close up to 3x more deals by replying faster,
              completing more conversations, and keeping AI visibility active.
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, fontWeight: 900, color: "#9a3412" }}>
                <span>Progress to Top Vendor</span>
                <span>{topVendorProgressPercent}%</span>
              </div>

              <div
                style={{
                  marginTop: 6,
                  height: 10,
                  borderRadius: 999,
                  background: "#ffedd5",
                  overflow: "hidden",
                  border: "1px solid #fed7aa",
                }}
              >
                <div
                  style={{
                    width: `${topVendorProgressPercent}%`,
                    height: "100%",
                    borderRadius: 999,
                    background: "#f97316",
                  }}
                />
              </div>

              <div style={{ marginTop: 6, fontSize: 12, color: "#7c2d12", fontWeight: 800 }}>
                Target: 10+ completed deals and 50% success rate.
              </div>
            </div>

            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
              <div style={{ border: "1px solid #fed7aa", borderRadius: 12, padding: 10, background: "#fff" }}>
                <div style={{ fontSize: 12, color: "#9a3412", fontWeight: 900 }}>Your Level</div>
                <div style={{ marginTop: 4, fontSize: 14, color: "#111827", fontWeight: 950 }}>
                  {vendorPerformanceLevel}
                </div>
              </div>

              <div style={{ border: "1px solid #fed7aa", borderRadius: 12, padding: 10, background: "#fff" }}>
                <div style={{ fontSize: 12, color: "#9a3412", fontWeight: 900 }}>Top Vendor Target</div>
                <div style={{ marginTop: 4, fontSize: 14, color: "#111827", fontWeight: 950 }}>
                  10+ deals / 50% success
                </div>
              </div>

              <div style={{ border: "1px solid #fed7aa", borderRadius: 12, padding: 10, background: "#fff" }}>
                <div style={{ fontSize: 12, color: "#9a3412", fontWeight: 900 }}>Gap</div>
                <div style={{ marginTop: 4, fontSize: 14, color: "#111827", fontWeight: 950 }}>
                  {vendorPerformanceLevel === "Top Performing Vendor"
                    ? "You are at top level"
                    : "Boost replies + close more"}
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 12,
              borderRadius: 14,
              border: "1px solid #e0e7ff",
              background: "#f8faff",
              padding: 12,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 950, color: "#3730a3" }}>
              📈 Smart Growth Indicator
            </div>

            <div style={{ marginTop: 6, fontSize: 13, fontWeight: 850, color: "#1e293b", lineHeight: 1.5 }}>
              {funnelStats.totalLeads > funnelStats.repliedLeads
                ? "🚨 Your biggest growth blocker is slow replies. Fix this first to unlock more deals."
                : successStats.successRate < 30
                ? "⚠️ You are getting leads but not converting enough. Improve follow-ups."
                : successStats.dealsCompleted < 5
                ? "📊 Increase deal volume to build strong trust and ranking."
                : "🔥 You are on a strong growth path. Maintain consistency and visibility."}
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              try {
                await fetch("/api/inbox-ai-action", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "vendor_growth_cta_click",
                    intent: monetizationIntent,
                    dealsCompleted: successStats.dealsCompleted,
                    successRate: successStats.successRate,
                    totalLeads: funnelStats.totalLeads,
                    repliedLeads: funnelStats.repliedLeads,
                  }),
                });
              } catch {}

              if (monetizationIntent === "boost_replies" || monetizationIntent === "boost_visibility") {
                router.push("/dashboard/subscription?focus=boost");
              } else if (monetizationIntent === "ai_followups") {
                router.push("/dashboard/subscription?focus=ai");
              } else {
                router.push("/dashboard/subscription?focus=premium");
              }
            }}
            style={{
              marginTop: 12,
              background: "#059669",
              color: "white",
              border: "none",
              padding: "9px 13px",
              borderRadius: 12,
              fontWeight: 950,
              cursor: "pointer",
            }}
          >
            {successCtaLabel}
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <ActionButton href="/dashboard" variant="secondary">
            ← All Dashboards
          </ActionButton>

          <button
            type="button"
            onClick={() => load()}
            style={{
              height: 40,
              padding: "0 14px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "white",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Refresh
          </button>

          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <Badge>{email ?? "—"}</Badge>

            {vendorHasFullAccess ? (
              <Pill tone="ok">Full Hub Access</Pill>
            ) : uniqueVendorCapabilities.length > 0 ? (
              <Pill>
                {uniqueVendorCapabilities.length} Capability
                {uniqueVendorCapabilities.length > 1 ? "ies" : "y"}
              </Pill>
            ) : null}

            {vendorComplete === true ? (
              <Pill tone="ok">Registration Complete</Pill>
            ) : (
              <Pill tone="warn">Incomplete</Pill>
            )}

            <Pill tone={vendorPerformanceTone as "neutral" | "warn" | "ok"}>
              🛡️ {vendorPerformanceLevel}
            </Pill>

            {vendorPct !== null ? <Pill>{vendorPct}%</Pill> : null}
          </div>
        </div>

        <Card>
          <CardBody>
            <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>
              Your Access
            </div>
            <div style={{ color: "#5b6472", fontSize: 13, lineHeight: 1.5 }}>
              These are the business capabilities currently enabled for your vendor account.
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {uniqueVendorCapabilities.length === 0 ? (
                <Pill tone="warn">No capabilities enabled</Pill>
              ) : (
                uniqueVendorCapabilities.map((cap) => (
                  <Pill key={cap} tone={vendorHasFullAccess ? "ok" : "neutral"}>
                    {capabilityLabel(cap)}
                  </Pill>
                ))
              )}

              {vendorHasFullAccess && uniqueVendorCapabilities.length === 7 ? (
                <Pill tone="ok">3Bigha Full Real Estate Hub</Pill>
              ) : null}
            </div>
          </CardBody>
        </Card>

        <div style={{ height: 12 }} />

        {vendorComplete === false ? (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="font-extrabold text-amber-900">
              Complete your Business Profile to unlock publishing & full vendor features.
            </div>
            <div className="mt-1 text-sm text-amber-900/80">
              You can save drafts, but publishing and some actions remain gated until
              registration is complete.
            </div>
            <div className="mt-3 flex flex-wrap gap-10">
              <ActionButton href="/onboarding/business" variant="primary">
                Complete Business Profile →
              </ActionButton>
              <Link href="/property/my" className="font-extrabold underline">
                Continue managing listings
              </Link>
            </div>
          </div>
        ) : null}

        <div style={{ marginBottom: 12 }}>
          <Card>
            <CardBody>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>
                    Recent Enquiries
                  </div>
                  <div style={{ color: "#5b6472", fontSize: 13, lineHeight: 1.5 }}>
                    Latest buyer enquiries sent to your business. (Last 5)
                  </div>
                </div>

                {enquiriesLoading ? <Pill>Loading…</Pill> : <Pill>{recentEnquiries.length}</Pill>}
              </div>

              {enquiriesErr ? (
                <div style={{ marginTop: 10, color: "crimson", fontWeight: 800 }}>
                  {enquiriesErr}
                </div>
              ) : null}

              {!enquiriesLoading && !enquiriesErr && recentEnquiries.length === 0 ? (
                <div style={{ marginTop: 10, color: "#5b6472", fontSize: 13 }}>
                  No enquiries yet. Once buyers start contacting you, they will appear here.
                </div>
              ) : null}

              {!enquiriesLoading && recentEnquiries.length > 0 ? (
                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  {recentEnquiries.map((e) => (
                    <div
                      key={e.id}
                      style={{
                        border: "1px solid rgba(0,0,0,0.08)",
                        borderRadius: 14,
                        padding: 12,
                        background: "white",
                        display: "flex",
                        gap: 12,
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                          <Pill>{titleCase(e.subject_type)}</Pill>
                          <StatusPill status={e.status} />
                          <Pill>{fmtDateTime(e.created_at)}</Pill>
                        </div>

                        <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 4 }}>
                          From: {e.buyer_name?.trim() ? e.buyer_name : "Buyer"}
                        </div>

                        <div style={{ color: "#5b6472", fontSize: 13, lineHeight: 1.5 }}>
                          {clip(e.message, 120)}
                        </div>

                        <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap" }}>
                          {e.buyer_phone ? <Pill>{e.buyer_phone}</Pill> : null}
                          {e.buyer_email ? <Pill>{e.buyer_email}</Pill> : null}
                        </div>
                      </div>

                      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                        <ActionButton href={`/dashboard/vendor/enquiries?focus=${encodeURIComponent(e.id)}`} variant="secondary">
                          View
                        </ActionButton>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </CardBody>

            <CardFooter>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
                <ActionButton href="/dashboard/vendor/enquiries" variant="primary">
                  Open Enquiries Inbox →
                </ActionButton>
                <span style={{ color: "#5b6472", fontSize: 13, alignSelf: "center" }}>
                  Manage status + reply threads from the inbox.
                </span>
              </div>
            </CardFooter>
          </Card>
        </div>

        {uniqueVendorCapabilities.length === 0 ? (
          <div
            style={{
              marginBottom: 12,
              border: "1px solid #fecaca",
              background: "#fff1f2",
              color: "#881337",
              borderRadius: 14,
              padding: 12,
              fontWeight: 700,
            }}
          >
            No vendor business capabilities are enabled for this account yet. Please contact admin or upgrade your subscription.
          </div>
        ) : null}

        <Card>
          <CardBody>
            <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Quick Actions</div>
            <div style={{ color: "#5b6472", fontSize: 13 }}>
              Jump into your most common tasks.
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
              {uniqueVendorCapabilities.includes("property_owner") ? (
                <ActionButton href="/property/add" variant="primary">
                  Post Property
                </ActionButton>
              ) : null}

              {uniqueVendorCapabilities.includes("property_builder") ? (
                <ActionButton href="/property/builder/projects/add" variant="secondary">
                  Add Builder Project
                </ActionButton>
              ) : null}

              {uniqueVendorCapabilities.includes("materials") ? (
                <ActionButton href="/materials/add" variant="secondary">
                  Add Material
                </ActionButton>
              ) : null}

              {uniqueVendorCapabilities.includes("services") ? (
                <ActionButton href="/services/add" variant="secondary">
                  Add Service
                </ActionButton>
              ) : null}

              {uniqueVendorCapabilities.includes("rentals") ? (
                <ActionButton href="/rentals/add" variant="secondary">
                  Add Rental
                </ActionButton>
              ) : null}

              {uniqueVendorCapabilities.includes("blog_author") ? (
                <ActionButton href="/blog/new" variant="secondary">
                  Write Blog Post
                </ActionButton>
              ) : null}

              {uniqueVendorCapabilities.includes("investor") ? (
              <ActionButton href="/dashboard/investor" variant="secondary">
                Investment Dashboard
              </ActionButton>
            ) : null}

            <ActionButton href="/onboarding/business" variant="secondary">
              Business Profile
            </ActionButton>
            </div>
          </CardBody>
        </Card>

        <div style={{ marginTop: 12 }}>
          <Grid min={280} gap={12}>
            {uniqueVendorCapabilities.includes("property_owner") ? (
              <Card>
                <CardBody>
                  <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Properties</div>
                  <div style={{ color: "#5b6472", fontSize: 13, lineHeight: 1.5 }}>
                    Manage your property listings (draft/pending/approved/rejected) and edits.
                  </div>

                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Pill>My listings</Pill>
                    <Pill>Statuses</Pill>
                    <Pill>Edits</Pill>
                  </div>
                </CardBody>
                <CardFooter>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
                    <ActionButton href="/property/my" variant="primary">
                      Open →
                    </ActionButton>
                    <Link href="/property/my" style={{ fontWeight: 800, alignSelf: "center" }}>
                      /property/my
                    </Link>
                  </div>
                </CardFooter>
              </Card>
            ) : null}

            {uniqueVendorCapabilities.includes("property_builder") ? (
              <Card>
                <CardBody>
                  <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Builder Projects</div>
                  <div style={{ color: "#5b6472", fontSize: 13, lineHeight: 1.5 }}>
                    Manage builder projects, units, inventory and related listing flows.
                  </div>

                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Pill>Projects</Pill>
                    <Pill>Units</Pill>
                    <Pill>Inventory</Pill>
                  </div>
                </CardBody>
                <CardFooter>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
                    <ActionButton href="/property/builder/projects" variant="primary">
                      Open →
                    </ActionButton>
                    <Link href="/property/builder/projects" style={{ fontWeight: 800, alignSelf: "center" }}>
                      /property/builder/projects
                    </Link>
                  </div>
                </CardFooter>
              </Card>
            ) : null}

            {uniqueVendorCapabilities.includes("materials") ? (
              <Card>
                <CardBody>
                  <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Materials</div>
                  <div style={{ color: "#5b6472", fontSize: 13, lineHeight: 1.5 }}>
                    Manage your material listings and keep your catalog up to date.
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Pill>My products</Pill>
                    <Pill>Drafts</Pill>
                    <Pill>Live</Pill>
                  </div>
                </CardBody>
                <CardFooter>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
                    <ActionButton href="/materials/my" variant="primary">
                      Open →
                    </ActionButton>
                    <Link href="/materials/my" style={{ fontWeight: 800, alignSelf: "center" }}>
                      /materials/my
                    </Link>
                  </div>
                </CardFooter>
              </Card>
            ) : null}

            {uniqueVendorCapabilities.includes("services") ? (
              <Card>
                <CardBody>
                  <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Services</div>
                  <div style={{ color: "#5b6472", fontSize: 13, lineHeight: 1.5 }}>
                    Manage service listings, pricing, and provider info.
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Pill>My services</Pill>
                    <Pill>Pricing</Pill>
                    <Pill>Status</Pill>
                  </div>
                </CardBody>
                <CardFooter>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
                    <ActionButton href="/services/my" variant="primary">
                      Open →
                    </ActionButton>
                    <Link href="/services/my" style={{ fontWeight: 800, alignSelf: "center" }}>
                      /services/my
                    </Link>
                  </div>
                </CardFooter>
              </Card>
            ) : null}

            {uniqueVendorCapabilities.includes("rentals") ? (
              <Card>
                <CardBody>
                  <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Rentals</div>
                  <div style={{ color: "#5b6472", fontSize: 13, lineHeight: 1.5 }}>
                    Manage rental listings and availability.
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Pill>My rentals</Pill>
                    <Pill>Rates</Pill>
                    <Pill>Status</Pill>
                  </div>
                </CardBody>
                <CardFooter>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
                    <ActionButton href="/rentals/my" variant="primary">
                      Open →
                    </ActionButton>
                    <Link href="/rentals/my" style={{ fontWeight: 800, alignSelf: "center" }}>
                      /rentals/my
                    </Link>
                  </div>
                </CardFooter>
              </Card>
            ) : null}

            {uniqueVendorCapabilities.includes("blog_author") ? (
              <Card>
                <CardBody>
                  <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Blog / News</div>
                  <div style={{ color: "#5b6472", fontSize: 13, lineHeight: 1.5 }}>
                    Write category-first posts. Drafts are always allowed; publish may be gated.
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Pill>My posts</Pill>
                    <Pill>Drafts</Pill>
                    {vendorComplete === false ? <Pill tone="warn">Publish locked</Pill> : <Pill tone="ok">Publish enabled</Pill>}
                  </div>
                </CardBody>
                <CardFooter>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
                    <ActionButton href="/blog/my" variant="primary">
                      Open →
                    </ActionButton>
                    <Link href="/blog/my" style={{ fontWeight: 800, alignSelf: "center" }}>
                      /blog/my
                    </Link>
                  </div>
                </CardFooter>
              </Card>
            ) : null}

            {uniqueVendorCapabilities.includes("investor") ? (
              <Card>
                <CardBody>
                  <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Investment</div>
                  <div style={{ color: "#5b6472", fontSize: 13, lineHeight: 1.5 }}>
                    Manage your investment opportunities, applications, and deal rooms.
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Pill>Opportunities</Pill>
                    <Pill>Applications</Pill>
                    <Pill>Deal Rooms</Pill>
                  </div>
                </CardBody>
                <CardFooter>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
                    <ActionButton href="/dashboard/investor" variant="primary">
                      Open →
                    </ActionButton>
                    <Link href="/dashboard/investor" style={{ fontWeight: 800, alignSelf: "center" }}>
                      /dashboard/investor
                    </Link>
                  </div>
                </CardFooter>
              </Card>
            ) : null}
          </Grid>
        </div>

        <div style={{ marginTop: 16, opacity: 0.75, fontSize: 13 }}>
          Next after inbox: we can add notifications + buyer enquiry form from listing pages.
        </div>
      </Container>
    </main>
  );
}