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

function buildSelfUrl(params: { source: string; listingId: string | null; returnTo: string }) {
  const q = new URLSearchParams();
  q.set("source", params.source);
  if (params.listingId) q.set("listingId", params.listingId);
  q.set("return", params.returnTo);
  return `/dashboard/subscription?${q.toString()}`;
}

export default function SubscriptionPageClient() {
  useEffect(() => {
  const script = document.createElement("script");
  script.src = "https://checkout.razorpay.com/v1/checkout.js";
  script.async = true;
  document.body.appendChild(script);
}, []);
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const router = useRouter();
  const sp = useSearchParams();

  const source = sp.get("source") || "unknown";
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

          const nextUrl = buildSelfUrl({ source, listingId, returnTo });
          router.replace(`/login?next=${encodeURIComponent(nextUrl)}`);
          return;
        }

        const sess = data.session;
        if (!sess?.user?.id) {
          setUser(null);
          setLoading(false);

          const nextUrl = buildSelfUrl({ source, listingId, returnTo });
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

  async function handlePayment(plan: string) {
  try {
    const res = await fetch("/api/payment/create-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ plan }),
    });

    const order = await res.json();

    if (!order.id) {
      alert("Order creation failed");
      return;
    }

    const supabase = (await import("@/lib/supabaseBrowser")).getSupabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const options: any = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      name: "3Bigha",
      description: "Subscription Payment",
      order_id: order.id,
      handler: async function (response: any) {
        await fetch("/api/payment/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...response,
            plan,
            user_id: user?.id,
          }),
        });

        alert("Payment successful 🎉");
        window.location.reload();
      },
      theme: {
        color: "#f59e0b",
      },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  } catch (e) {
    console.error(e);
    alert("Payment failed");
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
              3Bigha is a listing & discovery platform. Vendors sell directly to buyers.
              We charge only subscription (no commission).
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
            {listingIdMissing ? (
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
                title="BASIC VENDOR"
                price="₹499 / month"
                bullets={[
                  "Boost priority level 5",
                  "Better RFQ targeting than free vendors",
                  "Suitable for small local sellers",
                ]}
                active={activePlan === "basic_vendor" && isActive}
                cta={activePlan === "basic_vendor" && isActive ? "Active" : "Pay ₹499"}
                disabled={saving || (activePlan === "basic_vendor" && isActive)}
                onClick={() => handlePayment("basic_vendor")}
              />

              <PlanCard
                title="⭐ PREMIUM VENDOR"
                price="₹999 / month"
                bullets={[
                  "Boost priority level 10",
                  "Premium Vendor badge in Price Today",
                  "Higher chance of RFQ + buyer chat routing",
                ]}
                active={activePlan === "premium_vendor" && isActive}
                cta={activePlan === "premium_vendor" && isActive ? "Active" : "Pay ₹999"}
                disabled={saving || (activePlan === "premium_vendor" && isActive)}
                onClick={() => handlePayment("premium_vendor")}
              />

              <PlanCard
                title="🔥 HUB VENDOR"
                price="₹1999 / month"
                bullets={[
                  "Boost priority level 20",
                  "Highest RFQ visibility across categories",
                  "Best for large suppliers and multi-category vendors",
                ]}
                active={activePlan === "hub_vendor" && isActive}
                cta={activePlan === "hub_vendor" && isActive ? "Active" : "Pay ₹1999"}
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
  bullets: string[];
  active: boolean;
  cta: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <div className="card">
      <div className="cardTop">
        <div>
          <div className="cardTitle">{props.title}</div>
          <div className="cardPrice">{props.price}</div>
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
