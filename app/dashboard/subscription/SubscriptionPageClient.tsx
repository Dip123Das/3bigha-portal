"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type SessionUser = {
  id: string;
  email?: string | null;
};

type PlanKey = "free" | "basic_vendor" | "premium_vendor" | "hub_vendor";

function planAiBoostPower(plan: PlanKey) {
  if (plan === "hub_vendor") return 20;
  if (plan === "premium_vendor") return 10;
  if (plan === "basic_vendor") return 5;
  return 0;
}

function planAiTrustLevel(plan: PlanKey) {
  if (plan === "hub_vendor") return "🔥 AI VERIFIED (MAX TRUST)";
  if (plan === "premium_vendor") return "⭐ AI VERIFIED";
  if (plan === "basic_vendor") return "🔵 AI BOOSTED";
  return "⚪ STANDARD";
}

function planLeadPrediction(plan: PlanKey) {
  if (plan === "hub_vendor") {
    return {
      multiplier: "5x",
      leads: "12–20",
      label: "Maximum buyer visibility",
    };
  }

  if (plan === "premium_vendor") {
    return {
      multiplier: "3x–4x",
      leads: "8–12",
      label: "Strong premium visibility",
    };
  }

  if (plan === "basic_vendor") {
    return {
      multiplier: "2x",
      leads: "4–7",
      label: "Better than free visibility",
    };
  }

  return {
    multiplier: "1x",
    leads: "0–3",
    label: "Limited free visibility",
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
  const [isActive, setIsActive] = useState<boolean>(true);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // if listingId is missing, show a clear banner (do NOT break the page)
  const listingIdMissing = !listingId || String(listingId).trim().length < 6;

  const activePrediction = planLeadPrediction(activePlan);
  const goldPrediction = planLeadPrediction("premium_vendor");
  const platinumPrediction = planLeadPrediction("hub_vendor");

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

  // 2) Load active plan from business_profiles
  useEffect(() => {
    if (!user?.id) return;

    let alive = true;

    (async () => {
      const { data, error } = await supabase
        .from("business_profiles")
        .select("subscription_plan,subscription_status,subscription_expires_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!alive) return;

      if (!error && data?.subscription_plan) {
        const pk = String(data.subscription_plan) as PlanKey;
        const status = String(data.subscription_status || "free");
        const exp = data.subscription_expires_at || null;
        const expMs = exp ? new Date(exp).getTime() : 0;

        if (
          pk === "free" ||
          pk === "basic_vendor" ||
          pk === "premium_vendor" ||
          pk === "hub_vendor"
        ) {
          setActivePlan(pk);
        }

        setExpiresAt(exp);
        setIsActive(
          pk === "free" ||
            (status === "active" &&
              (!exp || (Number.isFinite(expMs) && expMs > Date.now())))
        );
      } else {
        setActivePlan("free");
        setIsActive(true);
        setExpiresAt(null);
      }
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

      const { error: requestError } = await supabase
        .from("business_profiles")
        .update({
          subscription_plan: plan,
          subscription_status: "requested",
          subscription_expires_at: null,
        })
        .eq("user_id", user.id);

      if (requestError) {
        console.warn("subscription request update failed:", requestError.message);
      }

      setActivePlan(plan);
      setIsActive(false);
      setExpiresAt(null);

      setMsg(
        "✅ Plan request submitted. Online payment is coming soon. Admin can now manually activate this plan after payment confirmation."
      );
    } catch (e: any) {
      console.warn("subscription purchase intent tracking failed:", e?.message || e);
      setMsg(
        "Payment is coming soon. Please contact admin for manual activation of this plan."
      );
    } finally {
      setSaving(false);
    }
  }

  async function activatePlan(plan: PlanKey) {
    if (!user?.id) return;

    setSaving(true);
    setMsg(null);
    setErr(null);

    try {
      if (plan !== "free") {
        setMsg(
          "Paid subscription checkout is not connected yet. Please contact admin to activate this vendor plan."
        );
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from("business_profiles")
        .update({
          subscription_plan: "free",
          subscription_status: "free",
          subscription_expires_at: null,
        })
        .eq("user_id", user.id);

      if (error) {
        console.warn("business_profiles subscription update error:", error.message);
      }

      setActivePlan("free");
      setIsActive(true);
      setExpiresAt(null);
      setMsg("✅ FREE plan is active. Continuing…");

      router.replace(returnTo);
    } catch (e: any) {
      setErr(e?.message || "Failed to activate plan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="subPage">
      <div className="wrap">
        <div className="head">
          <div>
            <div className="kicker">Subscription</div>
            <h1 className="h1">Subscription & Plans</h1>
            <p className="p">
              {focus === "boost"
                ? "Recover missed leads by boosting your visibility in AI vendor matching."
                : focus === "ai"
                ? "Improve deal closing with AI-powered replies and smarter follow-ups."
                : focus === "premium"
                ? "Maintain top vendor position with maximum visibility and priority ranking."
                : "3Bigha is a listing & discovery platform. Vendors sell directly to buyers. We charge only subscription (no commission)."}
            </p>
          </div>

          <div className="actions">
            <Link className="btn btnOutline" href={returnTo}>
              Go to your listing
            </Link>
            <Link className="btn btnOutline" href="/dashboard">
              Back to Dashboard
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
            {focus === "boost" ? (
              <div className="alert alertWarn" style={{ borderColor: "#f97316", background: "#fff7ed" }}>
                <b>⚠️ You are missing potential leads.</b>
                <div style={{ marginTop: 6 }}>
                  Upgrade visibility so more buyer RFQs reach you first.
                </div>
              </div>
            ) : focus === "ai" ? (
              <div className="alert" style={{ borderColor: "#2563eb", background: "#eff6ff", color: "#1e3a8a" }}>
                <b>⚠️ Your deal conversion needs improvement.</b>
                <div style={{ marginTop: 6 }}>
                  Use AI-powered replies and better follow-ups to close more deals.
                </div>
              </div>
            ) : focus === "premium" ? (
              <div className="alert" style={{ borderColor: "#059669", background: "#ecfdf5", color: "#064e3b" }}>
                <b>🏆 Premium visibility recommended.</b>
                <div style={{ marginTop: 6 }}>
                  Maintain stronger ranking and stay ahead of competing vendors.
                </div>
              </div>
            ) : listingIdMissing ? (
              <div className="alert alertWarn">
                <b>Missing listingId:</b> This page was opened without a valid listing id.
                <div style={{ marginTop: 6 }}>
                  You can still choose a plan, but the system won’t be able to link it to a specific listing.
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
                <b>Current plan:</b>{" "}
                {activePlan.replaceAll("_", " ").toUpperCase()}{" "}
                {isActive ? "✅" : "⚠️"}
              </div>
              {expiresAt ? (
                <div className="pill">
                  <b>Expiry:</b> {new Date(expiresAt).toLocaleDateString()}
                </div>
              ) : null}
            </div>

            <div className="revenueHero">
              <div>
                <div className="revenueKicker">AI Boost Monetization</div>
                <div className="revenueTitle">
                  {focus === "boost"
                    ? "Recover missed leads with stronger AI boost visibility"
                    : focus === "ai"
                    ? "Improve deal closing with AI-assisted vendor growth"
                    : focus === "premium"
                    ? "Stay ahead with premium vendor visibility"
                    : "Get more buyer RFQs with AI-powered vendor ranking"}
                </div>
                <div className="revenueText">
                  {focus === "boost"
                    ? "Your vendor dashboard found missed lead opportunities. Upgrade visibility so more buyer RFQs reach you first."
                    : focus === "ai"
                    ? "Use AI-powered visibility and smarter follow-ups to convert more conversations into completed deals."
                    : focus === "premium"
                    ? "Keep your ranking strong with higher boost power, premium trust signals, and maximum buyer visibility."
                    : "3Bigha now ranks vendors using AI price accuracy, buyer matching intelligence, and subscription boost power. Higher plans unlock AI VERIFIED status and dominate buyer visibility."}
                </div>
              </div>

              <div className="revenueScore">
                <div className="scoreLabel">Your AI visibility score</div>
                <div className="scoreValue">+{planAiBoostPower(activePlan)}</div>

                <div style={{ marginTop: 8, fontWeight: 900, fontSize: 14 }}>
                  {planAiTrustLevel(activePlan)}
                </div>
                <div className="scoreHint">
                  Vendors with higher AI trust level get significantly more RFQs and appear earlier in buyer matching.
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                borderRadius: 18,
                padding: 16,
                border: "1px solid #fde68a",
                background: "linear-gradient(135deg, #fffbeb, #ffffff)",
                boxShadow: "0 12px 28px rgba(245,158,11,0.10)",
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 950, color: "#92400e" }}>
                📈 Predictive Revenue Engine
              </div>

              <div style={{ marginTop: 6, fontSize: 13, color: "#475569", fontWeight: 800, lineHeight: 1.6 }}>
                Estimate how your visibility may improve when your vendor plan is upgraded.
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                  gap: 10,
                }}
              >
                <div style={{ border: "1px solid #fed7aa", borderRadius: 14, padding: 12, background: "#fff" }}>
                  <div style={{ fontSize: 12, color: "#92400e", fontWeight: 900 }}>Current Plan</div>
                  <div style={{ marginTop: 4, fontSize: 22, fontWeight: 950, color: "#111827" }}>
                    {activePrediction.multiplier}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12, color: "#64748b", fontWeight: 800 }}>
                    {activePrediction.leads} expected enquiries / week
                  </div>
                </div>

                <div style={{ border: "1px solid #bfdbfe", borderRadius: 14, padding: 12, background: "#eff6ff" }}>
                  <div style={{ fontSize: 12, color: "#1d4ed8", fontWeight: 900 }}>Gold Upgrade</div>
                  <div style={{ marginTop: 4, fontSize: 22, fontWeight: 950, color: "#1d4ed8" }}>
                    {goldPrediction.multiplier}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12, color: "#1e3a8a", fontWeight: 800 }}>
                    {goldPrediction.leads} expected enquiries / week
                  </div>
                </div>

                <div style={{ border: "1px solid #fecaca", borderRadius: 14, padding: 12, background: "#fff1f2" }}>
                  <div style={{ fontSize: 12, color: "#be123c", fontWeight: 900 }}>Platinum Upgrade</div>
                  <div style={{ marginTop: 4, fontSize: 22, fontWeight: 950, color: "#be123c" }}>
                    {platinumPrediction.multiplier}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12, color: "#7f1d1d", fontWeight: 800 }}>
                    {platinumPrediction.leads} expected enquiries / week
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 10, fontSize: 12, color: "#78716c", fontWeight: 800 }}>
                Prediction is an estimate based on AI boost power, ranking priority, and buyer visibility logic.
              </div>
            </div>

            <div className="alert alertWarn">
              <b>Payment Safe Mode:</b> Online payment is not active yet. Plan requests are recorded now, and Razorpay checkout will be enabled only after GST, current bank account, and legal setup are complete.
            </div>

            <div className="grid">
              <PlanCard
                title="FREE"
                price="₹0 / month"
                bullets={[
                  "Basic listing access",
                  "Standard visibility",
                  "Best for trial and district-free onboarding",
                ]}
                active={activePlan === "free" && isActive}
                cta={
                  saving
                    ? "Please wait…"
                    : activePlan === "free" && isActive
                    ? "Active"
                    : "Activate FREE"
                }
                disabled={saving || (activePlan === "free" && isActive)}
                onClick={() => activatePlan("free")}
              />

              <PlanCard
                title="SILVER AI BOOST"
                price="₹499 / month"
                boost="+5 AI Boost"
                highlight={focus === "boost" ? "Recommended for missed leads" : "Starter revenue plan"}
                recommended={focus === "boost"}
                bullets={[
                  "Better RFQ visibility than free vendors",
                  "AI ranking advantage in buyer matching",
                  "Suitable for small local sellers",
                ]}
                active={activePlan === "basic_vendor" && isActive}
                cta={activePlan === "basic_vendor" && isActive ? "Active" : saving ? "Please wait…" : "Request Silver Activation"}
                disabled={saving || (activePlan === "basic_vendor" && isActive)}
                onClick={() => handlePayment("basic_vendor")}
              />

              <PlanCard
                title="⭐ GOLD AI BOOST"
                price="₹999 / month"
                boost="+10 AI Boost"
                highlight={focus === "ai" ? "Recommended for deal closing" : "Most popular"}
                recommended={focus === "ai"}
                bullets={[
                  "Strong AI ranking advantage",
                  "Premium Vendor badge in Price Today",
                  "Higher chance of RFQ + buyer chat routing",
                ]}
                active={activePlan === "premium_vendor" && isActive}
                cta={activePlan === "premium_vendor" && isActive ? "Active" : saving ? "Please wait…" : "Request Gold Activation"}
                disabled={saving || (activePlan === "premium_vendor" && isActive)}
                onClick={() => handlePayment("premium_vendor")}
              />

              <PlanCard
                title="🔥 PLATINUM HUB BOOST"
                price="₹1999 / month"
                boost="+20 AI Boost"
                highlight={focus === "premium" ? "Recommended for top visibility" : "Maximum visibility"}
                recommended={focus === "premium"}
                bullets={[
                  "Highest AI vendor matching priority",
                  "Best RFQ visibility across categories",
                  "Ideal for large suppliers and multi-category vendors",
                ]}
                active={activePlan === "hub_vendor" && isActive}
                cta={activePlan === "hub_vendor" && isActive ? "Active" : saving ? "Please wait…" : "Request Platinum Activation"}
                disabled={saving || (activePlan === "hub_vendor" && isActive)}
                onClick={() => handlePayment("hub_vendor")}
              />
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
          display: flex;
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
          padding: 18px;
          display: flex;
          justify-content: space-between;
          gap: 18px;
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
        .subPage .grid {
          margin-top: 14px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        @media (max-width: 920px) {
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
