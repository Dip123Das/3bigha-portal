"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type ReviewState = {
  approvalStatus: string;
  plan: string;
  subscriptionStatus: string;
};

function hasActivatedPaidSubscription(state: ReviewState) {
  return (
    state.plan !== "" &&
    state.plan !== "free" &&
    ["active", "approved", "paid", "trialing"].includes(state.subscriptionStatus)
  );
}

export default function AwaitingApprovalPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [state, setState] = useState<ReviewState | null>(null);
  const [msg, setMsg] = useState("Checking your registration status…");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data.session?.user ?? null;
        if (!user?.id) {
          router.replace("/login");
          return;
        }

        const [{ data: profile }, { data: businessProfile }] = await Promise.all([
          supabase
            .from("profiles")
            .select("role,approval_status")
            .eq("id", user.id)
            .maybeSingle(),
          supabase
            .from("business_profiles")
            .select("subscription_plan,subscription_status")
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);

        if (!alive) return;
        if (!profile?.role) {
          router.replace("/auth/register-role");
          return;
        }

        const nextState = {
          approvalStatus: String(profile.approval_status || "pending").toLowerCase(),
          plan: String(businessProfile?.subscription_plan || "free").toLowerCase(),
          subscriptionStatus: String(
            businessProfile?.subscription_status || "free"
          ).toLowerCase(),
        };
        setState(nextState);

        if (nextState.approvalStatus === "approved") {
          if (hasActivatedPaidSubscription(nextState)) {
            router.replace("/dashboard/vendor");
            return;
          }
          setMsg("Your identity is approved. Activate a subscription to begin operational work.");
          return;
        }

        if (nextState.approvalStatus === "rejected") {
          setMsg("Your registration needs correction. Please contact support or update the requested details.");
          return;
        }

        setMsg("Your registration was received and is waiting for Master Admin review.");
      } catch (error) {
        console.error("REGISTRATION_STATUS_CHECK_FAILED", error);
        if (alive) setMsg("We could not check your status. Please try again.");
      }
    })();

    return () => {
      alive = false;
    };
  }, [router, supabase]);

  const approved = state?.approvalStatus === "approved";

  return (
    <main style={{ padding: "48px 20px", minHeight: "70vh", background: "#f8fafc" }}>
      <section style={{ maxWidth: 720, margin: "0 auto", background: "white", border: "1px solid #e2e8f0", borderRadius: 18, padding: 28, boxShadow: "0 16px 40px rgba(15,23,42,.08)" }}>
        <div style={{ color: "#1d4ed8", fontWeight: 900, fontSize: 13, textTransform: "uppercase", letterSpacing: ".06em" }}>
          Registration status
        </div>
        <h1 style={{ margin: "10px 0", fontSize: 30 }}>
          {approved ? "Identity approved" : "Registration submitted"}
        </h1>
        <p style={{ color: "#475569", lineHeight: 1.7 }}>{msg}</p>

        <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
          {[
            ["1", "Identity and business details", "Completed"],
            ["2", "Master Admin review", approved ? "Approved" : "Pending"],
            ["3", "Subscription activation", hasActivatedPaidSubscription(state || { approvalStatus: "", plan: "", subscriptionStatus: "" }) ? "Active" : "Required"],
            ["4", "Operational dashboard", approved && hasActivatedPaidSubscription(state || { approvalStatus: "", plan: "", subscriptionStatus: "" }) ? "Available" : "Locked"],
          ].map(([number, label, status]) => (
            <div key={number} style={{ display: "grid", gridTemplateColumns: "36px 1fr auto", gap: 12, alignItems: "center", padding: 14, border: "1px solid #e2e8f0", borderRadius: 12 }}>
              <strong style={{ display: "grid", placeItems: "center", width: 32, height: 32, borderRadius: 999, background: "#eff6ff", color: "#1d4ed8" }}>{number}</strong>
              <span style={{ fontWeight: 800 }}>{label}</span>
              <span style={{ color: status === "Locked" || status === "Pending" || status === "Required" ? "#b45309" : "#15803d", fontWeight: 900 }}>{status}</span>
            </div>
          ))}
        </div>

        {approved && !hasActivatedPaidSubscription(state || { approvalStatus: "", plan: "", subscriptionStatus: "" }) ? (
          <button type="button" onClick={() => router.push("/dashboard/subscription?reason=activation_required")} style={{ marginTop: 24, padding: "12px 18px", border: 0, borderRadius: 10, background: "#2563eb", color: "white", fontWeight: 900, cursor: "pointer" }}>
            Choose and activate subscription
          </button>
        ) : null}
      </section>
    </main>
  );
}
