"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { getGrowthPlanPresentation } from "@/lib/3bos/capability";
import { resolveGrowthJourney } from "@/lib/registration/resolveGrowthJourney";

type SessionUser = {
  id: string;
  email?: string | null;
};

type PlanKey =
  | "free"
  | "basic_vendor"
  | "silver_vendor"
  | "gold_vendor"
  | "platinum_vendor"
  | "premium_vendor"
  | "hub_vendor";

type DisplayPlanKey =
  | "free"
  | "basic_vendor"
  | "silver_vendor"
  | "gold_vendor"
  | "platinum_vendor";

function normalizePlanKey(plan: PlanKey): DisplayPlanKey {
  if (plan === "premium_vendor") return "gold_vendor";
  if (plan === "hub_vendor") return "platinum_vendor";
  return plan;
}

const PLAN_META: Record<
  DisplayPlanKey,
  {
    title: string;
    price: string;
    boost: string;
    alertStrength: string;
    whatsapp: string;
    priorityLead: string;
    visibility: string;
    conversion: string;
    multiplier: string;
    leads: string;
    trust: string;
    badge: string;
    storagePlan: PlanKey;
  }
> = {
  free: {
    title: "FREE",
    price: "₹0 / month",
    boost: "+0 AI Boost",
    alertStrength: "UI alerts only",
    whatsapp: "No WhatsApp alerts",
    priorityLead: "Standard leads",
    visibility: "Basic listing visibility",
    conversion: "Low conversion advantage",
    multiplier: "1x",
    leads: "0–3",
    trust: "⚪ STANDARD",
    badge: "Starter",
    storagePlan: "free",
  },
  basic_vendor: {
    title: "BASIC",
    price: "₹299 / month",
    boost: "+3 AI Boost",
    alertStrength: "Low Workflow alerts",
    whatsapp: "Limited WhatsApp-ready alerts",
    priorityLead: "Above free vendors",
    visibility: "Basic boost visibility",
    conversion: "Small conversion lift",
    multiplier: "1.5x",
    leads: "3–5",
    trust: "🔵 BASIC BOOSTED",
    badge: "Entry",
    storagePlan: "basic_vendor",
  },
  silver_vendor: {
    title: "SILVER",
    price: "₹499 / month",
    boost: "+5 AI Boost",
    alertStrength: "Medium Workflow alerts",
    whatsapp: "WhatsApp alert access",
    priorityLead: "Priority RFQ visibility",
    visibility: "Stronger buyer visibility",
    conversion: "Good conversion advantage",
    multiplier: "2x",
    leads: "4–7",
    trust: "🥈 AI BOOSTED",
    badge: "Growth",
    storagePlan: "silver_vendor",
  },
  gold_vendor: {
    title: "GOLD",
    price: "₹999 / month",
    boost: "+10 AI Boost",
    alertStrength: "Strong Workflow alerts",
    whatsapp: "WhatsApp + priority alerts",
    priorityLead: "High-priority lead access",
    visibility: "Premium ranking advantage",
    conversion: "Strong conversion advantage",
    multiplier: "3x–4x",
    leads: "8–12",
    trust: "⭐ AI VERIFIED",
    badge: "Popular",
    storagePlan: "gold_vendor",
  },
  platinum_vendor: {
    title: "PLATINUM",
    price: "₹1999 / month",
    boost: "+20 AI Boost",
    alertStrength: "Maximum Workflow alerts",
    whatsapp: "Fastest WhatsApp alerts",
    priorityLead: "Top priority lead access",
    visibility: "Maximum boost visibility",
    conversion: "Highest conversion advantage",
    multiplier: "5x",
    leads: "12–20",
    trust: "🔥 AI VERIFIED MAX",
    badge: "Maximum",
    storagePlan: "platinum_vendor",
  },
};

function planAiBoostPower(plan: PlanKey) {
  const p = normalizePlanKey(plan);
  if (p === "platinum_vendor") return 20;
  if (p === "gold_vendor") return 10;
  if (p === "silver_vendor") return 5;
  if (p === "basic_vendor") return 3;
  return 0;
}

function planAiTrustLevel(plan: PlanKey) {
  return PLAN_META[normalizePlanKey(plan)].trust;
}

function planLeadPrediction(plan: PlanKey) {
  const meta = PLAN_META[normalizePlanKey(plan)];

  return {
    multiplier: meta.multiplier,
    leads: meta.leads,
    label: meta.visibility,
  };
}

function safePath(p: string | null, fallback: string) {
  if (!p) return fallback;
  if (!p.startsWith("/")) return fallback; // internal only
  if (p.startsWith("//")) return fallback;
  return p;
}

function normalizeSource(s: string | null): string {
  return (s || "unknown").trim().toLowerCase();
}

function defaultReturnForSource(source: string): string {
  const s = normalizeSource(source);
  if (s === "property") return "/property/my";
  if (s === "rentals" || s === "rental") return "/rentals/my";
  if (s === "materials" || s === "material") return "/materials/my";
  if (s === "services" || s === "service") return "/services/my";
  if (s === "blog" || s === "news") return "/blog/my";
  return "/dashboard";
}

