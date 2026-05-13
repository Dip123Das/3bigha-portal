"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

export default function AwaitingApprovalPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [msg, setMsg] = useState("Checking your account…");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data.session?.user ?? null;

        if (!alive) return;

        if (!user?.id) {
          setMsg("No session found. Redirecting…");
          setTimeout(() => router.replace("/login"), 800);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role,is_profile_complete")
          .eq("id", user.id)
          .maybeSingle();

        if (!alive) return;

        if (!profile) {
          router.replace("/auth/register-role");
          return;
        }

        if (!profile.role) {
          router.replace("/auth/register-role");
          return;
        }

        const businessProfileRes = await supabase
          .from("business_profiles")
          .select(
            "nature_of_business,is_complete,registration_complete,business_profile_complete"
          )
          .eq("user_id", user.id)
          .maybeSingle();

        const businessProfile = businessProfileRes.data as any;

        const hasVendorCapabilities =
          Array.isArray(businessProfile?.nature_of_business) &&
          businessProfile.nature_of_business.length > 0;

        const progressiveVendorReady =
          hasVendorCapabilities ||
          businessProfile?.is_complete === true ||
          businessProfile?.registration_complete === true ||
          businessProfile?.business_profile_complete === true;

        if (!progressiveVendorReady) {
          router.replace("/onboarding/business");
          return;
        }

        router.replace("/dashboard/vendor");
      } catch (e) {
        console.error("AWAITING_APPROVAL_REDIRECT_FAIL", e);
        if (!alive) return;
        setMsg("Something went wrong. Redirecting…");
        setTimeout(() => router.replace("/"), 1000);
      }
    })();

    return () => {
      alive = false;
    };
  }, [router, supabase]);

  return (
    <main style={{ padding: "40px 20px" }}>
      <div
        style={{
          maxWidth: 640,
          margin: "0 auto",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 16,
          padding: 24,
          background: "white",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 10 }}>
          Redirecting…
        </div>

        <div style={{ fontSize: 14, opacity: 0.8 }}>
          {msg}
        </div>
      </div>
    </main>
  );
}