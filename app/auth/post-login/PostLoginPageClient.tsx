"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { resolveAccessForUser, getDefaultPostLoginPath } from "@/lib/access/resolveAccess";

function safeNextPath(raw: string | null) {
  if (!raw) return "";
  if (!raw.startsWith("/")) return "";
  if (raw.startsWith("//")) return "";
  return raw;
}

function hardRedirect(path: string) {
  if (typeof window !== "undefined") {
    window.location.replace(path);
  }
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

        console.log("POST_LOGIN_V6_START", { next });

        setMsg("Checking your session…");

        const sessionRes = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("Post-login session lookup timed out after 4000ms")),
              4000
            )
          ),
        ]);

        if (!alive) return;

        const session = (sessionRes as any)?.data?.session ?? null;
        const user = session?.user ?? null;

        console.log("POST_LOGIN_V6_SESSION", {
          hasSession: !!session,
          userId: user?.id ?? null,
          email: user?.email ?? null,
        });

        if (!user?.id) {
          setMsg("No active session found. Redirecting to login…");
          setTimeout(() => {
            hardRedirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
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
                "is_profile_complete",
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
          console.error("POST_LOGIN_V6_PROFILE_LOOKUP_ERROR", profileError);
        }

        // Create minimal profile if missing.
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
                approval_status: "active",
                is_profile_complete: false,
              },
              { onConflict: "id" }
            ),
            new Promise<never>((_, reject) =>
              setTimeout(
                () => reject(new Error("Profile creation timed out after 4000ms")),
                4000
              )
            ),
          ]);

          const upsertError = (upsertRes as any)?.error ?? null;

          if (upsertError) {
            console.error("POST_LOGIN_V6_PROFILE_CREATE_ERROR", upsertError);
            setMsg("Could not prepare your registration. Redirecting…");
            setTimeout(() => {
              hardRedirect("/");
            }, 1000);
            return;
          }

          hardRedirect(`/auth/register-role${next ? `?next=${encodeURIComponent(next)}` : ""}`);
          return;
        }

        // Repair missing email if needed.
        if (!profile.email && user.email) {
          await supabase.from("profiles").update({ email: user.email }).eq("id", user.id);
        }

        const role = normalizeRole(profile.role);
        const requestedRole = normalizeRole(profile.requested_role);

        // If role is not chosen, go to onboarding.
        if (!role) {
          hardRedirect(`/auth/register-role${next ? `?next=${encodeURIComponent(next)}` : ""}`);
          return;
        }

        const phone = profile.phone ?? null;
        const fullName = profile.full_name ?? null;
        const city = profile.city ?? null;
        const state = profile.state ?? null;

        const basicComplete =
          hasValue(fullName) &&
          hasValue(phone) &&
          hasValue(city) &&
          hasValue(state);

        const patch: Record<string, any> = {};

        if (profile.approval_status !== "active") {
          patch.approval_status = "active";
        }

        if (!profile.requested_role && role) {
          patch.requested_role = role;
        }

        let isComplete = false;

        if (isBusinessRole(role)) {
          const completenessRes = await Promise.race([
            supabase
              .from("v_vendor_profile_completeness")
              .select("registration_complete,is_complete,completion_score,missing_fields")
              .eq("user_id", user.id)
              .maybeSingle(),
            new Promise<never>((_, reject) =>
              setTimeout(
                () => reject(new Error("Business completeness lookup timed out after 4000ms")),
                4000
              )
            ),
          ]);

          if (!alive) return;

          const completeness = (completenessRes as any)?.data ?? null;
          const completenessError = (completenessRes as any)?.error ?? null;

          if (completenessError) {
            console.error("POST_LOGIN_V6_COMPLETENESS_LOOKUP_ERROR", completenessError);
          }

          const registrationComplete = !!completeness?.registration_complete;
          const businessIsComplete = !!completeness?.is_complete;

          isComplete = basicComplete && registrationComplete && businessIsComplete;

          if (isComplete && !profile.is_profile_complete) {
            patch.is_profile_complete = true;
          }

          if (Object.keys(patch).length > 0) {
            const patchRes = await supabase.from("profiles").update(patch).eq("id", user.id);
            if ((patchRes as any)?.error) {
              console.error("POST_LOGIN_V6_PROFILE_PATCH_ERROR", (patchRes as any).error);
            }
          }

          if (!isComplete) {
            const qs = new URLSearchParams();
            qs.set("returnTo", next || "/dashboard");
            if (role) qs.set("role", role);
            if (requestedRole && !qs.get("role")) qs.set("role", requestedRole);

            hardRedirect(`/onboarding/business?${qs.toString()}`);
            return;
          }
        } else {
          isComplete = basicComplete;

          if (isComplete && !profile.is_profile_complete) {
            patch.is_profile_complete = true;
          }

          if (Object.keys(patch).length > 0) {
            const patchRes = await supabase.from("profiles").update(patch).eq("id", user.id);
            if ((patchRes as any)?.error) {
              console.error("POST_LOGIN_V6_PROFILE_PATCH_ERROR", (patchRes as any).error);
            }
          }

          if (!isComplete) {
            const onboardingRole = role || requestedRole;
            const qs = new URLSearchParams();
            if (next) qs.set("next", next);
            if (onboardingRole) qs.set("role", onboardingRole);

            hardRedirect(`/auth/register-role${qs.toString() ? `?${qs.toString()}` : ""}`);
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
                () => reject(new Error("Access resolution timed out after 3000ms")),
                3000
              )
            ),
          ]);

          if (!alive) return;

          redirectTo = next || getDefaultPostLoginPath(access);
        } catch (accessErr) {
          console.error("POST_LOGIN_V6_ACCESS_FALLBACK", accessErr);
          redirectTo = next || "/";
        }

        console.log("POST_LOGIN_V6_REDIRECT", { redirectTo });

        hardRedirect(redirectTo);
      } catch (e: any) {
        console.error("POST_LOGIN_V6_FAIL", e);

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
          borderRadius: 16,
          padding: 20,
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