// app/dashboard/buyer/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ActionButton } from "@/components/ui/ActionButton";
import { Grid } from "@/components/ui/Grid";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionSkeleton } from "@/components/ui/Skeleton";
import { ExecutiveStatGrid } from "@/components/ui/ExecutiveStatGrid";
import { OperationalErrorState } from "@/components/ui/OperationalErrorState";
import { OperationalEmptyState } from "@/components/ui/OperationalEmptyState";
import BuyerWorkMenu from "@/components/buyer/BuyerWorkMenu";
import WorkspaceHome from "@/components/3bos/workspace-home/WorkspaceHome";
import BuyerExecutiveDashboard from "@/components/3bos/buyer/BuyerExecutiveDashboard";
import BuyerDashboardApplicationShell from "@/components/3bos/buyer/BuyerDashboardApplicationShell";

import UniversalDashboardShell from "@/components/operational/UniversalDashboardShell";
import {
  normalizeBehaviorMemory,
  normalizeMemoryList,
} from "@/lib/ai/normalize-memory";

import {
  buildUserIntelligence,
  explainUserRecommendation,
} from "@/lib/ai/user-intelligence";

import {
  buildBehaviorMemory,
  mergeBehaviorSignals,
} from "@/lib/ai/behavior-memory";

import { buildBuyerSmartNotifications } from "@/lib/notifications/smart-reengagement";

