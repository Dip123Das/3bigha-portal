"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { resolveAccessForUser, type VendorCapabilityKey } from "@/lib/access/resolveAccess";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Badge } from "@/components/ui/Badge";
import { ActionButton } from "@/components/ui/ActionButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionSkeleton } from "@/components/ui/Skeleton";
import { OperationalErrorState } from "@/components/ui/OperationalErrorState";
import {
  ErpActionCard,
  ErpActionGrid,
  ErpAlertList,
  ErpKpiCard,
  ErpKpiGrid,
  ErpPanel,
} from "@/components/vendor-erp/VendorErpWidgets";
import { VendorErpNav } from "@/components/vendor-erp/VendorErpNav";
import { VendorOperationStream } from "@/components/vendor-erp/VendorOperationStream";
import WorkflowContinuityBar from "@/components/workflow-continuity/WorkflowContinuityBar";
import WorkflowContinuityRecorder from "@/components/workflow-continuity/WorkflowContinuityRecorder";
import OperationalEventStream from "@/components/operational-events/OperationalEventStream";
import OperationalEventRecorder from "@/components/operational-events/OperationalEventRecorder";
import { buildVendorSmartNotifications } from "@/lib/notifications/smart-reengagement";
import GlobalAiOperationalStatus from "@/components/ai-operational/GlobalAiOperationalStatus";
import OperationalRecoveryFeed from "@/components/ai-operational/OperationalRecoveryFeed";
import WorkspaceHome from "@/components/3bos/workspace-home/WorkspaceHome";
import { resolveVendorWorkspaceProjection } from "@/lib/3bos/vendor/resolve-vendor-workspace-projection";
import VendorExecutiveMission from "@/components/3bos/vendor/VendorExecutiveMission";
import VendorHumanFirstWorkCentre from "@/components/3bos/vendor/VendorHumanFirstWorkCentre";
import VendorUnifiedBusinessPulse from "@/components/3bos/vendor/VendorUnifiedBusinessPulse";
import VendorWorkspaceNavigation from "@/components/3bos/vendor/VendorWorkspaceNavigation";

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

const [workspaceTab, setWorkspaceTab] = useState<
  "operations" | "crm" | "listings" | "ai" | "business"
>("operations");

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
    ? "Reply to every buyer lead quickly to improve Ranking and conversion."
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

const vendorSmartNotifications = buildVendorSmartNotifications({
  newLeadCount: leadStats.newLeadCount,
  unreadNotificationCount,
  missedLeads,
  readyDeals: dealStats.ready,
  replyRate,
  estimatedRank,
  growthVisibilityScore,
  priceNeedsCorrection: priceIntelligenceStats.overpricedCount,
});

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
    : "Improve Visibility";

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
    "🚀 Upgrade your plan to unlock higher Visibility and better RFQ routing."
  );
}

if (aiRecommendations.length === 0) {
  aiRecommendations.push(
    "🔥 Strong performance! Maintain pricing accuracy and response speed to dominate rankings."
  );
}

