"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import {
  getDefaultPostLoginPath,
  resolveAccessForUser,
} from "@/lib/access/resolveAccess";

export default function DashboardEntryPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [message, setMessage] = useState("Checking your dashboard access...");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const { data: sessionRes, error: sessionErr } =
          await supabase.auth.getSession();

        if (!alive) return;

        if (sessionErr) {
          setMessage(sessionErr.message || "Unable to load session.");
          return;
        }

        const session = sessionRes.session;

        if (!session?.user?.id) {
          router.replace("/login?next=/dashboard");
          return;
        }

        const access = await resolveAccessForUser(
          supabase,
          session.user.id,
          session.user.email ?? null
        );

        const profileRes = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();

        const role = (profileRes.data?.role || "").trim().toLowerCase();
        const isBusinessRole = ["vendor", "builder", "hub_vendor", "blogger"].includes(role);

        if (isBusinessRole) {
          const businessProfileRes = await supabase
            .from("business_profiles")
            .select("eligible_free, location_verification_status")
            .eq("user_id", session.user.id)
            .maybeSingle();

          const bp = businessProfileRes.data;

          const locationVerified =
            (bp?.location_verification_status || "").trim().toLowerCase() === "verified";

          if (!locationVerified) {
            router.replace("/onboarding/business?returnTo=/dashboard");
            return;
          }

          if (bp?.eligible_free !== true) {
            router.replace("/dashboard/subscription?reason=district_free_not_eligible");
            return;
          }
        }

        if (!alive) return;

        const target = getDefaultPostLoginPath(access);

        if (!target || target === "/dashboard") {
          if (access.isBuyer) {
            router.replace("/dashboard/buyer");
            return;
          }

          router.replace("/auth/register-role?next=/dashboard");
          return;
        }

        router.replace(target);
      } catch (e: any) {
        if (!alive) return;
        setMessage(e?.message || "Something went wrong while opening your dashboard.");
      }
    })();

    return () => {
      alive = false;
    };
  }, [router, supabase]);

  return (
    <div className="container pageBody" style={{ paddingTop: 16 }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>My Dashboard</h1>
      <div style={{ opacity: 0.8 }}>{message}</div>
    </div>
  );
}