import "../buyer-constitutional-dashboard.css";
function readableRfqTitle(r: BuyerRfqMini) {
  const rawTitle = String(r.title || "").trim();
  const moduleName = String(r.module || "Procurement").trim();

  const looksLikeId =
    /^[A-Za-z0-9_-]{14,}$/.test(rawTitle) &&
    !rawTitle.includes(" ");

  if (!rawTitle || looksLikeId) {
    return `${moduleName.charAt(0).toUpperCase()}${moduleName
      .slice(1)
      .toLowerCase()} Requirement`;
  }

  return rawTitle;
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

type BuyerRfqMini = {
  id: string;
  title?: string | null;
  module?: string | null;
  status?: string | null;
  created_at?: string | null;
  needed_by?: string | null;
};

type BuyerProcurementStats = {
  totalRfqs: number;
  activeRfqs: number;
  closedRfqs: number;
  urgentRfqs: number;
  memoryCount: number;
  recentRfqs: BuyerRfqMini[];
};

type BuyerAiInsight = {
  title: string;
  detail: string;
  tone: "ok" | "warn" | "neutral";
  href: string;
  cta: string;
};

type BuyerProcurementRecommendation = {
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

type BuyerProcurementMemoryGraph = {
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

export default function BuyerDashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  const [procurementStats, setProcurementStats] = useState<BuyerProcurementStats>({
    totalRfqs: 0,
    activeRfqs: 0,
    closedRfqs: 0,
    urgentRfqs: 0,
    memoryCount: 0,
    recentRfqs: [],
  });

  const [procurementRecommendation, setProcurementRecommendation] =
    useState<BuyerProcurementRecommendation | null>(null);

  const [procurementMemory, setProcurementMemory] =
    useState<BuyerProcurementMemoryGraph | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);

    const { data: s, error: sErr } = await supabase.auth.getSession();
    if (sErr) {
      setErr(sErr.message);
      setLoading(false);
      return;
    }

    const session = s.session;
    if (!session) {
      router.replace("/login?next=/dashboard/buyer");
      return;
    }

    setEmail(session.user.email ?? null);

    try {
      const { data: rfqs, error: rfqsError } = await supabase
        .from("rfqs")
        .select("id,title,module,status,created_at,needed_by,requester_user_id")
        .eq("requester_user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (rfqsError) {
        throw rfqsError;
      }

      const rows = Array.isArray(rfqs) ? (rfqs as BuyerRfqMini[]) : [];

      let memoryCount = 0;
      try {
        const raw = localStorage.getItem("rfq_procurement_conversation_memory_v1");
        const parsed = raw ? JSON.parse(raw) : [];
        memoryCount = Array.isArray(parsed) ? parsed.length : 0;
      } catch {
        memoryCount = 0;
      }

      const today = new Date();

      const urgentRfqs = rows.filter((x) => {
        if (!x.needed_by) return false;
        const d = new Date(x.needed_by);
        const days = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return days <= 7;
      }).length;

      const closedRfqs = rows.filter((x) => String(x.status || "").toLowerCase() === "closed").length;

      const activeRfqs =
  rows.filter((x) => String(x.status || "").toLowerCase() !== "closed").length;

const closedDeals =
  rows.filter((x) => String(x.status || "").toLowerCase() === "closed").length;

      setProcurementStats({
        totalRfqs: rows.length,
        activeRfqs,
        closedRfqs,
        urgentRfqs,
        memoryCount,
        recentRfqs: rows.slice(0, 5),
      });

      try {
        const recRes = await fetch("/api/ai/procurement-recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            side: "buyer",
            rfqCount: rows.length,
            activeRfqs,
            vendorCount: rows.length,
            unreadCount: urgentRfqs,
            priceTrend: urgentRfqs > 0 ? "up" : "stable",
            momentumScore: Math.min(100, 45 + rows.length * 8 + memoryCount * 5),
            budgetRisk: urgentRfqs > 0 ? "high" : "medium",
          }),
        });

        const recJson = await recRes.json();

        if (recJson?.ok) {
          setProcurementRecommendation(recJson);
        }

        const memoryRes = await fetch("/api/ai/procurement-memory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            side: "buyer",
            rfqCount: rows.length,
            vendorCount: rows.length,
            closedDeals,
            unreadCount: urgentRfqs,
            avgResponseHours: urgentRfqs > 0 ? 48 : 18,
            repeatCategoryCount: memoryCount > 0 || rows.length >= 3 ? 2 : 0,
            priceVariance: urgentRfqs > 0 ? 25 : 10,
            messages: rows.slice(0, 5).map((row) => ({
              body: `${row.title || ""} ${row.module || ""} ${row.status || ""}`,
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
    } catch {
      // Dashboard intelligence should never block dashboard loading.
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

    const procurementHealthScore = Math.max(
    1,
    Math.min(
      100,
      Math.round(
        procurementStats.totalRfqs * 12 +
          procurementStats.activeRfqs * 10 +
          procurementStats.closedRfqs * 16 +
          procurementStats.memoryCount * 8 -
          procurementStats.urgentRfqs * 6
      )
    )
  );

  const procurementHealthTone =
    procurementHealthScore >= 75 ? "ok" : procurementHealthScore >= 45 ? "warn" : "neutral";

  const rfqSuccessPrediction =
    procurementHealthScore >= 75
      ? "High"
      : procurementHealthScore >= 45
        ? "Medium"
        : "Needs RFQ activity";

  const buyerIntelligence = buildUserIntelligence(
    procurementStats.recentRfqs.map((rfq) => ({
      module: rfq.module || "general",
      action: "rfq",
      category: rfq.title || "",
      type: rfq.status || "",
      createdAt: rfq.created_at || "",
    }))
  );

  const buyerIntelligenceSummary =
    explainUserRecommendation(buyerIntelligence);

  const normalizedBuyerPreferredModules = normalizeMemoryList(
    buyerIntelligence.preferredModules
  );

  const normalizedBuyerPreferredLocations = normalizeMemoryList(
    buyerIntelligence.preferredLocations
  );

  const normalizedBuyerPreferredCategories = normalizeMemoryList(
    buyerIntelligence.preferredCategories
  );

  const normalizedBuyerPreferredTypes = normalizeMemoryList(
    buyerIntelligence.preferredTypes
  );

  const normalizedBuyerIntelligenceSummary =
    normalizedBuyerPreferredCategories[0] === "Learning"
      ? `User often explores ${normalizedBuyerPreferredModules[0] || "marketplace activity"}. Intent level: ${buyerIntelligence.intentLabel.toUpperCase()} (${buyerIntelligence.intentScore}/100).`
      : buyerIntelligenceSummary;

  const behaviorMemory = buildBehaviorMemory(
  procurementStats.recentRfqs.map((rfq) => ({
    module: rfq.module || "general",

    action:
      rfq.status === "closed"
        ? "shortlist"
        : "rfq",

    category: rfq.title || "",

    type: rfq.status || "",

    createdAt: rfq.created_at || "",
  }))
);

  const normalizedBehaviorMemory =
  normalizeBehaviorMemory(behaviorMemory);

  const behaviorSignals = mergeBehaviorSignals(
    behaviorMemory,
    {
      module:
        buyerIntelligence.preferredModules[0],

      category:
        buyerIntelligence.preferredCategories[0],

      city:
        buyerIntelligence.preferredLocations[0],
    }
  );

  const buyerSmartNotifications = buildBuyerSmartNotifications({
    totalRfqs: procurementStats.totalRfqs,
    activeRfqs: procurementStats.activeRfqs,
    urgentRfqs: procurementStats.urgentRfqs,
    memoryCount: procurementStats.memoryCount,
    recentRfqs: procurementStats.recentRfqs,
  });


  const buyerAiInsights: BuyerAiInsight[] = [
    {
      title: "Create next procurement RFQ",
      detail:
        procurementStats.totalRfqs === 0
          ? "You have no RFQs yet. Start with the AI Procurement Copilot to get matched vendors faster."
          : "Use the RFQ workspace for structured procurement, vendor discovery and readiness checking.",
      tone: procurementStats.totalRfqs === 0 ? "warn" : "ok",
      href: "/rfq",
      cta: "Open RFQ Workspace",
    },
    {
      title: "Review active procurement decisions",
      detail:
        procurementStats.activeRfqs > 0
          ? `${procurementStats.activeRfqs} active RFQ(s) may need comparison, negotiation or follow-up.`
          : "No active RFQ pressure detected right now.",
      tone: procurementStats.activeRfqs > 0 ? "warn" : "ok",
      href: "/dashboard/buyer/rfqs",
      cta: "Open RFQs",
    },
    {
      title: "Check vendor conversations",
      detail:
        "Continue vendor negotiation from unified chat before closing.",
      tone: "neutral",
      href: "/dashboard/inbox",
      cta: "Open Inbox",
    },
    {
      title: "Reuse procurement memory",
      detail:
        procurementStats.memoryCount > 0
          ? `${procurementStats.memoryCount} procurement memory item(s) found from previous RFQ drafting.`
          : "Procurement memory will grow as you save RFQ drafts and repeat requirements.",
      tone: procurementStats.memoryCount > 0 ? "ok" : "neutral",
      href: "/rfq",
      cta: "Reuse Memory",
    },
  ];

  if (loading) {
    return (
      <UniversalDashboardShell
        eyebrow="Buyer Workspace"
        title="Buyer Dashboard"
        subtitle="Preparing your procurement workspace."
      >
        <SectionSkeleton cards={4} />
      </UniversalDashboardShell>
    );
  }

  if (err) {
    return (
      <UniversalDashboardShell
        eyebrow="Buyer Workspace"
        title="Buyer Dashboard"
        subtitle="Unable to load your procurement workspace."
      >
        <OperationalErrorState
          title="Buyer dashboard could not load"
          message={err}
          onRetry={() => load()}
        />

        <div style={{ marginTop: 12 }}>
          <ActionButton href="/dashboard" variant="secondary">
            ← All Dashboards
          </ActionButton>
        </div>

      </UniversalDashboardShell>
    );
  }

  return (
    <UniversalDashboardShell
      eyebrow="Buyer Operations"
      title="Buyer Work Desk"
      subtitle="Manage requirements, quotations, supplier conversations and buying decisions from one human-first workspace."
      workFirst
    >
      <BuyerDashboardApplicationShell
        email={email}
        totalRequirements={procurementStats.totalRfqs}
        activeRequirements={procurementStats.activeRfqs}
        urgentRequirements={procurementStats.urgentRfqs}
      >
        <BuyerExecutiveDashboard
          totalRfqs={procurementStats.totalRfqs}
          activeRfqs={procurementStats.activeRfqs}
          closedRfqs={procurementStats.closedRfqs}
          urgentRfqs={procurementStats.urgentRfqs}
          memoryCount={procurementStats.memoryCount}
          healthScore={procurementHealthScore}
          successPrediction={rfqSuccessPrediction}
          recentRequirements={procurementStats.recentRfqs.map((rfq) => ({
            id: rfq.id,
            title: readableRfqTitle(rfq),
            status: String(rfq.status || "open"),
            module: String(rfq.module || "Procurement"),
            createdAt: rfq.created_at,
            neededBy: rfq.needed_by,
          }))}
          reminders={buyerSmartNotifications}
          aiSummary={
            procurementRecommendation?.conversionInsight ||
            procurementRecommendation?.supplierPrediction ||
            normalizedBuyerIntelligenceSummary
          }
          aiNextAction={procurementRecommendation?.nextAction}
        />
      </BuyerDashboardApplicationShell>
    </UniversalDashboardShell>
  );
}