function buildSelfUrl(params: {
  source: string;
  listingId: string | null;
  returnTo: string;
  focus?: string;
}) {
  const q = new URLSearchParams();
  q.set("source", params.source);
  if (params.focus && params.focus !== "unknown") q.set("focus", params.focus);
  if (params.listingId) q.set("listingId", params.listingId);
  q.set("return", params.returnTo);
  return `/dashboard/subscription?${q.toString()}`;
}

export default function SubscriptionPageClient() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const router = useRouter();
  const sp = useSearchParams();

  const source = sp.get("source") || "unknown";
  const focus = normalizeSource(sp.get("focus"));
  const listingId = sp.get("listingId");

  // if return is missing, we fallback to per-source default
  const sourceDefaultReturn = defaultReturnForSource(source);
  const returnTo = safePath(sp.get("return"), sourceDefaultReturn);

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [activePlan, setActivePlan] = useState<PlanKey>("free");
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<string>("free");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [gatewayReady, setGatewayReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);

  // if listingId is missing, show a clear banner (do NOT break the page)
  const listingIdMissing = !listingId || String(listingId).trim().length < 6;

  const activeDisplayPlan = normalizePlanKey(activePlan);
  const activeGrowthPlan = getGrowthPlanPresentation(activePlan);
  const activePrediction = planLeadPrediction(activePlan);
  const growthJourney = resolveGrowthJourney({
    subscriptionPlan: activePlan,
    subscriptionStatus,
    subscriptionExpiresAt: expiresAt,
    gatewayReady,
  });
  const goldPrediction = planLeadPrediction("gold_vendor");
  const platinumPrediction = planLeadPrediction("platinum_vendor");

  // DS4B_EXECUTIVE_HEALTH_LOGIC
  const businessHealthScore = Math.min(
    100,
    35 +
      planAiBoostPower(activePlan) * 2 +
      (growthJourney.isPaidActive ? 20 : 0) +
      (gatewayReady ? 5 : 0)
  );

  const businessHealthLabel =
    businessHealthScore >= 80
      ? "Strong"
      : businessHealthScore >= 60
      ? "Growing"
      : businessHealthScore >= 40
      ? "Building"
      : "Starting";

  const executiveNextAction =
    focus === "boost"
      ? "Review visibility support and recover missed opportunities."
      : focus === "ai"
      ? "Strengthen customer follow-up and deal conversion."
      : focus === "premium"
      ? "Protect your position with wider operational support."
      : activePlan === "free"
      ? "Continue with the Essential Workspace and upgrade only when your business needs more support."
      : "Use your present Growth Plan fully before considering the next level.";

  const displayPlans: DisplayPlanKey[] = [
    "free",
    "basic_vendor",
    "silver_vendor",
    "gold_vendor",
    "platinum_vendor",
  ];

  const identityRecommendation:
    | {
        plan: DisplayPlanKey;
        title: string;
        detail: string;
      }
    | null =
    focus === "vendor-hub"
      ? {
          plan: "platinum_vendor",
          title:
            "Recommended for Vendor Hub",
          detail:
            "Your identity operates across multiple business segments. Platinum provides the widest operational and marketplace support.",
        }
      : focus === "property" ||
        focus === "materials" ||
        focus === "rentals"
      ? {
          plan: "gold_vendor",
          title:
            "Recommended for your business identity",
          detail:
            "Gold provides stronger visibility, priority opportunities and business-growth tools suitable for transaction-focused businesses.",
        }
      : focus === "services"
      ? {
          plan: "silver_vendor",
          title:
            "Recommended for a service professional",
          detail:
            "Silver supports professional visibility, RFQ alerts and customer follow-up without requiring the highest plan.",
        }
      : focus === "blog"
      ? {
          plan: "basic_vendor",
          title:
            "Recommended for an author or publisher",
          detail:
            "Basic provides an economical starting point while your audience and publishing activity grow.",
        }
      : {
          plan: "free",
          title:
            "Start with the Essential Workspace",
          detail:
            "Use the Free plan first, then upgrade when your business needs stronger marketplace visibility or operational tools.",
        };

  const executiveRecommendation =
    identityRecommendation?.plan === activeDisplayPlan
      ? `Your present ${activeGrowthPlan.offerLabel} plan already matches the current recommendation.`
      : identityRecommendation
      ? `${PLAN_META[identityRecommendation.plan].title} is the suggested next plan for your present business identity.`
      : "Continue with your present workspace and review plans only when a real business need arises.";

  // 1) Read session robustly (no infinite loading)
  useEffect(() => {
    let alive = true;

    async function boot() {
      setLoading(true);
      setErr(null);

      try {
        const { data, error } = await supabase.auth.getSession();
        if (!alive) return;

        if (error) {
          setUser(null);
          setErr(error.message || "Failed to read session.");
          setLoading(false);

          const nextUrl = buildSelfUrl({ source, listingId, returnTo, focus });
          router.replace(`/login?next=${encodeURIComponent(nextUrl)}`);
          return;
        }

        const sess = data.session;
        if (!sess?.user?.id) {
          setUser(null);
          setLoading(false);

          const nextUrl = buildSelfUrl({ source, listingId, returnTo, focus });
          router.replace(`/login?next=${encodeURIComponent(nextUrl)}`);
          return;
        }

        setUser({ id: sess.user.id, email: sess.user.email });
        setLoading(false);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Unknown error while loading session.");
        setLoading(false);
      }
    }

    boot();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      boot();
    });

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Load subscription record and canonical SBI readiness
  useEffect(() => {
    if (!user?.id) return;

    let alive = true;

    (async () => {
      const [profileResult, readinessResponse] = await Promise.all([
        supabase
          .from("business_profiles")
          .select(
            "subscription_plan,subscription_status,subscription_expires_at"
          )
          .eq("user_id", user.id)
          .maybeSingle(),
        fetch("/api/payments/sbi/readiness", {
          method: "GET",
          cache: "no-store",
        }),
      ]);

      if (!alive) return;

      const data = profileResult.data;

      if (!profileResult.error && data?.subscription_plan) {
        const pk = String(data.subscription_plan) as PlanKey;

        if (
          pk === "free" ||
          pk === "basic_vendor" ||
          pk === "silver_vendor" ||
          pk === "gold_vendor" ||
          pk === "platinum_vendor" ||
          pk === "premium_vendor" ||
          pk === "hub_vendor"
        ) {
          setActivePlan(pk);
        }

        setSubscriptionStatus(
          String(data.subscription_status || "free").toLowerCase()
        );
        setExpiresAt(data.subscription_expires_at || null);
      } else {
        setActivePlan("free");
        setSubscriptionStatus("free");
        setExpiresAt(null);
      }

      const readiness = await readinessResponse
        .json()
        .catch(() => null);

      if (!alive) return;

      setGatewayReady(
        readinessResponse.ok &&
          readiness?.gatewayReady === true
      );
    })();

    return () => {
      alive = false;
    };
  }, [supabase, user?.id]);

    async function handlePayment(plan: PlanKey) {
    if (!user?.id) return;

    setSaving(true);
    setMsg(null);
    setErr(null);

    try {
      await fetch("/api/inbox-ai-action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "subscription_purchase_intent",
          plan,
          source,
          focus,
          listingId,
          returnTo,
          userId: user.id,
        }),
      });

      const response = await fetch("/api/payments/sbi/create-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || "Could not create the SBI payment request.");
      }

      setActivePlan(plan);
      setSubscriptionStatus("payment_pending");
      setExpiresAt(null);
      setGatewayReady(result.gatewayReady === true);
      setPaymentLink(result.shareUrl || null);

      setMsg(
        result.gatewayReady
          ? "Your secure SBI payment request is ready."
          : "Your plan and secure shareable payment request are saved. SBI Payment Gateway connection is still pending, so no payment can be collected or subscription activated yet."
      );
    } catch (e: any) {
      console.warn("subscription purchase intent tracking failed:", e?.message || e);
      setErr(e?.message || "Could not create the SBI payment request.");
    } finally {
      setSaving(false);
    }
  }

  function continueWithEssential() {
    setMsg(
      "Your Essential Workspace remains available. No subscription record needs to be changed."
    );
    router.push(returnTo || "/dashboard/workspace");
  }

  return (
    <main className="subPage">
      <div className="wrap">
        <div className="head">
          <div>
            <div className="kicker">Business Growth</div>
            <h1 className="h1">Business Growth Plans</h1>
            <p className="p">
              {focus === "boost"
                ? "Recover missed leads by boosting your visibility in AI vendor matching."
                : focus === "ai"
                ? "Improve deal closing with AI-powered replies and smarter follow-ups."
                : focus === "premium"
                ? "Maintain top vendor position with maximum visibility and priority ranking."
                : "3Bigha is a Business Operating System with an integrated Marketplace. Customers pay businesses directly; Growth Plans support business tools, visibility and operations without commission."}
            </p>
          </div>

          <div className="actions">
            <Link className="btn btnOutline" href={returnTo}>
              Return to My Work
            </Link>
            <Link className="btn btnOutline" href="/dashboard/workspace">
              Back to Workspace
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="state">Loading session…</div>
        ) : !user ? (
          <div className="state stateErr">
            <div className="stateTitle">Login required</div>
            <div className="hint">
              Redirecting to <span className="mono">/login</span>…
            </div>
          </div>
        ) : (
          <>
            {/* DS4B_EXECUTIVE_BUSINESS_GROWTH_LAYER */}
            <section className="executiveGrowth">
              <div className="executiveGrowthMain">
                <div className="executiveEyebrow">Your Business Growth Desk</div>
                <h2 className="executiveTitle">
                  Understand where your business stands before choosing a plan
                </h2>
                <p className="executiveLead">
                  Your Essential Workspace remains available. Growth Plans are optional support tools for communication, visibility and business operations.
                </p>

                <div className="executiveActionRow">
                  <Link className="executivePrimary" href={returnTo}>
                    Continue My Work
                  </Link>
                  <a className="executiveSecondary" href="#growth-plan-options">
                    Review Plan Options
                  </a>
                </div>
              </div>

              <div className="executiveHealth">
                <div className="executiveHealthLabel">Business health</div>
                <div className="executiveHealthValue">{businessHealthScore}/100</div>
                <div className="executiveHealthState">{businessHealthLabel}</div>
                <div className="executiveHealthHint">
                  This guidance reflects your current plan and available business support. It is not a promise of sales or enquiries.
                </div>
              </div>

              <div className="executiveGrid">
                <div className="executiveCard">
                  <div className="executiveCardLabel">Current stage</div>
                  <div className="executiveCardValue">{activeGrowthPlan.stageLabel}</div>
                  <div className="executiveCardText">{activeGrowthPlan.badge}</div>
                </div>

                <div className="executiveCard">
                  <div className="executiveCardLabel">Recommendation</div>
                  <div className="executiveCardValue">
                    {identityRecommendation
                      ? PLAN_META[identityRecommendation.plan].title
                      : activeGrowthPlan.offerLabel}
                  </div>
                  <div className="executiveCardText">{executiveRecommendation}</div>
                </div>

                <div className="executiveCard">
                  <div className="executiveCardLabel">Next best action</div>
                  <div className="executiveCardValue">Act with clarity</div>
                  <div className="executiveCardText">{executiveNextAction}</div>
                </div>
              </div>
            </section>

            {focus === "boost" ? (
              <div className="alert alertWarn" style={{ borderColor: "#f97316", background: "#fff7ed" }}>
                <b>Your business may benefit from broader visibility.</b>
                <div style={{ marginTop: 6 }}>
                  Review the Growth Plans and choose the visibility support appropriate for your business.
                </div>
              </div>
            ) : focus === "ai" ? (
              <div className="alert" style={{ borderColor: "#2563eb", background: "#ffffff", color: "#1e3a8a" }}>
                <b>Additional customer follow-up tools are available.</b>
                <div style={{ marginTop: 6 }}>
                  Use prepared response suggestions and organised follow-ups while keeping every decision in your hands.
                </div>
              </div>
            ) : focus === "premium" ? (
              <div className="alert" style={{ borderColor: "#059669", background: "#ecfdf5", color: "#064e3b" }}>
                <b>Advanced business support is available.</b>
                <div style={{ marginTop: 6 }}>
                  Review tools for larger teams, stronger operations and wider marketplace reach.
                </div>
              </div>
            ) : listingIdMissing ? (
              <div className="alert alertWarn">
                <b>No specific listing selected.</b>
                <div style={{ marginTop: 6 }}>
                  You can still review and request a Growth Plan for your business.
                </div>
              </div>
            ) : null}

            {identityRecommendation ? (
              <div
                className="alert alertOk"
                style={{
                  border: "1px solid #86efac",
                  background: "#f0fdf4",
                  color: "#166534",
                }}
              >
                <b>
                  {identityRecommendation.title}
                </b>

                <div style={{ marginTop: 6 }}>
                  {
                    identityRecommendation.detail
                  }
                </div>

                <div
                  style={{
                    marginTop: 8,
                    fontWeight: 950,
                  }}
                >
                  Suggested plan:{" "}
                  {
                    PLAN_META[
                      identityRecommendation.plan
                    ].title
                  }
                </div>

                <div
                  style={{
                    marginTop: 5,
                    fontSize: 12,
                  }}
                >
                  This is a recommendation only.
                  You may choose Free or any other
                  plan.
                </div>
              </div>
            ) : null}

            {err ? (
              <div className="alert alertErr">
                <b>Error:</b> {err}
              </div>
            ) : null}

            {msg ? (
              <div className="alert alertOk">
                <b>Info:</b> {msg}
                {paymentLink ? (
                  <div style={{ marginTop: 10 }}>
                    <a href={paymentLink} style={{ fontWeight: 900 }}>
                      Open or share this SBI payment request
                    </a>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="bar">
              <div className="pill">
                <b>Logged in:</b> {user.email || user.id}
              </div>
              <div className="pill">
                <b>Source:</b> {source}
              </div>
              {focus !== "unknown" ? (
                <div className="pill">
                  <b>Focus:</b> {focus}
                </div>
              ) : null}
              <div className="pill">
                <b>Return:</b> {returnTo}
              </div>
              {listingId && !listingIdMissing ? (
                <div className="pill">
                  <b>Listing ID:</b> {listingId}
                </div>
              ) : null}
              <div className="pill">
                <b>Current Growth Plan:</b>{" "}
                {activeGrowthPlan.offerLabel}{" "}
                — {growthJourney.statusLabel}
              </div>
              {expiresAt ? (
                <div className="pill">
                  <b>Expiry:</b> {new Date(expiresAt).toLocaleDateString()}
                </div>
              ) : null}
            </div>

            <div
              className={`alert ${
                growthJourney.tone === "positive"
                  ? "alertOk"
                  : growthJourney.tone === "attention"
                  ? "alertWarn"
                  : ""
              }`}
            >
              <b>{growthJourney.title}:</b>{" "}
              {growthJourney.statusLabel}
              <div style={{ marginTop: 6 }}>
                {growthJourney.detail}
              </div>
            </div>

            <div className="alert">
              <b>Essential Workspace:</b> Available separately from paid
              Growth Plans. Identity verification and trust remain based
              on evidence, not subscription level.
            </div>

            <div className="revenueHero">
              <div>
                <div className="revenueKicker">Business Growth Guidance</div>
                <div className="revenueTitle">
                  {focus === "boost"
                    ? "Recover missed leads with stronger AI boost visibility"
                    : focus === "ai"
                    ? "Improve deal closing with AI-assisted vendor growth"
                    : focus === "premium"
                    ? "Stay ahead with premium vendor visibility"
                    : "Choose tools that match the present stage of your business"}
                </div>
                <div className="revenueText">
                  {focus === "boost"
                    ? "Your vendor dashboard found missed lead opportunities. Review the Growth Plans and choose the visibility support appropriate for your business."
                    : focus === "ai"
                    ? "Use AI-powered visibility and smarter follow-ups to convert more conversations into completed deals."
                    : focus === "premium"
                    ? "Keep your ranking strong with higher boost power, premium trust signals, and maximum buyer visibility."
                    : "Every Growth Plan supports a different stage of business. Choose according to the tools, team size and operating support you currently need."}
                </div>
              </div>

              <div className="revenueScore">
                <div className="scoreLabel">Current growth stage</div>
                <div className="scoreValue" style={{ fontSize: 28 }}>{activeGrowthPlan.stageLabel}</div>

                <div style={{ marginTop: 8, fontWeight: 900, fontSize: 14 }}>
                  {activeGrowthPlan.badge}
                </div>
                <div className="scoreHint">
                  Plan level affects included business tools and promotional support. Trust and verification remain based on evidence.
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                borderRadius: 18,
                padding: 12,
                border: "1px solid #fde68a",
                background: "#ffffff",
                boxShadow: "0 12px 28px rgba(245,158,11,0.10)",
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 950, color: "#92400e" }}>
                Business Growth Comparison
              </div>

              <div style={{ marginTop: 6, fontSize: 13, color: "#475569", fontWeight: 800, lineHeight: 1.6 }}>
                Compare the commercial offers currently available while the new Growth Plan system is introduced.
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                  gap: 10,
                }}
              >
                <div style={{ border: "1px solid #fed7aa", borderRadius: 12, padding: 12, background: "#fff" }}>
                  <div style={{ fontSize: 12, color: "#92400e", fontWeight: 900 }}>Current Plan</div>
                  <div style={{ marginTop: 4, fontSize: 18, fontWeight: 950, color: "#111827" }}>
                    {activePrediction.multiplier}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12, color: "#64748b", fontWeight: 800 }}>
                    {activePrediction.leads} expected enquiries / week
                  </div>
                </div>

                <div style={{ border: "1px solid #bfdbfe", borderRadius: 12, padding: 12, background: "#ffffff" }}>
                  <div style={{ fontSize: 12, color: "#1d4ed8", fontWeight: 900 }}>Gold Upgrade</div>
                  <div style={{ marginTop: 4, fontSize: 18, fontWeight: 950, color: "#1d4ed8" }}>
                    {goldPrediction.multiplier}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12, color: "#1e3a8a", fontWeight: 800 }}>
                    {goldPrediction.leads} expected enquiries / week
                  </div>
                </div>

                <div style={{ border: "1px solid #fecaca", borderRadius: 12, padding: 12, background: "#fff1f2" }}>
                  <div style={{ fontSize: 12, color: "#be123c", fontWeight: 900 }}>Platinum Upgrade</div>
                  <div style={{ marginTop: 4, fontSize: 18, fontWeight: 950, color: "#be123c" }}>
                    {platinumPrediction.multiplier}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12, color: "#7f1d1d", fontWeight: 800 }}>
                    {platinumPrediction.leads} expected enquiries / week
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 10, fontSize: 12, color: "#78716c", fontWeight: 800 }}>
                These visibility ranges are illustrative and are not a promise of enquiries, sales or business results.
              </div>
            </div>

            <div className="alert alertWarn">
              <b>SBI Payment Gateway:</b>{" "}
              {gatewayReady
                ? "Secure SBI payment requests are available for optional paid Growth Plans."
                : "The SBI integration is being configured. Your Essential Workspace remains available; no paid benefit can activate until payment is available and verified."}
            </div>

            <div id="growth-plan-options" className="comparisonBox">
              <div className="comparisonHead">
                <div>
                  <div className="comparisonKicker">Business Growth Plans</div>
                  <div className="comparisonTitle">
                    Choose the communication, visibility and business support suitable for your present stage.
                  </div>
                </div>
              </div>

              <div className="comparisonGrid">
                {displayPlans.map((plan) => {
                  const meta = PLAN_META[plan];
                  const active =
                    activeDisplayPlan === plan &&
                    (plan === "free"
                      ? growthJourney.isEssential
                      : growthJourney.isPaidActive);

                  return (
                    <div
                      className={`compareCol ${
                        active
                          ? "compareActive"
                          : ""
                      }`}
                      key={plan}
                      style={
                        identityRecommendation?.plan ===
                        plan
                          ? {
                              border:
                                "3px solid #16a34a",
                              boxShadow:
                                "0 12px 30px rgba(22,163,74,0.18)",
                            }
                          : undefined
                      }
                    >
                      {identityRecommendation?.plan ===
                      plan ? (
                        <div
                          style={{
                            marginBottom: 7,
                            padding: "5px 8px",
                            borderRadius: 999,
                            background: "#dcfce7",
                            color: "#166534",
                            fontSize: 11,
                            fontWeight: 950,
                            textAlign: "center",
                          }}
                        >
                          RECOMMENDED FOR YOU
                        </div>
                      ) : null}

                      <div className="comparePlan">{getGrowthPlanPresentation(plan).offerLabel}</div>
                      <div className="comparePrice">{meta.price}</div>
                      <div className="compareBadge">{meta.badge}</div>

                      <div className="compareRow">
                        <b>Business Alerts</b>
                        <span>{meta.alertStrength}</span>
                      </div>
                      <div className="compareRow">
                        <b>WhatsApp Alerts</b>
                        <span>{meta.whatsapp}</span>
                      </div>
                      <div className="compareRow">
                        <b>Requirement Access</b>
                        <span>{meta.priorityLead}</span>
                      </div>
                      <div className="compareRow">
                        <b>Marketplace Visibility</b>
                        <span>{meta.visibility}</span>
                      </div>
                      <div className="compareRow">
                        <b>Business Support</b>
                        <span>{meta.conversion}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid">
              {displayPlans.map((plan) => {
                const meta = PLAN_META[plan];
                const active =
                  activeDisplayPlan === plan &&
                  (plan === "free"
                    ? growthJourney.isEssential
                    : growthJourney.isPaidActive);
                const isFree = plan === "free";

                return (
                  <PlanCard
                    key={plan}
                    title={getGrowthPlanPresentation(plan).offerLabel}
                    price={meta.price}
                    boost={meta.boost}
                    alertStrength={meta.alertStrength}
                    whatsapp={meta.whatsapp}
                    priorityLead={meta.priorityLead}
                    visibility={meta.visibility}
                    conversion={meta.conversion}
                    highlight={
                      plan === "gold_vendor"
                        ? "Most popular"
                        : plan === "platinum_vendor"
                        ? "Maximum monetization"
                        : plan === "silver_vendor"
                        ? "Best starter upgrade"
                        : plan === "basic_vendor"
                        ? "Low-cost entry"
                        : "UI alerts only"
                    }
                    recommended={
                      (focus === "boost" && plan === "silver_vendor") ||
                      (focus === "ai" && plan === "gold_vendor") ||
                      (focus === "premium" && plan === "platinum_vendor")
                    }
                    bullets={[
                      meta.alertStrength,
                      meta.whatsapp,
                      meta.priorityLead,
                      meta.visibility,
                      meta.conversion,
                    ]}
                    active={active}
                    cta={
                      active
                        ? "Active"
                        : saving
                        ? "Please wait…"
                        : isFree
                        ? "Activate FREE"
                        : `Request ${getGrowthPlanPresentation(plan).offerLabel}`
                    }
                    disabled={saving || active}
                    onClick={() =>
                      isFree
                        ? continueWithEssential()
                        : handlePayment(meta.storagePlan)
                    }
                  />
                );
              })}
            </div>

            <div className="footHint">
              If you got stuck earlier at “Loading session…”, this page is now fixed to redirect to login if session is missing.
            </div>
          </>
        )}
      </div>

      <style jsx global>{`
        .subPage {
          padding: 26px 0 64px;
          background: #fff;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
        }
        .subPage .wrap {
          width: min(1120px, 92vw);
          margin: 0 auto;
        }
        .subPage .head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }
        .subPage .kicker {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #6b7280;
          margin-bottom: 8px;
        }
        .subPage .h1 {
          margin: 0;
          font-size: 34px;
          line-height: 1.1;
          letter-spacing: -0.3px;
        }
        .subPage .p {
          margin: 10px 0 0;
          color: #6b7280;
          font-size: 14px;
          max-width: 80ch;
        }
        .subPage .actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .subPage .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 13px;
          text-decoration: none;
          border: 1px solid transparent;
          user-select: none;
          cursor: pointer;
          font-weight: 800;
        }
        .subPage .btnOutline {
          background: #fff;
          color: #111;
          border-color: #e5e7eb;
        }
        .subPage .btnOutline:hover {
          background: #f9fafb;
        }
        .subPage .executiveGrowth {
          margin: 18px 0 16px;
          border: 1px solid #cbd5e1;
          border-radius: 24px;
          padding: 20px;
          background:
            radial-gradient(circle at top right, rgba(37, 99, 235, 0.10), transparent 34%),
            linear-gradient(135deg, #ffffff, #f8fafc);
          box-shadow: 0 18px 44px rgba(15, 23, 42, 0.09);
          display: grid;
          grid-template-columns: minmax(0, 1fr) 240px;
          gap: 18px;
        }
        .subPage .executiveGrowthMain { min-width: 0; }
        .subPage .executiveEyebrow {
          color: #1d4ed8;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .subPage .executiveTitle {
          margin: 7px 0 0;
          max-width: 760px;
          color: #0f172a;
          font-size: 28px;
          line-height: 1.12;
          letter-spacing: -0.02em;
          font-weight: 950;
        }
        .subPage .executiveLead {
          margin: 10px 0 0;
          max-width: 760px;
          color: #475569;
          font-size: 14px;
          line-height: 1.65;
          font-weight: 650;
        }
        .subPage .executiveActionRow {
          margin-top: 16px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .subPage .executivePrimary,
        .subPage .executiveSecondary {
          min-height: 42px;
          padding: 0 15px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          font-size: 13px;
          font-weight: 950;
        }
        .subPage .executivePrimary {
          background: #1767ef;
          color: #fff;
          box-shadow: 0 10px 22px rgba(23, 103, 239, 0.22);
        }
        .subPage .executiveSecondary {
          border: 1px solid #cbd5e1;
          background: #fff;
          color: #0f172a;
        }
        .subPage .executiveHealth {
          border: 1px solid #bfdbfe;
          border-radius: 18px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.92);
        }
        .subPage .executiveHealthLabel,
        .subPage .executiveCardLabel {
          color: #64748b;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .subPage .executiveHealthValue {
          margin-top: 6px;
          color: #1d4ed8;
          font-size: 34px;
          line-height: 1;
          font-weight: 950;
        }
        .subPage .executiveHealthState {
          margin-top: 6px;
          color: #0f172a;
          font-size: 15px;
          font-weight: 950;
        }
        .subPage .executiveHealthHint {
          margin-top: 8px;
          color: #64748b;
          font-size: 11px;
          line-height: 1.5;
          font-weight: 700;
        }
        .subPage .executiveGrid {
          grid-column: 1 / -1;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        .subPage .executiveCard {
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 14px;
          background: rgba(255, 255, 255, 0.92);
        }
        .subPage .executiveCardValue {
          margin-top: 7px;
          color: #0f172a;
          font-size: 17px;
          font-weight: 950;
        }
        .subPage .executiveCardText {
          margin-top: 6px;
          color: #475569;
          font-size: 12px;
          line-height: 1.55;
          font-weight: 700;
        }
        @media (max-width: 820px) {
          .subPage .executiveGrowth {
            grid-template-columns: 1fr;
            padding: 16px;
          }
          .subPage .executiveGrid { grid-template-columns: 1fr; }
          .subPage .executiveTitle { font-size: 24px; }
        }
        .subPage .state {
          margin-top: 18px;
          border: 1px solid #eeeeee;
          border-radius: 14px;
          padding: 14px;
          color: #555;
          font-size: 13px;
          background: #fff;
        }
        .subPage .stateErr {
          border-color: #f2b8b8;
          background: #fff5f5;
          color: #7a1b1b;
        }
        .subPage .stateTitle {
          font-weight: 900;
          margin-bottom: 8px;
        }
        .subPage .alert {
          margin-top: 10px;
          border-radius: 14px;
          padding: 12px 14px;
          font-size: 13px;
          border: 1px solid #eee;
        }
        .subPage .alertErr {
          border-color: #f2b8b8;
          background: #fff5f5;
          color: #7a1b1b;
        }
        .subPage .alertOk {
          border-color: #bfe7c9;
          background: #f3fff6;
          color: #165a2b;
        }
        .subPage .alertWarn {
          border-color: #f6d08a;
          background: #fff8e6;
          color: #6a4a00;
        }
        .subPage .bar {
          margin-top: 12px;
          display: none;
          gap: 8px;
          flex-wrap: wrap;
        }
        .subPage .pill {
          border: 1px solid #e5e7eb;
          background: #fff;
          border-radius: 999px;
          padding: 8px 10px;
          font-size: 12px;
          color: #111827;
        }
        .subPage .revenueHero {
          margin-top: 14px;
          border: 1px solid #fde68a;
          background: linear-gradient(135deg, #fffbeb, #ffffff);
          border-radius: 20px;
          padding: 14px;
          display: flex;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
          box-shadow: 0 14px 30px rgba(15, 23, 42, 0.07);
        }
        .subPage .revenueKicker {
          font-size: 12px;
          font-weight: 950;
          color: #92400e;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .subPage .revenueTitle {
          margin-top: 6px;
          font-size: 24px;
          line-height: 1.12;
          font-weight: 950;
          color: #111827;
          max-width: 640px;
        }
        .subPage .revenueText {
          margin-top: 8px;
          font-size: 13px;
          line-height: 1.55;
          color: #475569;
          max-width: 720px;
          font-weight: 700;
        }
        .subPage .revenueScore {
          min-width: 220px;
          border: 1px solid #f59e0b;
          background: #fff;
          border-radius: 18px;
          padding: 14px;
        }
        .subPage .scoreLabel {
          font-size: 12px;
          color: #64748b;
          font-weight: 900;
        }
        .subPage .scoreValue {
          margin-top: 4px;
          font-size: 38px;
          line-height: 1;
          font-weight: 950;
          color: #b45309;
        }
        .subPage .scoreHint {
          margin-top: 8px;
          font-size: 12px;
          line-height: 1.45;
          color: #475569;
          font-weight: 800;
        }
        .subPage .comparisonBox {
          margin-top: 14px;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          background: linear-gradient(135deg, #ffffff, #f8fafc);
          padding: 12px;
        }
        .subPage .comparisonHead {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .subPage .comparisonKicker {
          font-size: 12px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #64748b;
        }
        .subPage .comparisonTitle {
          margin-top: 5px;
          font-size: 20px;
          font-weight: 950;
          color: #111827;
        }
        .subPage .comparisonGrid {
          margin-top: 14px;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
        }
        .subPage .compareCol {
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          background: #fff;
          padding: 12px;
        }
        .subPage .compareActive {
          border-color: #111827;
          box-shadow: 0 14px 30px rgba(15, 23, 42, 0.12);
        }
        .subPage .comparePlan {
          font-size: 15px;
          font-weight: 950;
          color: #111827;
        }
        .subPage .comparePrice {
          margin-top: 4px;
          font-size: 12px;
          font-weight: 900;
          color: #64748b;
        }
        .subPage .compareBadge {
          margin-top: 8px;
          display: inline-flex;
          border: 1px solid #fde68a;
          background: #fffbeb;
          color: #92400e;
          border-radius: 999px;
          padding: 5px 9px;
          font-size: 11px;
          font-weight: 950;
        }
        .subPage .compareRow {
          margin-top: 10px;
          display: grid;
          gap: 3px;
          font-size: 12px;
          line-height: 1.35;
        }
        .subPage .compareRow b {
          color: #111827;
        }
        .subPage .compareRow span {
          color: #475569;
          font-weight: 750;
        }
        .subPage .grid {
          margin-top: 14px;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 12px;
        }
        @media (max-width: 1100px) {
          .subPage .comparisonGrid,
          .subPage .grid {
            grid-template-columns: 1fr;
          }
        }
        .subPage .card {
          border: 1px solid #eee;
          border-radius: 16px;
          background: #fff;
          padding: 14px;
        }
        .subPage .cardRecommended {
          border: 2px solid #f59e0b;
          box-shadow: 0 16px 34px rgba(245, 158, 11, 0.18);
          transform: translateY(-2px);
        }
        .subPage .cardTop {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: flex-start;
        }
        .subPage .cardTitle {
          font-weight: 900;
          font-size: 16px;
        }
        .subPage .cardPrice {
          margin-top: 6px;
          color: #6b7280;
          font-size: 13px;
          font-weight: 800;
        }
        .subPage .boostTag {
          margin-top: 8px;
          display: inline-flex;
          border: 1px solid #fde68a;
          background: #fffbeb;
          color: #92400e;
          border-radius: 999px;
          padding: 5px 9px;
          font-size: 12px;
          font-weight: 950;
        }
        .subPage .highlightTag {
          margin-top: 8px;
          display: inline-flex;
          border: 1px solid #bfdbfe;
          background: #eff6ff;
          color: #1d4ed8;
          border-radius: 999px;
          padding: 5px 9px;
          font-size: 12px;
          font-weight: 950;
        }
        .subPage .badge {
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 12px;
          border: 1px solid #e5e7eb;
          font-weight: 900;
        }
        .subPage .badgeOn {
          border-color: #111827;
          background: #111827;
          color: #fff;
        }
        .subPage .list {
          margin: 12px 0 0;
          padding-left: 18px;
          color: #374151;
          font-size: 13px;
        }
        .subPage .cta {
          margin-top: 12px;
          width: 100%;
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 13px;
          font-weight: 900;
          border: 1px solid #111827;
          background: #111827;
          color: #fff;
          cursor: pointer;
        }
        .subPage .cta:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .subPage .footHint {
          display: none;
          margin-top: 12px;
          font-size: 12px;
          color: #6b7280;
        }
        .subPage .mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New",
            monospace;
        }
      `}</style>
    </main>
  );
}

function PlanCard(props: {
  title: string;
  price: string;
  boost?: string;
  highlight?: string;
  alertStrength: string;
  whatsapp: string;
  priorityLead: string;
  visibility: string;
  conversion: string;
  bullets: string[];
  active: boolean;
  recommended?: boolean;
  cta: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <div className={`card ${props.recommended ? "cardRecommended" : ""}`}>
      <div className="cardTop">
        <div>
          <div className="cardTitle">{props.title}</div>
          <div className="cardPrice">{props.price}</div>
          {props.boost ? <div className="boostTag">{props.boost}</div> : null}
          {props.highlight ? <div className="highlightTag">{props.highlight}</div> : null}
        </div>
        <div className={`badge ${props.active ? "badgeOn" : ""}`}>{props.active ? "ACTIVE" : "PLAN"}</div>
      </div>

      <ul className="list">
        {props.bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>

      <button className="cta" onClick={props.onClick} disabled={props.disabled}>
        {props.cta}
      </button>
    </div>
  );
}
