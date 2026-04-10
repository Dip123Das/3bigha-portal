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

        if (!profile.is_profile_complete) {
          router.replace("/onboarding/business");
          return;
        }

        // If everything is fine → go to dashboard
        router.replace("/dashboard");
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