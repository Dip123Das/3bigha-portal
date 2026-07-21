"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import {
  getDefaultPostLoginPath,
  resolveAccessForUser,
} from "@/lib/access/resolveAccess";

function safeNextPath(raw: string | null) {
  if (!raw) return "";
  if (!raw.startsWith("/")) return "";
  if (raw.startsWith("//")) return "";
  return raw;
}

function hardRedirect(path: string) {
  if (typeof window === "undefined") return;

  const target = path || "/";
  const current = window.location.pathname + window.location.search;

  if (current === target || window.location.pathname === target) return;

  window.location.href = target;
}

function hasValue(v: unknown) {
  return typeof v === "string" ? v.trim().length > 0 : !!v;
}

function isBusinessRole(role: string | null | undefined) {
  return ["vendor", "builder", "hub_vendor", "blogger"].includes(
    (role || "").trim().toLowerCase()
  );
}

function normalizeRole(raw: string | null | undefined) {
  return (raw || "").trim().toLowerCase();
}

export default function PostLoginPageClient() {
  const sp = useSearchParams();
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [msg, setMsg] = useState("Preparing your access…");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const next = safeNextPath(sp.get("next"));

        setMsg("Checking your session…");

        const sessionRes = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error("Post-login session lookup timed out after 4000ms")
                ),
              4000
            )
          ),
        ]);

        if (!alive) return;

        const session = (sessionRes as any)?.data?.session ?? null;
        const user = session?.user ?? null;

        if (!user?.id) {
          setMsg("No active session found. Redirecting to login…");
          setTimeout(() => {
            hardRedirect(
              `/login${next ? `?next=${encodeURIComponent(next)}` : ""}`
            );
          }, 800);
          return;
        }

        setMsg("Checking your account setup…");

        const profileRes = await Promise.race([
          supabase
            .from("profiles")
            .select(
              [
                "id",
                "email",
                "role",
                "requested_role",
                "is_vendor",
                "approval_status",
                "full_name",
                "phone",
                "city",
                "state",
                "onboarding_version",
                "onboarding_completed",
                "portal_use_reason",
                "role_display_label",
              ].join(",")
            )
            .eq("id", user.id)
            .maybeSingle(),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("Profile lookup timed out after 4000ms")),
              4000
            )
          ),
        ]);

        if (!alive) return;

        const profile = (profileRes as any)?.data ?? null;
        const profileError = (profileRes as any)?.error ?? null;

        if (profileError) {
          console.error("POST_LOGIN_V7_PROFILE_LOOKUP_ERROR", profileError);
        }

        if (!profile?.id) {
          setMsg("Preparing your account…");

          const upsertRes = await Promise.race([
            supabase.from("profiles").upsert(
              {
                id: user.id,
                email: user.email ?? null,
                role: null,
                requested_role: null,
                is_vendor: false,
                onboarding_version: null,
                onboarding_completed: false,
                portal_use_reason: null,
                role_display_label: null,
              },
              { onConflict: "id" }
            ),
            new Promise<never>((_, reject) =>
              setTimeout(
                () =>
                  reject(new Error("Profile creation timed out after 4000ms")),
                4000
              )
            ),
          ]);

          const upsertError = (upsertRes as any)?.error ?? null;

          if (upsertError) {
            console.error("POST_LOGIN_V7_PROFILE_CREATE_ERROR", upsertError);
            setMsg("Could not prepare your registration. Redirecting…");
            setTimeout(() => {
              hardRedirect("/");
            }, 1000);
            return;
          }

          hardRedirect(
            `/auth/register-role${next ? `?next=${encodeURIComponent(next)}` : ""}`
          );
          return;
        }

        if (!profile.email && user.email) {
          await supabase
            .from("profiles")
            .update({ email: user.email })
            .eq("id", user.id);
        }

        const role = normalizeRole(profile.role);

        // 🚀 MASTER ADMIN FULL BYPASS (FINAL FIX)
        if (role === "master_admin") {
          hardRedirect(next || "/admin/dashboard");
          return;
        }

        // MASTER ADMIN MUST NEVER BE SENT TO REGISTER-ROLE.
        if (role === "master_admin") {
          hardRedirect(next || "/admin/dashboard");
          return;
        }

        if (!role) {
          hardRedirect(
            `/auth/register-role${next ? `?next=${encodeURIComponent(next)}` : ""}`
          );
          return;
        }

        const basicComplete =
          hasValue(profile.full_name) &&
          hasValue(profile.phone) &&
          hasValue(profile.city) &&
          hasValue(profile.state);

        const onboardingReady =
          Number(profile.onboarding_version || 0) >= 2 &&
          profile.onboarding_completed === true &&
          hasValue(profile.portal_use_reason) &&
          hasValue(profile.role_display_label);

        const patch: Record<string, any> = {};

        if (!profile.requested_role && role) {
          patch.requested_role = role;
        }

        if (Object.keys(patch).length > 0) {
          const patchRes = await supabase
            .from("profiles")
            .update(patch)
            .eq("id", user.id);

          if ((patchRes as any)?.error) {
            console.error(
              "POST_LOGIN_V7_PROFILE_PATCH_ERROR",
              (patchRes as any).error
            );
          }
        }

        if (role !== "master_admin" && !basicComplete) {
          const qs = new URLSearchParams();
          if (next) qs.set("next", next);
          if (role) qs.set("role", role);

          hardRedirect(`/auth/register-role?${qs.toString()}`);
          return;
        }

        if (role !== "master_admin" && !onboardingReady) {
          if (isBusinessRole(role)) {
            const qs = new URLSearchParams();
            qs.set("returnTo", next || "/dashboard/vendor");
            if (role) qs.set("role", role);

            const businessProfileRes = await supabase
              .from("business_profiles")
              .select("nature_of_business,is_complete,registration_complete,business_profile_complete")
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
              hardRedirect(`/onboarding/business?${qs.toString()}`);
              return;
            }

            hardRedirect(next || "/dashboard/vendor");
            return;
          }

          const qs = new URLSearchParams();
          if (next) qs.set("next", next);
          if (role) qs.set("role", role);

          hardRedirect(`/auth/register-role?${qs.toString()}`);
          return;
        }

        if (role !== "master_admin" && isBusinessRole(role)) {
          setMsg("Checking district-free access eligibility…");

          const businessProfileRes = await supabase
            .from("business_profiles")
            .select("eligible_free, location_verification_status")
            .eq("user_id", user.id)
            .maybeSingle();

          const businessProfile = businessProfileRes.data;

          const locationVerified =
            (businessProfile?.location_verification_status || "")
              .trim()
              .toLowerCase() === "verified";

          if (!locationVerified) {
            // Progressive onboarding: allow vendor dashboard entry after business capability selection.
            hardRedirect(next || "/dashboard/vendor");
            return;
          }

          if (businessProfile?.eligible_free !== true) {
            hardRedirect(
              "/dashboard/subscription?reason=district_free_not_eligible"
            );
            return;
          }
        }

        setMsg("Preparing your dashboard…");

        let redirectTo = next || "/dashboard";

        try {
          const access = await Promise.race([
            resolveAccessForUser(supabase, user.id, user.email ?? null),
            new Promise<never>((_, reject) =>
              setTimeout(
                () =>
                  reject(new Error("Access resolution timed out after 3000ms")),
                3000
              )
            ),
          ]);

          if (!alive) return;

          redirectTo = next || getDefaultPostLoginPath(access);
        } catch (accessErr) {
          console.error("POST_LOGIN_V7_ACCESS_FALLBACK", accessErr);
          redirectTo = next || "/";
        }

        hardRedirect(redirectTo);
      } catch (e: any) {
        console.error("POST_LOGIN_V7_FAIL", e);

        if (!alive) return;

        const next = safeNextPath(sp.get("next"));
        setMsg(`Could not complete login routing: ${e?.message || "Unknown error"}`);

        setTimeout(() => {
          hardRedirect(next || "/");
        }, 1000);
      }
    })();

    return () => {
      alive = false;
    };
  }, [sp, supabase]);

  return (
    <main style={{ padding: "40px 20px" }}>
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 12,
          padding: 14,
          background: "white",
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 8 }}>
          Signing you in
        </div>
        <div style={{ opacity: 0.8 }}>{msg}</div>
      </div>
    </main>
  );
}
