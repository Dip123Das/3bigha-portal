"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

const BOOST_PLANS = [
  {
    key: "boost_starter",
    name: "Starter Boost",
    desc: "Improve ranking visibility for 3 days",
    price: "₹199",
    highlight: false,
  },
  {
    key: "boost_pro",
    name: "Pro Boost 🔥",
    desc: "High priority ranking for 7 days",
    price: "₹499",
    highlight: true,
  },
  {
    key: "boost_elite",
    name: "Elite Boost 🚀",
    desc: "Top ranking priority for 15 days",
    price: "₹999",
    highlight: false,
  },
];

export default function BoostPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function activatePlan(plan: string) {
    setBusyPlan(plan);
    setMessage(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.push("/login?next=/dashboard/subscription/boost");
        return;
      }

      const res = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan }),
      });

      const json = await res.json();

      if (!res.ok) {
        setMessage(json?.error || "Failed to prepare boost order");
        return;
      }

      if (json?.payment_enabled === false) {
        setMessage(
          "✅ Boost request saved. Payment is coming soon, so no live transaction has been started."
        );
        return;
      }

      setMessage("Payment gateway will open here after Razorpay activation.");
    } catch (e: any) {
      setMessage(e?.message || "Something went wrong");
    } finally {
      setBusyPlan(null);
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 880, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 950 }}>
        🚀 Boost Your Visibility
      </h1>

      <div style={{ marginTop: 10, color: "#6b7280", fontWeight: 800 }}>
        Higher visibility → More buyer leads → More deals
      </div>

      <div
        style={{
          marginTop: 16,
          border: "1px solid #fed7aa",
          background: "linear-gradient(135deg, #fff7ed, #ffffff)",
          borderRadius: 16,
          padding: 14,
          fontWeight: 850,
          color: "#7c2d12",
        }}
      >
        Payment is currently disabled until GST, current bank account, and Razorpay
        activation are completed. This page prepares the full boost infrastructure safely.
      </div>

      {message ? (
        <div
          style={{
            marginTop: 14,
            border: "1px solid #bbf7d0",
            background: "#ecfdf5",
            color: "#065f46",
            borderRadius: 14,
            padding: 12,
            fontWeight: 900,
          }}
        >
          {message}
        </div>
      ) : null}

      <div style={{ marginTop: 20, display: "grid", gap: 16 }}>
        {BOOST_PLANS.map((plan) => (
          <div
            key={plan.key}
            style={{
              border: plan.highlight ? "2px solid #f59e0b" : "1px solid #ddd",
              borderRadius: 18,
              padding: 18,
              background: plan.highlight
                ? "linear-gradient(135deg, #fffbeb, #ffffff)"
                : "white",
              boxShadow: plan.highlight
                ? "0 14px 30px rgba(245,158,11,0.16)"
                : "0 10px 24px rgba(15,23,42,0.06)",
            }}
          >
            <div style={{ fontWeight: 950, fontSize: 19 }}>
              {plan.name}
            </div>

            <div style={{ marginTop: 6, fontSize: 14, color: "#4b5563", fontWeight: 750 }}>
              {plan.desc}
            </div>

            <div style={{ marginTop: 10, fontSize: 24, fontWeight: 950 }}>
              {plan.price}
            </div>

            <button
              type="button"
              disabled={busyPlan === plan.key}
              style={{
                marginTop: 12,
                background: plan.highlight ? "#f59e0b" : "#111827",
                color: "white",
                padding: "10px 14px",
                borderRadius: 12,
                fontWeight: 950,
                border: "none",
                cursor: busyPlan === plan.key ? "not-allowed" : "pointer",
                opacity: busyPlan === plan.key ? 0.65 : 1,
              }}
              onClick={() => activatePlan(plan.key)}
            >
              {busyPlan === plan.key ? "Preparing..." : "Activate Boost"}
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => router.back()}
        style={{
          marginTop: 20,
          background: "#f3f4f6",
          padding: "8px 12px",
          borderRadius: 10,
          border: "none",
          fontWeight: 900,
          cursor: "pointer",
        }}
      >
        ← Back
      </button>
    </div>
  );
}