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
      const { data: rfqs } = await supabase
        .from("rfqs")
        .select("id,title,module,status,created_at,needed_by")
        .order("created_at", { ascending: false })
        .limit(20);

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
          : "Use the upgraded RFQ workspace for structured procurement, vendor discovery and AI readiness scoring.",
      tone: procurementStats.totalRfqs === 0 ? "warn" : "ok",
      href: "/rfq/general/new",
      cta: "Open AI RFQ Workspace",
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
        "Continue vendor negotiation from unified chat and use AI deal intelligence before closing.",
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
      href: "/rfq/general/new",
      cta: "Reuse Memory",
    },
  ];

  if (loading) {
    return (
      <main>
        <Container>
          <SectionHeader title="Buyer Dashboard" subtitle="Loading..." />
          <div style={{ opacity: 0.8 }}>Preparing your buyer workspace…</div>
        </Container>
      </main>
    );
  }

  if (err) {
    return (
      <main>
        <Container>
          <SectionHeader title="Buyer Dashboard" subtitle="" />
          <EmptyState message="Something went wrong while loading your buyer dashboard." />
          <div style={{ marginTop: 12, color: "crimson", fontWeight: 800 }}>{err}</div>

          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
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
              Retry
            </button>
          </div>
        </Container>
      </main>
    );
  }

  return (
    <main>
      <Container>
        <SectionHeader
          title="Buyer Dashboard"
          subtitle="Browse, enquire, compare quotes, and continue your conversations with vendors."
        />

        <div
          style={{
            border: "1px solid #fde68a",
            background: "linear-gradient(135deg,#fffbeb,#ffffff)",
            borderRadius: 22,
            padding: 16,
            marginBottom: 18,
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 1000, color: "#92400e" }}>
            🔔 Smart Buyer Alerts
          </div>

          <div style={{ marginTop: 4, color: "#64748b", fontSize: 13, fontWeight: 800 }}>
            Personalized reminders generated from your RFQ and marketplace activity.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 10, marginTop: 12 }}>
            {buyerSmartNotifications.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  border: "1px solid #fef3c7",
                  background: "#ffffff",
                  borderRadius: 16,
                  padding: 12,
                }}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ fontSize: 22 }}>{item.icon}</div>
                  <div>
                    <div style={{ fontWeight: 1000, color: "#0f172a", fontSize: 14 }}>
                      {item.title}
                    </div>
                    <div style={{ marginTop: 4, color: "#64748b", fontSize: 12, lineHeight: 1.45, fontWeight: 750 }}>
                      {item.message}
                    </div>
                    <div style={{ marginTop: 8, color: "#2563eb", fontSize: 12, fontWeight: 950 }}>
                      {item.cta} →
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div
          style={{
            border: "1px solid #dbeafe",
            background: "#f8fbff",
            borderRadius: 24,
            padding: 24,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              fontSize: 30,
              fontWeight: 1000,
              color: "#0f172a",
              marginBottom: 6,
            }}
          >
            Your Buyer Work Center
          </div>

          <div
            style={{
              color: "#475569",
              fontWeight: 700,
              fontSize: 14,
              marginBottom: 22,
            }}
          >
            Manage requirements, compare quotations, continue vendor conversations and complete procurement decisions from one operational workspace.
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
              gap: 14,
              marginBottom: 20,
            }}
          >
            {[
              [
                "Total RFQs",
                procurementStats.totalRfqs,
                "#ffffff",
                "All submitted requirements",
              ],
              [
                "Active RFQs",
                procurementStats.activeRfqs,
                "#eff6ff",
                "Needs review or negotiation",
              ],
              [
                "Closed Deals",
                procurementStats.closedRfqs,
                "#f0fdf4",
                "Completed procurement",
              ],
              [
                "Urgent Actions",
                procurementStats.urgentRfqs,
                "#fffbeb",
                "Requires immediate attention",
              ],
            ].map(([label, value, bg, note]) => (
              <div
                key={String(label)}
                style={{
                  background: String(bg),
                  border: "1px solid rgba(15,23,42,0.06)",
                  borderRadius: 18,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 900,
                    color: "#64748b",
                  }}
                >
                  {label}
                </div>

                <div
                  style={{
                    marginTop: 6,
                    fontSize: 34,
                    fontWeight: 1000,
                    color: "#0f172a",
                  }}
                >
                  {value}
                </div>

                <div
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#64748b",
                  }}
                >
                  {note}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <ActionButton href="/rfq/general/new" variant="primary">
              Submit Requirement →
            </ActionButton>

            <ActionButton href="/dashboard/buyer/rfqs" variant="secondary">
              Compare Quotes
            </ActionButton>

            <ActionButton href="/dashboard/inbox-v2" variant="secondary">
              Unified Inbox
            </ActionButton>

            <ActionButton href="/dashboard/buyer/inbox" variant="secondary">
              Buyer Inbox
            </ActionButton>
          </div>
        </div>

        <div
          style={{
            border: "1px solid #bbf7d0",
            background: "linear-gradient(135deg,#ecfdf5,#ffffff)",
            borderRadius: 24,
            padding: 18,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 1000,
              color: "#064e3b",
            }}
          >
            Today’s Buying Pulse
          </div>

          <div
            style={{
              marginTop: 4,
              color: "#475569",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            Important procurement activity requiring your attention today.
          </div>

          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
              gap: 12,
            }}
          >
            <div
              style={{
                border: "1px solid #bbf7d0",
                borderRadius: 16,
                padding: 14,
                background: "#ffffff",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 900,
                  color: "#047857",
                }}
              >
                Active Requirements
              </div>

              <div
                style={{
                  marginTop: 6,
                  fontSize: 28,
                  fontWeight: 1000,
                  color: "#0f172a",
                }}
              >
                {procurementStats.activeRfqs}
              </div>

              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#64748b",
                }}
              >
                RFQs currently waiting for decisions.
              </div>
            </div>

            <div
              style={{
                border: "1px solid #fed7aa",
                borderRadius: 16,
                padding: 14,
                background: "#fff7ed",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 900,
                  color: "#9a3412",
                }}
              >
                Urgent Follow-up
              </div>

              <div
                style={{
                  marginTop: 6,
                  fontSize: 28,
                  fontWeight: 1000,
                  color: "#0f172a",
                }}
              >
                {procurementStats.urgentRfqs}
              </div>

              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#7c2d12",
                }}
              >
                Compare quotations or contact vendors.
              </div>
            </div>

            <div
              style={{
                border: "1px solid #bfdbfe",
                borderRadius: 16,
                padding: 14,
                background: "#eff6ff",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 900,
                  color: "#1d4ed8",
                }}
              >
                Recent RFQs
              </div>

              <div
                style={{
                  marginTop: 6,
                  fontSize: 28,
                  fontWeight: 1000,
                  color: "#0f172a",
                }}
              >
                {procurementStats.recentRfqs.length}
              </div>

              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#1e40af",
                }}
              >
                Latest procurement activity from your account.
              </div>
            </div>

            <div
              style={{
                border: "1px solid #e0e7ff",
                borderRadius: 16,
                padding: 14,
                background: "#ffffff",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 900,
                  color: "#4338ca",
                }}
              >
                Procurement Memory
              </div>

              <div
                style={{
                  marginTop: 6,
                  fontSize: 28,
                  fontWeight: 1000,
                  color: "#0f172a",
                }}
              >
                {procurementStats.memoryCount}
              </div>

              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#64748b",
                }}
              >
                Saved learning and RFQ behavior insights.
              </div>
            </div>
          </div>
        </div>
        
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <ActionButton href="/dashboard" variant="secondary">
            ← All Dashboards
          </ActionButton>

          <ActionButton href="/" variant="secondary">
            Public Home
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
            <Pill>buyer</Pill>
          </div>
        </div>

        <Grid min={280} gap={12}>
          <Card>
            <CardBody>
              <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Buyer Inbox</div>
              <div style={{ color: "#5b6472", fontSize: 13, lineHeight: 1.5 }}>
                Open your direct listing conversations from Property, Materials, Services and Rentals.
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Pill>listing chat</Pill>
                <Pill>buyer</Pill>
                <Pill>direct</Pill>
              </div>
            </CardBody>
            <CardFooter>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
                <ActionButton href="/dashboard/buyer/inbox" variant="primary">
                  Open Buyer Inbox →
                </ActionButton>
                <Link href="/dashboard/buyer/inbox" style={{ fontWeight: 800, alignSelf: "center" }}>
                  /dashboard/buyer/inbox
                </Link>
              </div>
            </CardFooter>
          </Card>

          <Card>
            <CardBody>
              <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Unified Inbox</div>
              <div style={{ color: "#5b6472", fontSize: 13, lineHeight: 1.5 }}>
                Open buyer and vendor side inbox access from one common place.
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Pill>buyer</Pill>
                <Pill>vendor</Pill>
                <Pill>unified</Pill>
              </div>
            </CardBody>
            <CardFooter>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
                <ActionButton href="/dashboard/inbox" variant="primary">
                  Open Unified Inbox →
                </ActionButton>
                <Link href="/dashboard/inbox" style={{ fontWeight: 800, alignSelf: "center" }}>
                  /dashboard/inbox
                </Link>
              </div>
            </CardFooter>
          </Card>

          <Card>
            <CardBody>
              <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Legacy Enquiries</div>
              <div style={{ color: "#5b6472", fontSize: 13, lineHeight: 1.5 }}>
                View your older enquiry threads and continue follow-ups where needed.
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Pill>legacy</Pill>
                <Pill>thread</Pill>
                <Pill>follow-up</Pill>
              </div>
            </CardBody>
            <CardFooter>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
                <ActionButton href="/dashboard/buyer/enquiries" variant="secondary">
                  Open Legacy Enquiries →
                </ActionButton>
                <Link href="/dashboard/buyer/enquiries" style={{ fontWeight: 800, alignSelf: "center" }}>
                  /dashboard/buyer/enquiries
                </Link>
              </div>
            </CardFooter>
          </Card>

          <Card>
            <CardBody>
              <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>My RFQs / Compare Quotes</div>
              <div style={{ color: "#5b6472", fontSize: 13, lineHeight: 1.5 }}>
                Track vendor responses, compare quotations, and continue RFQ decisions.
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Pill>rfq</Pill>
                <Pill>quotes</Pill>
                <Pill>compare</Pill>
              </div>
            </CardBody>
            <CardFooter>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
                <ActionButton href="/dashboard/buyer/rfqs" variant="primary">
                  Open RFQs →
                </ActionButton>
                <Link href="/dashboard/buyer/rfqs" style={{ fontWeight: 800, alignSelf: "center" }}>
                  /dashboard/buyer/rfqs
                </Link>
              </div>
            </CardFooter>
          </Card>

          <Card>
            <CardBody>
              <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Browse Marketplace</div>
              <div style={{ color: "#5b6472", fontSize: 13, lineHeight: 1.5 }}>
                Explore listings across Property, Materials, Services and Rentals.
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Pill>property</Pill>
                <Pill>materials</Pill>
                <Pill>services</Pill>
                <Pill>rentals</Pill>
              </div>
            </CardBody>
            <CardFooter>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
                <ActionButton href="/property" variant="primary">
                  Browse Property →
                </ActionButton>
                <ActionButton href="/materials" variant="secondary">
                  Materials
                </ActionButton>
                <Link href="/services" style={{ fontWeight: 800, alignSelf: "center" }}>
                  Services
                </Link>
                <Link href="/rentals" style={{ fontWeight: 800, alignSelf: "center" }}>
                  Rentals
                </Link>
              </div>
            </CardFooter>
          </Card>

          <Card>
            <CardBody>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Saved / Shortlist</div>
                  <div style={{ color: "#5b6472", fontSize: 13, lineHeight: 1.5 }}>
                    Save properties/materials/services/rentals to compare later.
                  </div>
                </div>
                <Pill tone="warn">Coming soon</Pill>
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Pill>compare</Pill>
                <Pill>alerts</Pill>
                <Pill>notes</Pill>
              </div>

              <div style={{ marginTop: 10, color: "#5b6472", fontSize: 13, lineHeight: 1.5 }}>
                This feature will need a small table later, but it is not required for listing chat.
              </div>
            </CardBody>
            <CardFooter>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
                <ActionButton href="/property" variant="secondary">
                  Start browsing →
                </ActionButton>
              </div>
            </CardFooter>
          </Card>

          <Card>
            <CardBody>
              <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Blog / News</div>
              <div style={{ color: "#5b6472", fontSize: 13, lineHeight: 1.5 }}>
                Read blog posts and updates from across the platform.
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Pill>read</Pill>
                <Pill>learn</Pill>
                <Pill>updates</Pill>
              </div>
            </CardBody>
            <CardFooter>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
                <ActionButton href="/blog" variant="primary">
                  Browse Blog →
                </ActionButton>
                <Link href="/blog" style={{ fontWeight: 800, alignSelf: "center" }}>
                  /blog
                </Link>
              </div>
            </CardFooter>
          </Card>
        </Grid>

        <details
          style={{
            marginTop: 18,
            marginBottom: 18,
            borderRadius: 18,
            overflow: "hidden",
            border: "1px solid #e5e7eb",
            background: "#ffffff",
          }}
        >
          <summary
            style={{
              padding: 14,
              cursor: "pointer",
              fontWeight: 1000,
              fontSize: 13,
              color: "#334155",
              background: "#f8fafc",
            }}
          >
            🧠 Buyer AI Assistant — click to open quote guidance, vendor follow-up and procurement intelligence
          </summary>

          <div
            style={{
              padding: 16,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
              gap: 12,
            }}
          >
            {buyerAiInsights.map((x) => (
              <div
                key={x.title}
                style={{
                  border: "1px solid rgba(15,23,42,0.08)",
                  borderRadius: 14,
                  padding: 14,
                  background: x.tone === "warn" ? "#fffbeb" : "#ffffff",
                }}
              >
                <div style={{ fontWeight: 1000, color: "#0f172a" }}>
                  {x.title}
                </div>

                <div
                  style={{
                    marginTop: 6,
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: "#475569",
                    fontWeight: 700,
                  }}
                >
                  {x.detail}
                </div>

                <div style={{ marginTop: 10 }}>
                  <ActionButton
                    href={x.href}
                    variant={x.tone === "warn" ? "primary" : "secondary"}
                  >
                    {x.cta} →
                  </ActionButton>
                </div>
              </div>
            ))}
          </div>
        </details>

        <div style={{ marginTop: 16, opacity: 0.75, fontSize: 13 }}>
          Buyer dashboard now connects procurement creation, RFQ comparison, vendor chat, inbox, marketplace discovery and AI procurement intelligence.
        </div>

</Container>
    </main>
  );
}