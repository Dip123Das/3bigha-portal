"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type SessionLite = {
  user: { email?: string | null; id?: string | null };
} | null;

type ProfileLite = {
  role?: string | null;
  is_vendor?: boolean | null;
  onboarding_version?: number | null;
  onboarding_completed?: boolean | null;
  portal_use_reason?: string | null;
  role_display_label?: string | null;
};

function shortEmail(email?: string | null) {
  if (!email) return "Signed in";
  const [name, domain] = email.split("@");
  if (!domain) return email;
  const shortName = name.length > 7 ? `${name.slice(0, 7)}…` : name;
  return `${shortName}@${domain}`;
}

function prettyRole(profile?: ProfileLite | null) {
  const display = String(profile?.role_display_label ?? "").trim();
  if (display) return display;

  const r = String(profile?.role ?? "").trim().toLowerCase();

  if (r === "master_admin") return "Master Admin";
  if (r === "blog_admin") return "Blog Admin";
  if (r === "blogger") return "Blogger / Author";
  if (r === "buyer") return "Buyer";
  if (r === "builder") return "Builder / Developer";
  if (r === "hub_vendor") return "Vendor Hub";
  if (r === "vendor") return "Vendor";

  if (profile?.is_vendor === true) return "Vendor";

  return "";
}

function isBusinessRole(role?: string | null) {
  const r = String(role ?? "").trim().toLowerCase();
  return r === "vendor" || r === "builder" || r === "hub_vendor" || r === "blogger";
}

export default function AuthButtons() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [session, setSession] = useState<SessionLite>(null);
  const [roleLabel, setRoleLabel] = useState<string>("");
  const [loading, setLoading] = useState(true);

  async function loadProfileAndGuard(userId: string | null | undefined) {
    if (!userId) {
      setRoleLabel("");
      return;
    }

    try {
      const roleRes = await Promise.race([
        supabase
          .from("profiles")
          .select(
            "role,is_vendor,onboarding_version,onboarding_completed,portal_use_reason,role_display_label"
          )
          .eq("id", userId)
          .maybeSingle(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Role lookup timed out")), 4000)
        ),
      ]);

      const profile = ((roleRes as any)?.data ?? null) as ProfileLite | null;

      setRoleLabel(prettyRole(profile));

      const onboardingReady =
        profile?.onboarding_version === 2 &&
        profile?.onboarding_completed === true &&
        !!String(profile?.portal_use_reason ?? "").trim() &&
        !!String(profile?.role_display_label ?? "").trim();

      const currentPath = pathname || "/";
      const alreadyOnRegister =
        currentPath.startsWith("/auth/register-role") ||
        currentPath.startsWith("/onboarding/business") ||
        currentPath.startsWith("/auth/callback") ||
        currentPath.startsWith("/auth/post-login") ||
        currentPath.startsWith("/login");

      if (!alreadyOnRegister && !onboardingReady) {
        const role = String(profile?.role ?? "").trim().toLowerCase();

        if (isBusinessRole(role)) {
          const qs = new URLSearchParams();
          qs.set("returnTo", currentPath || "/dashboard");
          if (role) qs.set("role", role);
          router.replace(`/onboarding/business?${qs.toString()}`);
          return;
        }

        const qs = new URLSearchParams();
        qs.set("next", currentPath || "/dashboard");
        if (role) qs.set("role", role);
        router.replace(`/auth/register-role?${qs.toString()}`);
      }
    } catch {
      setRoleLabel("");
    }
  }

  async function syncAuthState() {
    try {
      const sessionRes = await Promise.race([
        supabase.auth.getSession(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Session lookup timed out")), 4000)
        ),
      ]);

      const s = (sessionRes as any)?.data?.session ?? null;

      if (s?.user?.id) {
        setSession({
          user: {
            email: s.user.email ?? null,
            id: s.user.id ?? null,
          },
        });
        setLoading(false);
        await loadProfileAndGuard(s.user.id);
        return;
      }

      const userRes = await Promise.race([
        supabase.auth.getUser(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("User lookup timed out")), 4000)
        ),
      ]);

      const user = (userRes as any)?.data?.user ?? null;

      if (user?.id) {
        setSession({
          user: {
            email: user.email ?? null,
            id: user.id ?? null,
          },
        });
        setLoading(false);
        await loadProfileAndGuard(user.id);
        return;
      }

      setSession(null);
      setRoleLabel("");
      setLoading(false);
    } catch {
      setSession(null);
      setRoleLabel("");
      setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;

    const guardedSync = async () => {
      if (!alive) return;
      await syncAuthState();
    };

    guardedSync();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      if (!alive) return;

      if (s?.user?.id) {
        setSession({
          user: {
            email: s.user.email ?? null,
            id: s.user.id ?? null,
          },
        });
        setLoading(false);
        await loadProfileAndGuard(s.user.id);
      } else {
        setSession(null);
        setRoleLabel("");
        setLoading(false);
      }

      router.refresh();
    });

    const onFocus = () => {
      guardedSync();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        guardedSync();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router, supabase, pathname]);

  async function handleLogout() {
    try {
      setSession(null);
      setRoleLabel("");
      setLoading(false);
      await supabase.auth.signOut();
    } finally {
      router.push("/");
      router.refresh();
    }
  }

  if (loading) {
    return (
      <span className="topBtn topBtnGhost" style={{ opacity: 0.75 }}>
        Account
      </span>
    );
  }

  if (!session) {
    return (
      <Link className="topBtn topBtnGhost" href="/login">
        Login
      </Link>
    );
  }

  const email = session.user.email ?? null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <span
        title={email ?? undefined}
        style={{
          fontSize: 12,
          fontWeight: 800,
          color: "#334155",
          background: "rgba(15, 23, 42, 0.06)",
          padding: "6px 10px",
          borderRadius: 999,
          border: "1px solid rgba(15, 23, 42, 0.10)",
          maxWidth: 220,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {shortEmail(email)}
      </span>

      {roleLabel ? (
        <span
          style={{
            fontSize: 12,
            fontWeight: 900,
            color: "#1d4ed8",
            background: "#eff6ff",
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid #bfdbfe",
            whiteSpace: "nowrap",
          }}
        >
          {roleLabel}
        </span>
      ) : null}

      <button
        type="button"
        className="topBtn topBtnGhost"
        onClick={handleLogout}
        title={email ?? undefined}
      >
        Logout
      </button>
    </div>
  );
}