// V1B_CANONICAL_VENDOR_WORKSPACE_PROJECTION
const vendorWorkspaceProjection = resolveVendorWorkspaceProjection({
  dashboardTitle,
  profileComplete: vendorComplete,
  profilePercent: vendorPct,
  activeCapabilities: uniqueVendorCapabilities.map(String),
  newLeadCount: leadStats.newLeadCount,
  unreadConversationCount: recentEnquiries.filter(
    (item) => String(item.status).toLowerCase() === "new"
  ).length,
  missedLeadCount: missedLeads,
  readyDealCount: dealStats.ready,
  unreadAlertCount: unreadNotificationCount,
  priceSignalCount: priceIntelligenceStats.totalUpdates,
  visibilityScore: growthVisibilityScore,
  replyRate,
  closeRate,
  subscriptionPlan: vendorPlan,
  subscriptionStatus: vendorStatus,
  recommendation: aiRecommendations[0] || null,
});


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
      access.isAdmin ||
      access.isVendor ||
      access.isHubVendor ||
      mergedCapabilities.length > 0 ||
      (profileAccess as any)?.business_profile_complete === true ||
      (profileAccess as any)?.is_complete === true ||
      (profileAccess as any)?.registration_complete === true;

    setIsVendor(v);
    setVendorCapabilities(mergedCapabilities);
    setVendorHasFullAccess(access.isAdmin || access.vendorHasFullAccess || mergedCapabilities.length >= 4);

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
            <SectionHeader title={dashboardTitle} subtitle="Preparing your vendor workspace." />
            <SectionSkeleton cards={4} />
          </Container>
        </main>
      );
    }

    if (err) {
      return (
        <main>
          <Container>
            <SectionHeader title={dashboardTitle} subtitle="Unable to load your vendor workspace." />

            <OperationalErrorState
              title="Vendor dashboard could not load"
              message={err}
              onRetry={() => load()}
            />

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
            padding: 12,
            border: "1px solid #bbf7d0",
            background: "#ffffff",
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
            <div style={{ border: "1px solid #dcfce7", borderRadius: 12, padding: 12, background: "#fff" }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>AI Optimized</div>
              <div style={{ marginTop: 4, fontSize: 20, fontWeight: 950, color: "#047857" }}>
                {priceIntelligenceStats.aiOptimizedCount}
              </div>
            </div>

            <div style={{ border: "1px solid #dbeafe", borderRadius: 12, padding: 12, background: "#fff" }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>Competitive</div>
              <div style={{ marginTop: 4, fontSize: 20, fontWeight: 950, color: "#1d4ed8" }}>
                {priceIntelligenceStats.competitiveCount}
              </div>
            </div>

            <div style={{ border: "1px solid #fed7aa", borderRadius: 12, padding: 12, background: "#fff7ed" }}>
              <div style={{ fontSize: 12, color: "#9a3412", fontWeight: 900 }}>Needs Correction</div>
              <div style={{ marginTop: 4, fontSize: 20, fontWeight: 950, color: "#c2410c" }}>
                {priceIntelligenceStats.overpricedCount}
              </div>
            </div>

            <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, background: "#fff" }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>Avg. Deviation</div>
              <div style={{ marginTop: 4, fontSize: 20, fontWeight: 950, color: "#0f172a" }}>
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
            padding: 12,
            border: "1px solid #c7d2fe",
            background: "#ffffff",
            boxShadow: "0 10px 24px rgba(79,70,229,0.08)",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 950, color: "#312e81" }}>
            🏆 Growth Mode Leaderboard
          </div>

          <div style={{ marginTop: 6, color: "#475569", fontSize: 13, fontWeight: 800, lineHeight: 1.5 }}>
            Your Visibility score decides how strongly you appear against competing vendors.
          </div>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            <div style={{ border: "1px solid #e0e7ff", borderRadius: 12, padding: 12, background: "#fff" }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>Visibility Score</div>
              <div style={{ marginTop: 4, fontSize: 18, fontWeight: 950, color: "#4338ca" }}>
                {growthVisibilityScore}/100
              </div>
            </div>

            <div style={{ border: "1px solid #e0e7ff", borderRadius: 12, padding: 12, background: "#fff" }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>Leaderboard Status</div>
              <div style={{ marginTop: 4, fontSize: 16, fontWeight: 950, color: "#111827" }}>
                {leaderboardStatus}
              </div>
            </div>

            <div style={{ border: "1px solid #fed7aa", borderRadius: 12, padding: 12, background: "#fff7ed" }}>
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
            padding: 12,
            border: "1px solid #bbf7d0",
            background: "#ffffff",
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

  // HUMAN_FIRST_VENDOR_DASHBOARD_RETURN
  return (
    <main>
      <span
        hidden
        data-vendor-workspace-projection={vendorWorkspaceProjection.version}
        data-vendor-workspace-readiness={vendorWorkspaceProjection.readiness.score}
        data-vendor-workspace-actions={vendorWorkspaceProjection.workNow.length}
      />
      <WorkflowContinuityRecorder
        state={{
          id: "vendor-dashboard",
          module: "vendor",
          stage: "review",
          title: "Vendor Work Desk",
          summary: "Continue buyer replies, RFQs, inventory, billing and dispatch.",
          href: "/dashboard/vendor",
          primaryActionLabel: "Open Vendor Work Desk",
          updatedAt: Date.now(),
        }}
      />

      <OperationalEventRecorder
        event={{
          id: "vendor-dashboard-opened",
          module: "vendor",
          title: "Vendor work desk opened",
          detail: "Daily vendor work desk opened for buyer replies, RFQs and operations.",
          href: "/dashboard/vendor",
          tone: "info",
          createdAt: Date.now(),
        }}
      />

      <Container>
        {/* V1C1_PROJECTION_DRIVEN_EXECUTIVE_MISSION */}
        <VendorExecutiveMission
          projection={vendorWorkspaceProjection}
        />

        {/* V2_HUMAN_FIRST_WORK_CENTRE */}
        <VendorHumanFirstWorkCentre
          projection={vendorWorkspaceProjection}
        />

        {/* V3_UNIFIED_BUSINESS_PULSE */}
        <VendorUnifiedBusinessPulse
          projection={vendorWorkspaceProjection}
        />

        {/* V4_CANONICAL_WORKSPACE_NAVIGATION */}
        <VendorWorkspaceNavigation
          projection={vendorWorkspaceProjection}
        />

        {/* DS4A_LIVE_BUSINESS_OS_PREVIEW_ENTRY */}
        <section
          aria-label="Business OS preview"
          style={{
            marginBottom: 16,
            border: "1px solid #bfdbfe",
            borderRadius: 18,
            padding: 14,
            background:
              "linear-gradient(135deg, rgba(239,246,255,0.96), rgba(238,242,255,0.96))",
            boxShadow: "0 8px 22px rgba(37,99,235,0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  color: "#1d4ed8",
                  fontSize: 11,
                  fontWeight: 950,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                New Business OS
              </div>
              <div
                style={{
                  marginTop: 4,
                  color: "#0f172a",
                  fontSize: 16,
                  lineHeight: 1.35,
                  fontWeight: 950,
                }}
              >
                Review your new Vendor Business Operating System
              </div>
              <div
                style={{
                  marginTop: 4,
                  maxWidth: 760,
                  color: "#475569",
                  fontSize: 12,
                  lineHeight: 1.5,
                  fontWeight: 700,
                }}
              >
                The present Vendor Dashboard remains unchanged. Open the controlled preview to review the new human-first workspace before final migration.
              </div>
            </div>

            <a
              href="/dashboard/vendor/business-os-preview"
              style={{
                flex: "0 0 auto",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 42,
                padding: "0 15px",
                borderRadius: 12,
                background: "#1767ef",
                color: "#ffffff",
                textDecoration: "none",
                fontSize: 12,
                fontWeight: 950,
                boxShadow: "0 8px 18px rgba(23,103,239,0.22)",
              }}
            >
              Open Business OS Preview
            </a>
          </div>
        </section>

        <WorkspaceHome
          greeting="Your business workspace"
          signals={{
            pendingWorkCount:
              leadStats.newLeadCount,
            unreadConversationCount:
              recentEnquiries.filter(
                (item) =>
                  String(item.status).toLowerCase() ===
                  "new"
              ).length,
            openRequirementCount:
              leadStats.leadsLast30Days,
            activeListingCount:
              priceIntelligenceStats.totalUpdates,
            alertCount:
              missedLeads,
            recentActivity:
              recentEnquiries.slice(0, 5).map(
                (item) => ({
                  id: item.id,
                  label:
                    item.buyer_name ||
                    "Customer enquiry",
                  description:
                    item.message ||
                    "New customer activity",
                  href:
                    "/dashboard/vendor/enquiries",
                  occurredAt:
                    item.created_at,
                  category:
                    item.subject_type,
                })
              ),
            recentActionKeys: [
              "business_overview",
              "requirements",
            ],
            attentionActionKeys:
              missedLeads > 0
                ? ["requirements"]
                : [],
            recommendedActionLimit: 6,
          }}
        />

        <div style={{ marginBottom: 16 }}>
          <GlobalAiOperationalStatus
            battlefieldPulse="active"
            procurementPressure="watch"
            economicStress="stable"
            supplyChainRisk="stable"
            orchestrationState="loaded"
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <OperationalRecoveryFeed />
        </div>

        <section
          style={{
            border: "1px solid #bbf7d0",
            borderRadius: 22,
            padding: 16,
            background: "#f0fdf4",
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 950, color: "#065f46" }}>
            Today’s Action Centre
          </h2>
          <p style={{ marginTop: 6, fontSize: 13, fontWeight: 750, color: "#475569" }}>
            Only the important things that need your attention today.
          </p>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <div style={{ border: "1px solid #dcfce7", borderRadius: 14, padding: 12, background: "#ffffff", fontWeight: 850, color: "#065f46" }}>
              {leadStats.newLeadCount > 0 ? `${leadStats.newLeadCount} new buyer lead(s) need checking.` : "No urgent buyer follow-up pending."}
            </div>
            <div style={{ border: "1px solid #dbeafe", borderRadius: 14, padding: 12, background: "#ffffff", fontWeight: 850, color: "#1e3a8a" }}>
              {dealStats.ready > 0 ? `${dealStats.ready} ready-to-close deal signal(s) found.` : "No ready-to-close deal signal detected yet."}
            </div>
            <div style={{ border: "1px solid #fef3c7", borderRadius: 14, padding: 12, background: "#ffffff", fontWeight: 850, color: "#92400e" }}>
              {missedLeads > 0 ? `${missedLeads} lead(s) may need faster reply.` : "Reply pressure is normal today."}
            </div>
          </div>
        </section>

        <section
          style={{
            border: "1px solid #fed7aa",
            borderRadius: 22,
            padding: 16,
            background: "#fff7ed",
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 950, color: "#9a3412" }}>
            Important Vendor Alerts
          </h2>
          <p style={{ marginTop: 6, fontSize: 13, fontWeight: 750, color: "#475569" }}>
            Simple reminders for replies, visibility and pending vendor work.
          </p>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            <div style={{ border: "1px solid #fed7aa", borderRadius: 16, padding: 12, background: "#ffffff" }}>
              <div style={{ fontWeight: 950, color: "#9a3412" }}>Reply rate</div>
              <div style={{ marginTop: 4, fontSize: 13, fontWeight: 750, color: "#475569" }}>{replyRate}% reply performance.</div>
            </div>
            <div style={{ border: "1px solid #fed7aa", borderRadius: 16, padding: 12, background: "#ffffff" }}>
              <div style={{ fontWeight: 950, color: "#9a3412" }}>Visibility</div>
              <div style={{ marginTop: 4, fontSize: 13, fontWeight: 750, color: "#475569" }}>Profile and activity help buyers find you faster.</div>
            </div>
          </div>
        </section>

        <section
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 22,
            padding: 16,
            background: "#ffffff",
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 950, color: "#0f172a" }}>
            Business Management
          </h2>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
            <div style={{ border: "1px solid #bbf7d0", borderRadius: 16, padding: 12, background: "#f0fdf4" }}>
              <div style={{ fontSize: 12, fontWeight: 850, color: "#047857" }}>Profile</div>
              <div style={{ marginTop: 4, fontSize: 20, fontWeight: 950, color: "#064e3b" }}>
                {vendorComplete ? "Complete" : vendorPct !== null ? `${vendorPct}%` : "Review"}
              </div>
              <div style={{ marginTop: 4, fontSize: 12, fontWeight: 700, color: "#475569" }}>Business profile</div>
            </div>

            <div style={{ border: "1px solid #dbeafe", borderRadius: 16, padding: 12, background: "#eff6ff" }}>
              <div style={{ fontSize: 12, fontWeight: 850, color: "#1d4ed8" }}>Leads</div>
              <div style={{ marginTop: 4, fontSize: 20, fontWeight: 950, color: "#1e3a8a" }}>{leadStats.newLeadCount}</div>
              <div style={{ marginTop: 4, fontSize: 12, fontWeight: 700, color: "#475569" }}>New buyer leads</div>
            </div>

            <div style={{ border: "1px solid #fef3c7", borderRadius: 16, padding: 12, background: "#fffbeb" }}>
              <div style={{ fontSize: 12, fontWeight: 850, color: "#92400e" }}>Replies</div>
              <div style={{ marginTop: 4, fontSize: 20, fontWeight: 950, color: "#78350f" }}>{replyRate}%</div>
              <div style={{ marginTop: 4, fontSize: 12, fontWeight: 700, color: "#475569" }}>Reply rate</div>
            </div>

            <a
              href="/dashboard/subscription"
              style={{
                textDecoration: "none",
                border: "1px solid #e9d5ff",
                borderRadius: 16,
                padding: 12,
                background: "#faf5ff",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 850, color: "#7e22ce" }}>Plan</div>
              <div style={{ marginTop: 4, fontSize: 20, fontWeight: 950, color: "#581c87" }}>{String(vendorPlan || "Free").replace(/_/g, " ")}</div>
              <div style={{ marginTop: 4, fontSize: 12, fontWeight: 700, color: "#475569" }}>Manage vendor plan</div>
            </a>
          </div>
        </section>

        <section
          style={{
            border: "1px solid #e9d5ff",
            borderRadius: 22,
            padding: 16,
            background: "#faf5ff",
            marginBottom: 18,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 950, color: "#581c87" }}>
            Extra Suggestions
          </h2>
          <p style={{ marginTop: 6, fontSize: 13, fontWeight: 750, color: "#475569" }}>
            Use these only after finishing daily work.
          </p>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {aiRecommendations.slice(0, 4).map((rec, i) => (
              <div key={i} style={{ border: "1px solid #e9d5ff", borderRadius: 14, padding: 12, background: "#ffffff", fontSize: 13, fontWeight: 850, color: "#581c87" }}>
                {rec}
              </div>
            ))}
          </div>
        </section>

        <div style={{ marginTop: 10, marginBottom: 24, fontSize: 12, fontWeight: 700, color: "#64748b" }}>
          Daily vendor work simplified for easy business operations.
        </div>
      </Container>
    </main>
  );


}
