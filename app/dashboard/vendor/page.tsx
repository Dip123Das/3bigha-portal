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

type VendorProcurementMemoryGraph = {
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

  if (p === "platinum_vendor" || p === "hub_vendor") return "Platinum AI Boost";
  if (p === "gold_vendor" || p === "premium_vendor") return "Gold AI Boost";
  if (p === "silver_vendor") return "Silver AI Boost";
  if (p === "basic_vendor") return "Basic AI Boost";
  if (boostPriority > 0) return "Manual Boost Active";

  return "Free Visibility";
}

function getPlanBoostPower(plan: string, boostPriority: number) {
  const p = String(plan || "free").toLowerCase();

  if (p === "platinum_vendor" || p === "hub_vendor") return 20 + boostPriority;
  if (p === "gold_vendor" || p === "premium_vendor") return 10 + boostPriority;
  if (p === "silver_vendor") return 5 + boostPriority;
  if (p === "basic_vendor") return 3 + boostPriority;

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

const [dealStats, setDealStats] = useState({
  total: 0,
  ready: 0,
});

const [leaderboardRows, setLeaderboardRows] = useState<any[]>([]);

const [aiTips, setAiTips] = useState<string[]>([]);
const [procurementRecommendation, setProcurementRecommendation] =
  useState<ProcurementRecommendation | null>(null);

const [procurementMemory, setProcurementMemory] =
  useState<VendorProcurementMemoryGraph | null>(null);

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

const replyRate =
  funnelStats.totalLeads > 0
    ? Math.round((funnelStats.repliedLeads / funnelStats.totalLeads) * 100)
    : 0;

const closeRate =
  funnelStats.totalLeads > 0
    ? Math.round((successStats.dealsCompleted / funnelStats.totalLeads) * 100)
    : 0;

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
const [vendorBoostExpiresAt, setVendorBoostExpiresAt] = useState<string | null>(null);

// 🔴 TRUE REAL-TIME RANK TRACKING
const [previousKnownRank, setPreviousKnownRank] = useState<number | null>(null);
const [rankAlert, setRankAlert] = useState<string | null>(null);
const [rankHistorySaved, setRankHistorySaved] = useState(false);
const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
const [rankToast, setRankToast] = useState<string | null>(null);
const [conversionAlert, setConversionAlert] = useState<{
  show: boolean;
  message: string;
} | null>(null);

const [aiRankingBreakdown, setAiRankingBreakdown] = useState({
  replySpeedScore: 0,
  priceScore: 0,
  trustScore: 0,
  boostScore: 0,
});

const upsell = getUpsellMessage(vendorPlan);

const activeBoostPriority =
  vendorBoostExpiresAt && new Date(vendorBoostExpiresAt) < new Date()
    ? 0
    : vendorBoostPriority;

const replySpeedScore = Math.min(
  30,
  funnelStats.totalLeads > 0
    ? Math.round((funnelStats.repliedLeads / funnelStats.totalLeads) * 30)
    : 0
);

const priceScore = Math.min(
  25,
  priceIntelligenceStats.averageDeviation === null
    ? 5
    : Math.max(0, 25 - priceIntelligenceStats.averageDeviation)
);

const trustScore = Math.min(
  25,
  Math.round(topVendorProgressPercent * 0.25)
);

const boostScore = Math.min(
  20,
  getPlanBoostPower(vendorPlan, activeBoostPriority)
);

const dealSignalScore = Math.min(
  25,
  dealStats.ready * 5 // each ready deal boosts visibility
);

const growthVisibilityScore = Math.min(
  100,
  Math.round(
    replySpeedScore +
      priceScore +
      trustScore +
      boostScore +
      dealSignalScore
  )
);

const aiDealLearningScore = Math.min(
  100,
  Math.round(
    replyRate * 0.35 +
      closeRate * 0.35 +
      Math.min(100, dealStats.ready * 12) * 0.2 +
      Math.min(100, growthVisibilityScore) * 0.1
  )
);

const vendorResponseGrade =
  replyRate >= 80
    ? "Excellent"
    : replyRate >= 55
    ? "Good"
    : replyRate >= 25
    ? "Needs faster replies"
    : "Critical";

const aiConversionPrediction =
  aiDealLearningScore >= 80
    ? "High chance to convert serious buyers"
    : aiDealLearningScore >= 55
    ? "Moderate conversion strength"
    : aiDealLearningScore >= 30
    ? "Weak conversion signals"
    : "High lead-loss risk";

const aiNegotiationStyle =
  closeRate >= 40
    ? "Closing-focused"
    : replyRate >= 60
    ? "Responsive but needs stronger follow-up"
    : "Needs faster first response";

const aiVendorLearningAction =
  replyRate < 50
    ? "Reply to every buyer lead quickly to improve AI ranking and conversion."
    : closeRate < 25
    ? "Use AI suggestions in chat to push deals toward final price, delivery and bill confirmation."
    : "Maintain quick replies and keep deal follow-ups active to protect your ranking.";

const leaderboardStatus =
  growthVisibilityScore >= 80
    ? "🔥 Top Vendor Zone"
    : growthVisibilityScore >= 55
    ? "⚡ Rising Vendor"
    : growthVisibilityScore >= 30
    ? "🔵 Visible but Not Leading"
    : "🔒 Low Visibility";

const leaderboardGap =
  growthVisibilityScore >= 80
    ? "You are close to premium leaderboard strength."
    : "Upgrade visibility, improve AI pricing, and reply faster to enter top vendor zone.";

// 🏆 RANK POSITION SYSTEM
const estimatedRank =
  growthVisibilityScore >= 85
    ? 1
    : growthVisibilityScore >= 75
    ? 2
    : growthVisibilityScore >= 65
    ? 3
    : growthVisibilityScore >= 55
    ? 5
    : growthVisibilityScore >= 40
    ? 7
    : growthVisibilityScore >= 25
    ? 10
    : 12;

const rankLabel =
  estimatedRank <= 3
    ? "🥇 Top Vendor"
    : estimatedRank <= 5
    ? "⚡ High Visibility"
    : estimatedRank <= 8
    ? "⚠️ Medium Visibility"
    : "🔒 Low Visibility";

// 🚀 AUTO BOOST ENGINE
const boostedRankEstimate =
  estimatedRank <= 3 ? estimatedRank : Math.max(1, estimatedRank - 4);

const autoBoostMessage =
  estimatedRank <= 3
    ? "You are already near the top. Maintain your boost to protect this position."
    : `Boost now to potentially move from Rank #${estimatedRank} to Rank #${boostedRankEstimate}.`;

const autoBoostCta =
  estimatedRank <= 3
    ? "🏆 Protect Top Position"
    : "🚀 Boost My Rank Now";

// 🔴 TRUE REAL-TIME COMPETITION ALERT
const rankDropDetected =
  previousKnownRank !== null && estimatedRank > previousKnownRank;

const competitionAlertMessage =
  rankAlert ||
  (estimatedRank > 5
    ? "⚡ Competitors in your area are actively improving visibility."
    : "🔥 You are holding a strong position. Competitors may try to overtake you.");

// 🧠 AI RECOMMENDATIONS ENGINE
const aiRecommendations: string[] = [];

if ((priceIntelligenceStats.averageDeviation || 0) > 8) {
  aiRecommendations.push(
    `📉 Your prices are ${priceIntelligenceStats.averageDeviation}% above market. Adjust pricing to improve visibility.`
  );
}

if (priceIntelligenceStats.aiOptimizedCount < 3) {
  aiRecommendations.push(
    "📊 Increase AI-optimized price updates to enter top vendor ranking."
  );
}

if (missedLeads > 3) {
  aiRecommendations.push(
    `📬 You missed ${missedLeads} leads. Faster response increases ranking priority.`
  );
}

if (getPlanBoostPower(vendorPlan, vendorBoostPriority) === 0) {
  aiRecommendations.push(
    "🚀 Upgrade your plan to unlock higher AI visibility and better RFQ routing."
  );
}

if (aiRecommendations.length === 0) {
  aiRecommendations.push(
    "🔥 Strong performance! Maintain pricing accuracy and response speed to dominate rankings."
  );
}

  const hiddenVendorWarning =
    getPlanBoostPower(vendorPlan, vendorBoostPriority) <= 0 &&
    (missedLeads > 0 ||
      priceIntelligenceStats.overpricedCount > 0 ||
      priceIntelligenceStats.totalUpdates === 0);

  const normalizedVendorPlan = String(vendorPlan || "free").toLowerCase();

const vendorHasPremiumAlerts =
  normalizedVendorPlan === "silver_vendor" ||
  normalizedVendorPlan === "gold_vendor" ||
  normalizedVendorPlan === "platinum_vendor" ||
  normalizedVendorPlan === "premium_vendor" ||
  normalizedVendorPlan === "hub_vendor";

const aiDealUpgradeTrigger =
  !vendorHasPremiumAlerts &&
  (missedLeads > 0 ||
    leadStats.newLeadCount > 0 ||
    estimatedRank > 5 ||
    growthVisibilityScore < 55);

const aiDealUpgradeTarget =
  growthVisibilityScore < 35 || estimatedRank > 8 ? "Gold" : "Silver";

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

    const { data: profileAccess } = await supabase
      .from("business_profiles")
      .select("nature_of_business,business_profile_complete,is_complete,registration_complete")
      .eq("user_id", session.user.id)
      .maybeSingle();

    const profileNature = Array.isArray((profileAccess as any)?.nature_of_business)
      ? ((profileAccess as any).nature_of_business as string[])
      : [];

    const profileCapabilities = profileNature
      .map((item) => {
        if (item === "property") return "property_owner";
        if (item === "builder") return "property_builder";
        if (item === "materials") return "materials";
        if (item === "services") return "services";
        if (item === "rentals") return "rentals";
        if (item === "blog") return "blog_author";
        if (item === "investor") return "investor";
        return null;
      })
      .filter(Boolean) as VendorCapabilityKey[];

    const mergedCapabilities = Array.from(
      new Set([...access.vendorCapabilities, ...profileCapabilities])
    );

    const v =
      access.isVendor ||
      access.isHubVendor ||
      mergedCapabilities.length > 0 ||
      (profileAccess as any)?.business_profile_complete === true ||
      (profileAccess as any)?.is_complete === true ||
      (profileAccess as any)?.registration_complete === true;

    setIsVendor(v);
    setVendorCapabilities(mergedCapabilities);
    setVendorHasFullAccess(access.vendorHasFullAccess || mergedCapabilities.length >= 4);

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

    const { count: notificationCount } = await supabase
      .from("vendor_notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.user.id)
      .eq("is_read", false);

    setUnreadNotificationCount(notificationCount || 0);

    const { data: businessPlan } = await supabase
      .from("business_profiles")
      .select("subscription_plan,subscription_status,boost_priority,boost_expires_at")
      .eq("user_id", session.user.id)
      .maybeSingle();

    const boostExpiresAt = businessPlan?.boost_expires_at
      ? String(businessPlan.boost_expires_at)
      : null;

    const boostExpired =
      boostExpiresAt !== null && new Date(boostExpiresAt) < new Date();

    setVendorPlan(String(businessPlan?.subscription_plan || "free"));
    setVendorStatus(String(businessPlan?.subscription_status || "free"));
    setVendorBoostPriority(boostExpired ? 0 : Number(businessPlan?.boost_priority || 0));
    setVendorBoostExpiresAt(boostExpired ? null : boostExpiresAt);

    try {
      const dealStatsRes = await fetch(
        `/api/ai/deal-conversion?vendorUserId=${encodeURIComponent(session.user.id)}`,
        { cache: "no-store" }
      );

      const dealStatsJson = await dealStatsRes.json().catch(() => null);

      if (dealStatsJson?.ok) {
        setDealStats({
          total: Number(dealStatsJson.total || 0),
          ready: Number(dealStatsJson.ready || 0),
        });
      }
    } catch {
      setDealStats({
        total: 0,
        ready: 0,
      });
    }

    try {
      const leaderboardRes = await fetch("/api/vendor/leaderboard", {
        cache: "no-store",
      });

      const leaderboardJson = await leaderboardRes.json().catch(() => null);

      if (leaderboardJson?.ok && Array.isArray(leaderboardJson.rows)) {
        setLeaderboardRows(leaderboardJson.rows.slice(0, 5));
      } else {
        setLeaderboardRows([]);
      }
    } catch {
      setLeaderboardRows([]);
    }

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

    setAiRankingBreakdown({
      replySpeedScore,
      priceScore,
      trustScore,
      boostScore,
    });

    try {
      const recRes = await fetch("/api/ai/procurement-recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          side: "vendor",
          rfqCount: leadStats.leadsLast30Days || recentEnquiries.length || 0,
          activeRfqs: leadStats.newLeadCount || 0,
          vendorCount: 1,
          unreadCount: notificationCount || 0,
          priceTrend:
            priceIntelligenceStats.overpricedCount > 0
              ? "up"
              : priceIntelligenceStats.aiOptimizedCount > 0
              ? "stable"
              : "unknown",
          momentumScore: growthVisibilityScore,
          budgetRisk:
            priceIntelligenceStats.overpricedCount > 0 || estimatedRank > 5
              ? "high"
              : "medium",
        }),
      });

      const recJson = await recRes.json().catch(() => null);

      if (recJson?.ok) {
        setProcurementRecommendation(recJson);
      }

      const memoryRes = await fetch("/api/ai/procurement-memory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          side: "vendor",
          rfqCount: leadStats.leadsLast30Days || recentEnquiries.length || 0,
          vendorCount: 1,
          closedDeals: successStats.dealsCompleted || 0,
          unreadCount: notificationCount || 0,
          avgResponseHours: replyRate >= 80 ? 6 : replyRate >= 50 ? 18 : 48,
          repeatCategoryCount: dealStats.total >= 3 ? 2 : 0,
          priceVariance:
            priceIntelligenceStats.averageDeviation !== null
              ? priceIntelligenceStats.averageDeviation
              : priceIntelligenceStats.overpricedCount > 0
              ? 25
              : 10,
          messages: recentEnquiries.slice(0, 5).map((row: any) => ({
            body: `${row.rfq_no || ""} ${row.module || ""} ${row.message || ""} ${row.status || ""}`,
          })),
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

    setEnquiriesLoading(false);
    setLoading(false);
    }

        useEffect(() => {
      const loadingSafetyTimer = window.setTimeout(() => {
        setLoading(false);
        setEnquiriesLoading(false);
      }, 12000);

      void load()
        .catch((error) => {
          console.error("Vendor dashboard load failed:", error);
          setErr(error?.message || "Vendor dashboard failed to load.");
          setEnquiriesLoading(false);
          setLoading(false);
        })
        .finally(() => {
          window.clearTimeout(loadingSafetyTimer);
        });

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

      const notificationTimer = window.setInterval(async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (!session?.user?.id) return;

          const { count } = await supabase
            .from("vendor_notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", session.user.id)
            .eq("is_read", false);

          setUnreadNotificationCount(count || 0);
        } catch {}
      }, 30000);

      return () => {
        window.clearTimeout(loadingSafetyTimer);
        window.clearInterval(notificationTimer);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      if (loading) return;

      setPreviousKnownRank((prev) => {
        if (prev === null) return estimatedRank;

    if (estimatedRank > prev) {
      const message = `⚠️ Your rank dropped from #${prev} to #${estimatedRank}. A competitor may have improved visibility.`;

      setRankAlert(message);
      setRankToast(message);

      // 🔥 CONVERSION TRIGGER
      if (estimatedRank >= 5) {
        setConversionAlert({
          show: true,
          message: `🚨 You dropped to Rank #${estimatedRank}. Buyers may stop seeing you. Immediate boost recommended.`,
        });
      }

      window.setTimeout(() => setRankToast(null), 7000);
    } else if (estimatedRank < prev) {
      const message = `🔥 Your rank improved from #${prev} to #${estimatedRank}. Keep your visibility active.`;

      setRankAlert(message);
      setRankToast(message);

      window.setTimeout(() => setRankToast(null), 7000);
    }

        return estimatedRank;
      });
    }, [estimatedRank, loading]);

    useEffect(() => {
      if (loading || rankHistorySaved) return;

      async function saveRankHistory() {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (!session?.access_token) return;

          const res = await fetch("/api/vendor/rank-history", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              rank: estimatedRank,
              score: growthVisibilityScore,
            }),
          });

          const json = await res.json().catch(() => null);

          if (json?.alertMessage) {
            setRankAlert(json.alertMessage);
            setRankToast(json.alertMessage);
            window.setTimeout(() => setRankToast(null), 7000);
          }

          setRankHistorySaved(true);
        } catch {
          // Do not block dashboard if backend rank tracking fails.
        }
      }

      saveRankHistory();
    }, [estimatedRank, growthVisibilityScore, loading, rankHistorySaved, supabase]);

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
              <ActionButton href="/dashboard/vendor" variant="secondary">
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

        <div
          style={{
            marginBottom: 16,
            borderRadius: 18,
            padding: 16,
            border: "1px solid #c7d2fe",
            background: "linear-gradient(135deg, #eef2ff, #ffffff)",
            boxShadow: "0 10px 24px rgba(79,70,229,0.08)",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 950, color: "#312e81" }}>
            🏆 Growth Mode Leaderboard
          </div>

          <div style={{ marginTop: 6, color: "#475569", fontSize: 13, fontWeight: 800, lineHeight: 1.5 }}>
            Your AI visibility score decides how strongly you appear against competing vendors.
          </div>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            <div style={{ border: "1px solid #e0e7ff", borderRadius: 14, padding: 12, background: "#fff" }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>Visibility Score</div>
              <div style={{ marginTop: 4, fontSize: 28, fontWeight: 950, color: "#4338ca" }}>
                {growthVisibilityScore}/100
              </div>
            </div>

            <div style={{ border: "1px solid #e0e7ff", borderRadius: 14, padding: 12, background: "#fff" }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>Leaderboard Status</div>
              <div style={{ marginTop: 4, fontSize: 16, fontWeight: 950, color: "#111827" }}>
                {leaderboardStatus}
              </div>
            </div>

            <div style={{ border: "1px solid #fed7aa", borderRadius: 14, padding: 12, background: "#fff7ed" }}>
              <div style={{ fontSize: 12, color: "#9a3412", fontWeight: 900 }}>Growth Gap</div>
              <div style={{ marginTop: 4, fontSize: 13, color: "#7c2d12", fontWeight: 850, lineHeight: 1.5 }}>
                {leaderboardGap}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Badge>🏆 Rank: #{estimatedRank}</Badge>
            <Badge>{rankLabel}</Badge>
            <Badge>AI Optimized Prices: {priceIntelligenceStats.aiOptimizedCount}</Badge>
            <Badge>
              Avg Deviation:{" "}
              {priceIntelligenceStats.averageDeviation === null
                ? "No data"
                : `${priceIntelligenceStats.averageDeviation}%`}
            </Badge>
            <Badge>
              AI Boost: +{getPlanBoostPower(vendorPlan, vendorBoostPriority)}
            </Badge>
          </div>

          <button
            type="button"
            onClick={() => router.push("/dashboard/subscription/boost")}
            style={{
              marginTop: 12,
              background: "#4f46e5",
              color: "#fff",
              border: "none",
              padding: "10px 14px",
              borderRadius: 12,
              fontWeight: 950,
              cursor: "pointer",
            }}
          >
            🏆 Enter Top Vendor Zone
          </button>
        </div>

        <div
          style={{
            marginBottom: 16,
            borderRadius: 18,
            padding: 16,
            border: "1px solid #bbf7d0",
            background: "linear-gradient(135deg, #ecfdf5, #ffffff)",
            boxShadow: "0 10px 24px rgba(16,185,129,0.08)",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 950, color: "#065f46" }}>
            🧠 AI Recommendations
          </div>

          <div style={{ marginTop: 6, color: "#475569", fontSize: 13, fontWeight: 800 }}>
            Based on your current performance, here’s how to improve visibility and leads:
          </div>

          <ul style={{ marginTop: 10, paddingLeft: 18 }}>
            {aiRecommendations.map((rec, i) => (
              <li key={i} style={{ marginBottom: 6, fontSize: 13, fontWeight: 850, color: "#065f46" }}>
                {rec}
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => router.push("/dashboard/subscription?focus=ai")}
            style={{
              marginTop: 12,
              background: "#10b981",
              color: "#fff",
              border: "none",
              padding: "10px 14px",
              borderRadius: 12,
              fontWeight: 950,
              cursor: "pointer",
            }}
          >
            ⚡ Improve My Ranking
          </button>
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
        {conversionAlert?.show ? (
          <div
            style={{
              position: "fixed",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 10000,
              width: "min(420px, 92vw)",
              borderRadius: 20,
              border: "2px solid #dc2626",
              background: "white",
              boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
              padding: 18,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 950, color: "#dc2626" }}>
              🚨 Visibility Drop Detected
            </div>

            <div style={{ marginTop: 10, fontSize: 14, fontWeight: 850, color: "#374151", lineHeight: 1.6 }}>
              {conversionAlert.message}
            </div>

            <div style={{ marginTop: 14, fontSize: 13, color: "#6b7280", fontWeight: 800 }}>
              Vendors above you are getting more buyer leads right now.
            </div>

            <div style={{ marginTop: 16, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => {
                  setConversionAlert(null);
                  router.push("/dashboard/subscription/boost");
                }}
                style={{
                  background: "#dc2626",
                  color: "white",
                  border: "none",
                  padding: "10px 14px",
                  borderRadius: 12,
                  fontWeight: 950,
                  cursor: "pointer",
                }}
              >
                🚀 Boost My Rank Now
              </button>

              <button
                onClick={() => setConversionAlert(null)}
                style={{
                  background: "#f3f4f6",
                  color: "#111827",
                  border: "none",
                  padding: "10px 14px",
                  borderRadius: 12,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Later
              </button>
            </div>
          </div>
        ) : null}
          {rankToast ? (
          <div
            style={{
              position: "fixed",
              right: 18,
              top: 110,
              zIndex: 9999,
              maxWidth: 360,
              borderRadius: 18,
              border: "1px solid #f59e0b",
              background: "linear-gradient(135deg, #fffbeb, #ffffff)",
              boxShadow: "0 20px 45px rgba(15,23,42,0.22)",
              padding: 14,
            }}
          >
            <div style={{ fontWeight: 950, color: "#92400e" }}>
              🔔 Rank Alert
            </div>

            <div style={{ marginTop: 6, fontSize: 13, fontWeight: 850, color: "#475569", lineHeight: 1.5 }}>
              {rankToast}
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => router.push("/dashboard/vendor/notifications")}
                style={{
                  border: "none",
                  borderRadius: 10,
                  background: "#f59e0b",
                  color: "#fff",
                  padding: "8px 10px",
                  fontWeight: 950,
                  cursor: "pointer",
                }}
              >
                View Alerts
              </button>

              <button
                type="button"
                onClick={() => setRankToast(null)}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  background: "#fff",
                  color: "#111827",
                  padding: "8px 10px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
          ) : null}

        <SectionHeader
          title={dashboardTitle}
          subtitle="Your digital business assistant for local commerce."
        />

        <div
          style={{
            marginBottom: 16,
            borderRadius: 22,
            padding: 18,
            border: "1px solid #dbeafe",
            background: "linear-gradient(135deg, #eff6ff, #ffffff)",
            boxShadow: "0 16px 36px rgba(37,99,235,0.10)",
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 950, color: "#0f172a" }}>
            Your Vendor Work Center
          </div>

          <div style={{ marginTop: 6, fontSize: 14, color: "#475569", fontWeight: 800, lineHeight: 1.6 }}>
            Manage buyer enquiries, listings, quotations, messages and business growth from here.
            AI works like power steering — it helps you reply faster, price better and win more leads.
          </div>

          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 10,
            }}
          >
            <div style={{ border: "1px solid #bfdbfe", borderRadius: 16, padding: 12, background: "#fff" }}>
              <div style={{ fontSize: 12, color: "#1d4ed8", fontWeight: 900 }}>New Leads</div>
              <div style={{ marginTop: 4, fontSize: 28, fontWeight: 950, color: "#0f172a" }}>
                {leadStats.newLeadCount}
              </div>
              <div style={{ marginTop: 4, fontSize: 12, color: "#64748b", fontWeight: 800 }}>
                AI helps identify serious buyers.
              </div>
            </div>

            <div style={{ border: "1px solid #bbf7d0", borderRadius: 16, padding: 12, background: "#fff" }}>
              <div style={{ fontSize: 12, color: "#047857", fontWeight: 900 }}>Unread Alerts</div>
              <div style={{ marginTop: 4, fontSize: 28, fontWeight: 950, color: "#0f172a" }}>
                {unreadNotificationCount}
              </div>
              <div style={{ marginTop: 4, fontSize: 12, color: "#64748b", fontWeight: 800 }}>
                AI reminds you about important actions.
              </div>
            </div>

            <div style={{ border: "1px solid #fed7aa", borderRadius: 16, padding: 12, background: "#fff7ed" }}>
              <div style={{ fontSize: 12, color: "#9a3412", fontWeight: 900 }}>Reply Rate</div>
              <div style={{ marginTop: 4, fontSize: 28, fontWeight: 950, color: "#0f172a" }}>
                {replyRate}%
              </div>
              <div style={{ marginTop: 4, fontSize: 12, color: "#7c2d12", fontWeight: 800 }}>
                Faster replies improve conversion.
              </div>
            </div>

            <div style={{ border: "1px solid #e0e7ff", borderRadius: 16, padding: 12, background: "#fff" }}>
              <div style={{ fontSize: 12, color: "#4338ca", fontWeight: 900 }}>Visibility</div>
              <div style={{ marginTop: 4, fontSize: 28, fontWeight: 950, color: "#0f172a" }}>
                {growthVisibilityScore}/100
              </div>
              <div style={{ marginTop: 4, fontSize: 12, color: "#64748b", fontWeight: 800 }}>
                AI helps improve buyer discovery.
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <ActionButton href="/dashboard/vendor/enquiries" variant="primary">
              Open Buyer Enquiries →
            </ActionButton>

            <ActionButton href="/dashboard/inbox-v2" variant="secondary">
              Open Messages
            </ActionButton>

            {uniqueVendorCapabilities.includes("property_owner") ? (
              <ActionButton href="/property/my" variant="secondary">
                Properties
              </ActionButton>
            ) : null}

            {uniqueVendorCapabilities.includes("materials") ? (
              <>
                <ActionButton href="/materials/my" variant="secondary">
                  Materials
                </ActionButton>

                <ActionButton href="/materials/add?inventory=1" variant="secondary">
                  Add Inventory Item
                </ActionButton>

                <ActionButton href="/dashboard/vendor/inventory" variant="secondary">
                  Inventory
                </ActionButton>

                <ActionButton href="/dashboard/vendor/billing" variant="secondary">
                  Billing
                </ActionButton>

                <ActionButton href="/dashboard/vendor/fleet" variant="secondary">
                  Fleet
                </ActionButton>

                <ActionButton href="/dashboard/vendor/dispatch" variant="secondary">
                  Dispatch
                </ActionButton>
              </>
            ) : null}

            {uniqueVendorCapabilities.includes("services") ? (
              <ActionButton href="/services/my" variant="secondary">
                Services
              </ActionButton>
            ) : null}

            {uniqueVendorCapabilities.includes("rentals") ? (
              <ActionButton href="/rentals/my" variant="secondary">
                Rentals
              </ActionButton>
            ) : null}

            <ActionButton href="/onboarding/business" variant="secondary">
              Business Profile
            </ActionButton>
          </div>
        </div>

        <div
          style={{
            marginBottom: 16,
            borderRadius: 22,
            padding: 16,
            border: "1px solid #bbf7d0",
            background: "linear-gradient(135deg, #ecfdf5, #ffffff)",
            boxShadow: "0 14px 34px rgba(16,185,129,0.10)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 950, color: "#064e3b" }}>
                Today’s Business Pulse
              </div>
              <div style={{ marginTop: 4, fontSize: 13, color: "#475569", fontWeight: 800 }}>
                Live work items that need your attention now.
              </div>
            </div>

            <Pill tone={missedLeads > 0 || unreadNotificationCount > 0 ? "warn" : "ok"}>
              {missedLeads > 0 || unreadNotificationCount > 0 ? "Action needed" : "Stable today"}
            </Pill>
          </div>

          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 10,
            }}
          >
            <div style={{ border: "1px solid #bbf7d0", borderRadius: 16, padding: 12, background: "#ffffff" }}>
              <div style={{ fontSize: 12, fontWeight: 950, color: "#047857" }}>Buyer enquiries</div>
              <div style={{ marginTop: 4, fontSize: 26, fontWeight: 950, color: "#0f172a" }}>
                {recentEnquiries.length}
              </div>
              <div style={{ marginTop: 4, fontSize: 12, color: "#64748b", fontWeight: 800 }}>
                Latest enquiries waiting in your business inbox.
              </div>
            </div>

            <div style={{ border: "1px solid #fed7aa", borderRadius: 16, padding: 12, background: "#fff7ed" }}>
              <div style={{ fontSize: 12, fontWeight: 950, color: "#9a3412" }}>Missed follow-ups</div>
              <div style={{ marginTop: 4, fontSize: 26, fontWeight: 950, color: "#0f172a" }}>
                {missedLeads}
              </div>
              <div style={{ marginTop: 4, fontSize: 12, color: "#7c2d12", fontWeight: 800 }}>
                Reply faster to improve lead conversion.
              </div>
            </div>

            <div style={{ border: "1px solid #bfdbfe", borderRadius: 16, padding: 12, background: "#eff6ff" }}>
              <div style={{ fontSize: 12, fontWeight: 950, color: "#1d4ed8" }}>Deal signals</div>
              <div style={{ marginTop: 4, fontSize: 26, fontWeight: 950, color: "#0f172a" }}>
                {dealStats.ready}
              </div>
              <div style={{ marginTop: 4, fontSize: 12, color: "#1e40af", fontWeight: 800 }}>
                Conversations showing ready-to-close activity.
              </div>
            </div>

            <div style={{ border: "1px solid #e0e7ff", borderRadius: 16, padding: 12, background: "#ffffff" }}>
              <div style={{ fontSize: 12, fontWeight: 950, color: "#4338ca" }}>Growth level</div>
              <div style={{ marginTop: 4, fontSize: 16, fontWeight: 950, color: "#0f172a" }}>
                {vendorPerformanceLevel}
              </div>
              <div style={{ marginTop: 4, fontSize: 12, color: "#64748b", fontWeight: 800 }}>
                Based on replies, deals and activity.
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <ActionButton href="/dashboard/vendor/enquiries" variant="primary">
              Reply to Buyers Now →
            </ActionButton>
            <ActionButton href="/dashboard/inbox-v2" variant="secondary">
              Open Live Inbox
            </ActionButton>
            <ActionButton href="/dashboard/subscription/boost" variant="secondary">
              Improve Visibility
            </ActionButton>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <ActionButton href="/dashboard/vendor" variant="secondary">
            ← Vendor Hub
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

          <button
            type="button"
            onClick={() => router.push("/dashboard/vendor/notifications")}
            style={{
              height: 40,
              padding: "0 14px",
              borderRadius: 12,
              border: unreadNotificationCount > 0 ? "1px solid #f59e0b" : "1px solid rgba(0,0,0,0.12)",
              background: unreadNotificationCount > 0 ? "#fffbeb" : "white",
              fontWeight: 950,
              cursor: "pointer",
            }}
          >
            🔔 Notifications {unreadNotificationCount > 0 ? `(${unreadNotificationCount})` : ""}
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

        <details
          style={{
            marginBottom: 12,
            borderRadius: 16,
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            overflow: "hidden",
          }}
        >
          <summary
            style={{
              padding: 12,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 950,
              color: "#334155",
              background: "#f8fafc",
            }}
          >
            Account access & enabled business categories
          </summary>

          <div style={{ padding: 12 }}>
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
          </div>
        </details>

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
                <>
                  <ActionButton href="/materials/add" variant="secondary">
                    Add Material
                  </ActionButton>

                  <ActionButton href="/dashboard/vendor/inventory" variant="secondary">
                    Inventory
                  </ActionButton>

                  <ActionButton href="/dashboard/vendor/billing" variant="secondary">
                    Billing
                  </ActionButton>

                  <ActionButton href="/dashboard/vendor/fleet" variant="secondary">
                    Fleet
                  </ActionButton>

                  <ActionButton href="/dashboard/vendor/dispatch" variant="secondary">
                    Dispatch
                  </ActionButton>
                </>
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

            <div>
              <ActionButton href="/onboarding/business" variant="secondary">
                Business Profile
              </ActionButton>
            </div>
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

                <details
          style={{
            marginBottom: 16,
            borderRadius: 18,
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            overflow: "hidden",
          }}
        >
          <summary
            style={{
              padding: 14,
              cursor: "pointer",
              fontSize: 15,
              fontWeight: 950,
              color: "#0f172a",
              background: "linear-gradient(135deg, #f8fafc, #ffffff)",
            }}
          >
            🤖 Business Growth Assistant — AI help for pricing, replies, visibility and lead conversion
          </summary>

          <div style={{ padding: 14 }}>
            <div
              style={{
                marginBottom: 14,
                padding: 12,
                borderRadius: 16,
                border: "1px solid #e5e7eb",
                background: "#ffffff",
                fontSize: 13,
                fontWeight: 850,
                color: "#475569",
                lineHeight: 1.6,
              }}
            >
              <b style={{ color: "#0f172a" }}>AI Assistance:</b> These are helpers for your daily business —
              better pricing, faster replies, stronger visibility and more buyer leads.
            </div>

                {aiDealUpgradeTrigger ? (
          <div
            style={{
              marginBottom: 14,
              borderRadius: 18,
              padding: 16,
              border: "1px solid #f59e0b",
              background: "linear-gradient(135deg, #fffbeb, #ffffff)",
              boxShadow: "0 14px 30px rgba(245,158,11,0.16)",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 950, color: "#92400e" }}>
              ⚡ AI Deal Upgrade Trigger
            </div>

            <div
              style={{
                marginTop: 8,
                fontSize: 13,
                color: "#475569",
                fontWeight: 850,
                lineHeight: 1.6,
              }}
            >
              AI has detected that your current free/basic visibility may miss serious buyer opportunities.
              Upgrade to <b>{aiDealUpgradeTarget}</b> to unlock stronger alerts, priority lead access,
              and WhatsApp-ready deal notifications.
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Badge>Current Rank: #{estimatedRank}</Badge>
              <Badge>Visibility Score: {growthVisibilityScore}/100</Badge>
              <Badge>Missed Leads: {missedLeads}</Badge>
              <Badge>
                WhatsApp Alerts: {vendorHasPremiumAlerts ? "Unlocked" : "Locked"}
              </Badge>
            </div>

            <button
              type="button"
              onClick={() => router.push("/dashboard/subscription?focus=ai")}
              style={{
                marginTop: 12,
                background: "#f59e0b",
                color: "#fff",
                border: "none",
                padding: "10px 14px",
                borderRadius: 12,
                fontWeight: 950,
                cursor: "pointer",
                boxShadow: "0 8px 18px rgba(245,158,11,0.26)",
              }}
            >
              🔥 Unlock Premium AI Alerts
            </button>
          </div>
        ) : null}

                {procurementMemory ? (
          <div
            style={{
              marginBottom: 14,
              borderRadius: 18,
              padding: 16,
              border: "1px solid #86efac",
              background: "linear-gradient(135deg, #ecfdf5, #ffffff)",
              boxShadow: "0 12px 28px rgba(16,185,129,0.10)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 950, color: "#047857" }}>
                  🧬 Vendor Procurement Memory & Learning Graph
                </div>

                <div style={{ marginTop: 6, fontSize: 13, color: "#475569", fontWeight: 850, lineHeight: 1.5 }}>
                  AI learns from your lead replies, deal closures, price accuracy, buyer response and supplier reliability.
                </div>
              </div>

              <Badge>
                Memory {procurementMemory.memoryScore ?? "—"}/100
              </Badge>
            </div>

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
              <div style={{ border: "1px solid #bbf7d0", borderRadius: 14, padding: 12, background: "#fff" }}>
                <div style={{ fontSize: 12, color: "#047857", fontWeight: 900 }}>Buyer Behavior</div>
                <div style={{ marginTop: 4, fontSize: 14, fontWeight: 950, color: "#111827" }}>
                  {procurementMemory.buyerBehavior || "—"}
                </div>
              </div>

              <div style={{ border: "1px solid #bfdbfe", borderRadius: 14, padding: 12, background: "#eff6ff" }}>
                <div style={{ fontSize: 12, color: "#1d4ed8", fontWeight: 900 }}>Vendor Reliability</div>
                <div style={{ marginTop: 4, fontSize: 14, fontWeight: 950, color: "#1e3a8a" }}>
                  {procurementMemory.vendorReliability || "—"}
                </div>
              </div>

              <div style={{ border: "1px solid #fed7aa", borderRadius: 14, padding: 12, background: "#fff7ed" }}>
                <div style={{ fontSize: 12, color: "#9a3412", fontWeight: 900 }}>Anomaly Signal</div>
                <div style={{ marginTop: 4, fontSize: 14, fontWeight: 950, color: "#7c2d12" }}>
                  {procurementMemory.anomalySignal || "—"}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
              <div style={{ border: "1px solid #bbf7d0", borderRadius: 14, padding: 12, background: "#f0fdf4" }}>
                <div style={{ fontSize: 14, color: "#166534", fontWeight: 950 }}>Negotiation Memory</div>
                <div style={{ marginTop: 6, fontSize: 13, fontWeight: 850, color: "#14532d", lineHeight: 1.5 }}>
                  {procurementMemory.negotiationMemory || "Negotiation memory is collecting lead signals."}
                </div>
              </div>

              <div style={{ border: "1px solid #bfdbfe", borderRadius: 14, padding: 12, background: "#eff6ff" }}>
                <div style={{ fontSize: 14, color: "#1e3a8a", fontWeight: 950 }}>Next Learning Action</div>
                <div style={{ marginTop: 6, fontSize: 13, fontWeight: 850, color: "#1e40af", lineHeight: 1.5 }}>
                  {procurementMemory.nextLearningAction || "Continue collecting buyer, quote, reply and closure signals."}
                </div>
              </div>

              <div style={{ border: "1px solid #e9d5ff", borderRadius: 14, padding: 12, background: "#faf5ff" }}>
                <div style={{ fontSize: 14, color: "#581c87", fontWeight: 950 }}>Supplier Reputation Signal</div>
                <div style={{ marginTop: 6, fontSize: 13, fontWeight: 850, color: "#5b21b6", lineHeight: 1.5 }}>
                  {procurementMemory.supplierReputationSignal || "More supplier performance data needed."}
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
                      borderRadius: 12,
                      padding: 10,
                      background: "#fff",
                    }}
                  >
                    <div style={{ fontWeight: 950, color: "#0f172a" }}>
                      {node.type.replaceAll("_", " ").toUpperCase()}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 13, fontWeight: 800, color: "#475569", lineHeight: 1.5 }}>
                      {node.label}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

                {procurementRecommendation ? (
          <div
            style={{
              marginBottom: 14,
              borderRadius: 18,
              padding: 16,
              border: "1px solid #c4b5fd",
              background: "linear-gradient(135deg, #f5f3ff, #ffffff)",
              boxShadow: "0 12px 28px rgba(124,58,237,0.10)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 950, color: "#5b21b6" }}>
                  🔮 AI Vendor Recommendation & Forecasting
                </div>

                <div style={{ marginTop: 6, fontSize: 13, color: "#475569", fontWeight: 850, lineHeight: 1.5 }}>
                  AI predicts your supplier opportunity, demand signal, conversion strength and next best action.
                </div>
              </div>

              <Badge>
                Score {procurementRecommendation.recommendationScore ?? "—"}/100
              </Badge>
            </div>

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
              <div style={{ border: "1px solid #ddd6fe", borderRadius: 14, padding: 12, background: "#fff" }}>
                <div style={{ fontSize: 12, color: "#6d28d9", fontWeight: 900 }}>Demand Signal</div>
                <div style={{ marginTop: 4, fontSize: 14, fontWeight: 950, color: "#111827" }}>
                  {procurementRecommendation.demandSignal || "—"}
                </div>
              </div>

              <div style={{ border: "1px solid #fed7aa", borderRadius: 14, padding: 12, background: "#fff7ed" }}>
                <div style={{ fontSize: 12, color: "#9a3412", fontWeight: 900 }}>Budget Risk</div>
                <div style={{ marginTop: 4, fontSize: 14, fontWeight: 950, color: "#7c2d12" }}>
                  {procurementRecommendation.budgetRisk || "—"}
                </div>
              </div>

              <div style={{ border: "1px solid #bfdbfe", borderRadius: 14, padding: 12, background: "#eff6ff" }}>
                <div style={{ fontSize: 12, color: "#1d4ed8", fontWeight: 900 }}>AI Source</div>
                <div style={{ marginTop: 4, fontSize: 14, fontWeight: 950, color: "#1e3a8a" }}>
                  {procurementRecommendation.source || "heuristic"}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
              <div style={{ border: "1px solid #bbf7d0", borderRadius: 14, padding: 12, background: "#f0fdf4" }}>
                <div style={{ fontSize: 14, color: "#166534", fontWeight: 950 }}>🎯 AI Next Best Action</div>
                <div style={{ marginTop: 6, fontSize: 13, fontWeight: 850, color: "#14532d", lineHeight: 1.5 }}>
                  {procurementRecommendation.nextAction || "Maintain fast replies and keep pricing updated."}
                </div>
              </div>

              <div style={{ border: "1px solid #bfdbfe", borderRadius: 14, padding: 12, background: "#eff6ff" }}>
                <div style={{ fontSize: 14, color: "#1e3a8a", fontWeight: 950 }}>🏆 Supplier Prediction</div>
                <div style={{ marginTop: 6, fontSize: 13, fontWeight: 850, color: "#1e40af", lineHeight: 1.5 }}>
                  {procurementRecommendation.supplierPrediction || "More vendor performance data needed."}
                </div>
              </div>

              <div style={{ border: "1px solid #e9d5ff", borderRadius: 14, padding: 12, background: "#faf5ff" }}>
                <div style={{ fontSize: 14, color: "#581c87", fontWeight: 950 }}>📈 Conversion Insight</div>
                <div style={{ marginTop: 6, fontSize: 13, fontWeight: 850, color: "#5b21b6", lineHeight: 1.5 }}>
                  {procurementRecommendation.conversionInsight || "More reply and closure data needed."}
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
                      borderRadius: 12,
                      padding: 10,
                      background: "#fff",
                    }}
                  >
                    <div style={{ fontWeight: 950, color: "#0f172a" }}>{card.title}</div>
                    <div style={{ marginTop: 4, fontSize: 13, fontWeight: 800, color: "#475569", lineHeight: 1.5 }}>
                      {card.detail}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {vendorBoostExpiresAt ? (
          <div
            style={{
              marginBottom: 14,
              padding: 12,
              borderRadius: 14,
              background: "linear-gradient(135deg, #ecfdf5, #ffffff)",
              border: "1px solid #bbf7d0",
              fontWeight: 900,
              color: "#065f46",
            }}
          >
            🚀 Boost Active until{" "}
            {new Date(vendorBoostExpiresAt).toLocaleDateString()} — Current AI Boost Power: +
            {getPlanBoostPower(vendorPlan, activeBoostPriority)}
          </div>
        ) : null}

                <div
          style={{
            marginBottom: 14,
            borderRadius: 18,
            padding: 16,
            border: "1px solid #c7d2fe",
            background: "linear-gradient(135deg, #eef2ff, #ffffff)",
            boxShadow: "0 10px 24px rgba(79,70,229,0.08)",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 950, color: "#312e81" }}>
            🏆 AI Vendor Leaderboard
          </div>

          <div style={{ marginTop: 6, fontSize: 13, color: "#475569", fontWeight: 850, lineHeight: 1.5 }}>
            Top vendors are ranked by AI deal signals, ready-to-close conversations, verification and boost strength.
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {leaderboardRows.length > 0 ? (
              leaderboardRows.map((row) => (
                <div
                  key={`${row.vendorUserId}-${row.rank}`}
                  style={{
                    border: "1px solid #e0e7ff",
                    borderRadius: 14,
                    padding: 12,
                    background: "#fff",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 950, color: "#111827" }}>
                      #{row.rank} {row.name}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 12, color: "#475569", fontWeight: 800 }}>
                      {row.locality || row.city || "Local market"} • {row.badge}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Badge>Score: {row.score}</Badge>
                    <Badge>Ready: {row.readySignals}</Badge>
                    <Badge>Total: {row.totalSignals}</Badge>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ fontSize: 13, color: "#64748b", fontWeight: 850 }}>
                Leaderboard will appear after vendors generate AI deal signals.
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => router.push("/dashboard/subscription/boost")}
            style={{
              marginTop: 12,
              background: "#4f46e5",
              color: "#fff",
              border: "none",
              padding: "10px 14px",
              borderRadius: 12,
              fontWeight: 950,
              cursor: "pointer",
            }}
          >
            🚀 Improve My Leaderboard Rank
          </button>
        </div>

        <div
          style={{
            marginBottom: 14,
            borderRadius: 18,
            padding: 16,
            border: "1px solid #bfdbfe",
            background: "linear-gradient(135deg, #eff6ff, #ffffff)",
            boxShadow: "0 10px 24px rgba(37,99,235,0.08)",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 950, color: "#1e3a8a" }}>
            🧠 AI Deal Analytics + Learning Loop
          </div>

          <div style={{ marginTop: 6, fontSize: 13, color: "#475569", fontWeight: 850, lineHeight: 1.5 }}>
            AI learns from your replies, deal signals, closing rate and visibility strength to predict conversion performance.
          </div>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            <div style={{ border: "1px solid #bfdbfe", borderRadius: 14, padding: 12, background: "#fff" }}>
              <div style={{ fontSize: 12, color: "#1d4ed8", fontWeight: 900 }}>
                Learning Score
              </div>
              <div style={{ marginTop: 4, fontSize: 28, fontWeight: 950, color: "#1d4ed8" }}>
                {aiDealLearningScore}/100
              </div>
            </div>

            <div style={{ border: "1px solid #dcfce7", borderRadius: 14, padding: 12, background: "#fff" }}>
              <div style={{ fontSize: 12, color: "#047857", fontWeight: 900 }}>
                Reply Rate
              </div>
              <div style={{ marginTop: 4, fontSize: 28, fontWeight: 950, color: "#047857" }}>
                {replyRate}%
              </div>
            </div>

            <div style={{ border: "1px solid #fed7aa", borderRadius: 14, padding: 12, background: "#fff7ed" }}>
              <div style={{ fontSize: 12, color: "#9a3412", fontWeight: 900 }}>
                Close Rate
              </div>
              <div style={{ marginTop: 4, fontSize: 28, fontWeight: 950, color: "#c2410c" }}>
                {closeRate}%
              </div>
            </div>

            <div style={{ border: "1px solid #e0e7ff", borderRadius: 14, padding: 12, background: "#fff" }}>
              <div style={{ fontSize: 12, color: "#3730a3", fontWeight: 900 }}>
                Response Grade
              </div>
              <div style={{ marginTop: 4, fontSize: 15, fontWeight: 950, color: "#111827" }}>
                {vendorResponseGrade}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 12,
              borderRadius: 14,
              border: "1px solid #bfdbfe",
              background: "#ffffff",
              padding: 12,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 950, color: "#1e3a8a" }}>
              🤖 AI Conversion Prediction
            </div>

            <div style={{ marginTop: 6, fontSize: 13, fontWeight: 850, color: "#1e40af", lineHeight: 1.5 }}>
              {aiConversionPrediction}
            </div>

            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Badge>Style: {aiNegotiationStyle}</Badge>
              <Badge>Ready Signals: {dealStats.ready}</Badge>
              <Badge>Visibility: {growthVisibilityScore}/100</Badge>
            </div>

            <div style={{ marginTop: 8, fontSize: 13, fontWeight: 850, color: "#334155", lineHeight: 1.5 }}>
              Next learning action: {aiVendorLearningAction}
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/dashboard/vendor/enquiries")}
            style={{
              marginTop: 12,
              background: "#2563eb",
              color: "#fff",
              border: "none",
              padding: "10px 14px",
              borderRadius: 12,
              fontWeight: 950,
              cursor: "pointer",
            }}
          >
            🧠 Open Leads and Improve Conversion
          </button>
        </div>

        <div
          style={{
            marginBottom: 14,
            borderRadius: 18,
            padding: 16,
            border: "1px solid #bbf7d0",
            background: "linear-gradient(135deg, #ecfdf5, #ffffff)",
            boxShadow: "0 10px 24px rgba(16,185,129,0.08)",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 950, color: "#065f46" }}>
            📊 AI Deal Performance
          </div>

          <div style={{ marginTop: 6, fontSize: 13, color: "#475569", fontWeight: 850, lineHeight: 1.5 }}>
            AI tracks your deal readiness from buyer conversations. Strong deal signals help improve vendor growth insights.
          </div>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            <div style={{ border: "1px solid #dcfce7", borderRadius: 14, padding: 12, background: "#fff" }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>
                Tracked Deal Events
              </div>
              <div style={{ marginTop: 4, fontSize: 28, fontWeight: 950, color: "#065f46" }}>
                {dealStats.total}
              </div>
            </div>

            <div style={{ border: "1px solid #fed7aa", borderRadius: 14, padding: 12, background: "#fff7ed" }}>
              <div style={{ fontSize: 12, color: "#9a3412", fontWeight: 900 }}>
                Ready-to-Close Signals
              </div>
              <div style={{ marginTop: 4, fontSize: 28, fontWeight: 950, color: "#c2410c" }}>
                {dealStats.ready}
              </div>
            </div>

            <div style={{ border: "1px solid #dbeafe", borderRadius: 14, padding: 12, background: "#fff" }}>
              <div style={{ fontSize: 12, color: "#1d4ed8", fontWeight: 900 }}>
                AI Closing Rate
              </div>
              <div style={{ marginTop: 4, fontSize: 28, fontWeight: 950, color: "#1d4ed8" }}>
                {dealStats.total > 0 ? `${Math.round((dealStats.ready / dealStats.total) * 100)}%` : "—"}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/dashboard/subscription?focus=ai")}
            style={{
              marginTop: 12,
              background: "#059669",
              color: "#fff",
              border: "none",
              padding: "10px 14px",
              borderRadius: 12,
              fontWeight: 950,
              cursor: "pointer",
            }}
          >
            ⚡ Improve AI Deal Closing
          </button>
        </div>

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

        <div
          style={{
            marginBottom: 14,
            borderRadius: 18,
            padding: 16,
            border: "1px solid #c7d2fe",
            background: "linear-gradient(135deg, #eef2ff, #ffffff)",
            boxShadow: "0 10px 24px rgba(79,70,229,0.08)",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 950, color: "#312e81" }}>
            🧠 AI Ranking Optimization
          </div>

          <div style={{ marginTop: 6, fontSize: 13, color: "#475569", fontWeight: 850 }}>
            Your ranking is now calculated from reply speed, pricing accuracy, trust score, and active boost.
          </div>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
            <div style={{ border: "1px solid #e0e7ff", borderRadius: 14, padding: 12, background: "#fff" }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>Reply Speed</div>
              <div style={{ marginTop: 4, fontSize: 24, fontWeight: 950 }}>{aiRankingBreakdown.replySpeedScore}/30</div>
            </div>

            <div style={{ border: "1px solid #e0e7ff", borderRadius: 14, padding: 12, background: "#fff" }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>Price Accuracy</div>
              <div style={{ marginTop: 4, fontSize: 24, fontWeight: 950 }}>{aiRankingBreakdown.priceScore}/25</div>
            </div>

            <div style={{ border: "1px solid #e0e7ff", borderRadius: 14, padding: 12, background: "#fff" }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>Trust Score</div>
              <div style={{ marginTop: 4, fontSize: 24, fontWeight: 950 }}>{aiRankingBreakdown.trustScore}/25</div>
            </div>

            <div style={{ border: "1px solid #fed7aa", borderRadius: 14, padding: 12, background: "#fff7ed" }}>
              <div style={{ fontSize: 12, color: "#9a3412", fontWeight: 900 }}>Boost Power</div>
              <div style={{ marginTop: 4, fontSize: 24, fontWeight: 950 }}>{aiRankingBreakdown.boostScore}/20</div>
            </div>
          </div>
        </div>

        {rankAlert || estimatedRank > 3 ? (
          <div
            style={{
              marginBottom: 14,
              border: "1px solid #f87171",
              background: "linear-gradient(135deg, #fef2f2, #ffffff)",
              borderRadius: 18,
              padding: 14,
              boxShadow: "0 10px 24px rgba(239,68,68,0.10)",
            }}
          >
            <div style={{ fontWeight: 950, color: "#b91c1c", fontSize: 16 }}>
              🔴 Real-Time Competition Alert
            </div>

            <div style={{ marginTop: 6, fontSize: 13, color: "#475569", fontWeight: 850 }}>
              {competitionAlertMessage}
            </div>

            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Badge>Current Rank: #{estimatedRank}</Badge>
              <Badge>Visibility Score: {growthVisibilityScore}</Badge>
            </div>

            <button
              type="button"
              onClick={() => router.push("/dashboard/subscription/boost")}
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
              🚀 Recover My Rank
            </button>
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
                router.push("/dashboard/subscription/boost")
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

        <div
          style={{
            marginBottom: 14,
            border: "1px solid #f59e0b",
            background: "linear-gradient(135deg, #fffbeb, #ffffff)",
            borderRadius: 18,
            padding: 16,
            boxShadow: "0 12px 28px rgba(245,158,11,0.12)",
          }}
        >
          <div style={{ color: "#92400e", fontWeight: 950, fontSize: 18 }}>
            🚀 Auto Boost Recommendation
          </div>

          <div style={{ marginTop: 8, fontSize: 13, color: "#475569", fontWeight: 850, lineHeight: 1.6 }}>
            {autoBoostMessage}
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Badge>Current Rank: #{estimatedRank}</Badge>
            <Badge>After Boost: #{boostedRankEstimate}</Badge>
            <Badge>Visibility Score: {growthVisibilityScore}/100</Badge>
          </div>

          <button
            type="button"
            onClick={() => router.push("/dashboard/subscription/boost")}
            style={{
              marginTop: 12,
              background: "#f59e0b",
              color: "#fff",
              border: "none",
              padding: "10px 14px",
              borderRadius: 12,
              fontWeight: 950,
              cursor: "pointer",
            }}
          >
            {autoBoostCta}
          </button>
        </div>

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
              onClick={() => router.push("/dashboard/subscription/boost")}
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
                router.push("/dashboard/subscription/boost");
              } else if (monetizationIntent === "ai_followups") {
                router.push("/dashboard/subscription/ai");
              } else {
                router.push("/dashboard/subscription/premium");
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
          </div>
        </details>

        <div style={{ marginTop: 16, opacity: 0.75, fontSize: 13 }}>
          Next after inbox: we can add notifications + buyer enquiry form from listing pages.
        </div>
      </Container>
    </main>
  );
}