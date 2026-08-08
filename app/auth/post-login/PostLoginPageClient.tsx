"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import {
  resolveCanonicalIdentity,
} from "@/lib/identity/resolveCanonicalIdentity";
import {
  resolveRegistrationState,
  type RegistrationStateInput,
} from "@/lib/registration/resolveRegistrationState";

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

function hasValue(value: unknown) {
  return typeof value === "string"
    ? value.trim().length > 0
    : Boolean(value);
}

function normalizeRole(raw: string | null | undefined) {
  return String(raw || "").trim().toLowerCase();
}

function isBusinessRole(role: string | null | undefined) {
  return ["vendor", "builder", "hub_vendor", "blogger"].includes(
    normalizeRole(role)
  );
}

function registrationQuery(options: {
  next?: string;
  role?: string;
  business?: boolean;
}) {
  const query = new URLSearchParams();

  if (options.business) {
    query.set("returnTo", options.next || "/dashboard/workspace");
    query.set("registration", "1");
  } else if (options.next) {
    query.set("next", options.next);
  }

  if (options.role) query.set("role", options.role);

  return query.toString();
}

export default function PostLoginPageClient() {
  const searchParams = useSearchParams();
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [msg, setMsg] = useState("Preparing your access…");

  useEffect(() => {
    let alive = true;

    async function runPostLogin() {
      try {
        const next = safeNextPath(searchParams.get("next"));

        setMsg("Checking your session…");

        const sessionResult = await Promise.race([
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

        const session = (sessionResult as any)?.data?.session ?? null;
        const user = session?.user ?? null;

        if (!user?.id) {
          setMsg("No active session found. Redirecting to login…");

          window.setTimeout(() => {
            hardRedirect(
              `/login${next ? `?next=${encodeURIComponent(next)}` : ""}`
            );
          }, 800);

          return;
        }

        setMsg("Checking your account setup…");

        const profileResult = await Promise.race([
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
                "account_status",
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

        let profile = (profileResult as any)?.data ?? null;
        const profileError = (profileResult as any)?.error ?? null;

        if (profileError) {
          console.error("POST_LOGIN_STATE_PROFILE_LOOKUP_ERROR", profileError);
        }

        if (!profile?.id) {
          setMsg("Preparing your account…");

          const createResult = await Promise.race([
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

          const createError = (createResult as any)?.error ?? null;

          if (createError) {
            console.error(
              "POST_LOGIN_STATE_PROFILE_CREATE_ERROR",
              createError
            );
            setMsg("Could not prepare your registration. Redirecting…");

            window.setTimeout(() => hardRedirect("/"), 1000);
            return;
          }

          profile = {
            id: user.id,
            email: user.email ?? null,
            role: null,
            requested_role: null,
            is_vendor: false,
            approval_status: null,
            account_status: "active",
            full_name: null,
            phone: null,
            city: null,
            state: null,
            onboarding_version: null,
            onboarding_completed: false,
            portal_use_reason: null,
            role_display_label: null,
          };
        }

        if (!profile.email && user.email) {
          const emailPatchResult = await supabase
            .from("profiles")
            .update({ email: user.email })
            .eq("id", user.id);

          if (emailPatchResult.error) {
            console.error(
              "POST_LOGIN_STATE_EMAIL_PATCH_ERROR",
              emailPatchResult.error
            );
          }
        }

        const role = normalizeRole(profile.role);
        const businessRole = isBusinessRole(role);

        if (!profile.requested_role && role) {
          const rolePatchResult = await supabase
            .from("profiles")
            .update({ requested_role: role })
            .eq("id", user.id);

          if (rolePatchResult.error) {
            console.error(
              "POST_LOGIN_STATE_ROLE_PATCH_ERROR",
              rolePatchResult.error
            );
          }
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

        let businessProfile: any = null;

        if (businessRole) {
          setMsg("Checking your business workspace setup…");

          const businessProfileResult = await supabase
            .from("business_profiles")
            .select(
              [
                "nature_of_business",
                "is_complete",
                "registration_complete",
                "business_profile_complete",
                "eligible_free",
                "location_verification_status",
                "subscription_plan",
                "subscription_status",
              ].join(",")
            )
            .eq("user_id", user.id)
            .maybeSingle();

          if (businessProfileResult.error) {
            console.error(
              "POST_LOGIN_STATE_BUSINESS_LOOKUP_ERROR",
              businessProfileResult.error
            );
          }

          businessProfile = businessProfileResult.data ?? null;
        }

        const hasVendorCapabilities =
          Array.isArray(businessProfile?.nature_of_business) &&
          businessProfile.nature_of_business.length > 0;

        const locationVerified =
          String(businessProfile?.location_verification_status || "")
            .trim()
            .toLowerCase() === "verified";

        const stateInput: RegistrationStateInput = {
          role,
          accountStatus: profile.account_status,
          basicComplete,
          onboardingReady,
          isBusinessRole: businessRole,
          hasVendorCapabilities,
          businessProfileComplete:
            businessProfile?.is_complete === true ||
            businessProfile?.business_profile_complete === true,
          registrationComplete:
            businessProfile?.registration_complete === true,
          locationVerified,
          eligibleFree: businessProfile?.eligible_free ?? null,
        };

        const registrationState = resolveRegistrationState(stateInput);

        console.info("POST_LOGIN_REGISTRATION_STATE", {
          state: registrationState.state,
          reason: registrationState.reason,
          role,
          userId: user.id,
        });

        switch (registrationState.state) {
          case "MASTER_ADMIN": {
            hardRedirect(next || "/admin/dashboard");
            return;
          }

          case "ACCOUNT_BLOCKED": {
            hardRedirect("/auth/account-disabled");
            return;
          }

          case "ROLE_SELECTION_REQUIRED": {
            const query = registrationQuery({ next });
            hardRedirect(`/auth/register-role${query ? `?${query}` : ""}`);
            return;
          }

          case "BASIC_PROFILE_REQUIRED":
          case "PROFILE_SETUP_REQUIRED": {
            const query = registrationQuery({ next, role });
            hardRedirect(`/auth/register-role${query ? `?${query}` : ""}`);
            return;
          }

          case "BUSINESS_PROFILE_REQUIRED": {
            const query = registrationQuery({
              next: next || "/dashboard/workspace",
              role,
              business: true,
            });

            hardRedirect(`/onboarding/business?${query}`);
            return;
          }

          case "BUSINESS_PROGRESSIVE_READY": {
            hardRedirect(next || "/dashboard/workspace");
            return;
          }

          case "GROWTH_PLAN_REQUIRED": {
            hardRedirect(
              "/dashboard/subscription?reason=district_free_not_eligible"
            );
            return;
          }

          case "ESSENTIAL_ACTIVE":
          case "READY": {
            break;
          }

          default: {
            const exhaustiveCheck: never = registrationState.state;
            console.error(
              "POST_LOGIN_UNKNOWN_REGISTRATION_STATE",
              exhaustiveCheck
            );
            hardRedirect("/");
            return;
          }
        }

        setMsg("Preparing your unified workspace…");

        let redirectTo = next || "/dashboard/workspace";

        try {
          const canonicalIdentity = await Promise.race([
            resolveCanonicalIdentity(
              supabase,
              user
            ),
            new Promise<never>((_, reject) =>
              setTimeout(
                () =>
                  reject(
                    new Error(
                      "Canonical identity routing timed out after 5000ms"
                    )
                  ),
                5000
              )
            ),
          ]);

          if (!alive) return;

          redirectTo =
            next ||
            canonicalIdentity.workspaceProjection.defaultPath;
        } catch (identityError) {
          console.error(
            "POST_LOGIN_CANONICAL_IDENTITY_FALLBACK",
            identityError
          );

          // Registration gating already succeeded.
          // Fail safely into the unified workspace rather than
          // inventing another role-based destination.
          redirectTo = next || "/dashboard/workspace";
        }

        hardRedirect(redirectTo);
      } catch (error: any) {
        console.error("POST_LOGIN_STATE_ROUTER_FAIL", error);

        if (!alive) return;

        const next = safeNextPath(searchParams.get("next"));
        setMsg(
          `Could not complete login routing: ${
            error?.message || "Unknown error"
          }`
        );

        window.setTimeout(() => {
          hardRedirect(next || "/");
        }, 1000);
      }
    }

    runPostLogin();

    return () => {
      alive = false;
    };
  }, [searchParams, supabase]);

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
