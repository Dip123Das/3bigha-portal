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

function prettyRole(profile?: ProfileLite | null): string {
  const r = String(profile?.role ?? "").trim().toLowerCase();

  if (r === "master_admin") return "Master Admin";
  if (r === "blog_admin") return "Blog Admin";

  if (
    r === "vendor" ||
    r === "builder" ||
    r === "hub_vendor"
  ) {
    return "Vendor";
  }

  if (r === "banker") {
    return "Banker";
  }

  return "Buyer";
}

function dashboardHrefFor(profile?: ProfileLite | null): string {
  const r = String(profile?.role ?? "").trim().toLowerCase();
  const reason = String(profile?.portal_use_reason ?? "").trim().toLowerCase();

  if (r === "master_admin") return "/admin/dashboard";
  if (r === "blog_admin") return "/admin/blog";

  if (
    r === "vendor" ||
    r === "builder" ||
    r === "hub_vendor" ||
    profile?.is_vendor === true
  ) {
    if (reason === "invest_in_opportunities") return "/dashboard/investor";
    return "/dashboard/vendor";
  }

  if (r === "blogger") return "/blog/my";
  if (r === "buyer") return "/dashboard/buyer";

  return "/dashboard/buyer";
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
  const [dashboardHref, setDashboardHref] = useState<string>("/dashboard");
  const [loading, setLoading] = useState(true);

  async function loadProfileAndGuard(userId: string | null | undefined) {
    if (!userId) {
      setRoleLabel("");
      setDashboardHref("/dashboard");
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
      setDashboardHref(dashboardHrefFor(profile));

      const onboardingReady =
        profile?.onboarding_version === 2 &&
        profile?.onboarding_completed === true;

      const currentPath = pathname || "/";
      const alreadyOnRegister =
        currentPath.startsWith("/auth/register-role") ||
        currentPath.startsWith("/onboarding/business") ||
        currentPath.startsWith("/auth/callback") ||
        currentPath.startsWith("/auth/post-login") ||
        currentPath.startsWith("/login");

      if (!alreadyOnRegister && !onboardingReady) {
        const role = String(profile?.role ?? "").trim().toLowerCase();

        // Master admin is a system-level role.
        if (role === "master_admin") {
          return;
        }

        if (isBusinessRole(role)) {
          // Header must not force business users back to onboarding.
          // Vendor onboarding is progressive; dashboard pages handle their own gates.
          return;
        }

        const qs = new URLSearchParams();
        qs.set("next", currentPath || "/dashboard");
        if (role) qs.set("role", role);
        router.replace(`/auth/register-role?${qs.toString()}`);
      }
    } catch {
      setRoleLabel("");
      setDashboardHref("/dashboard");
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
      setDashboardHref("/dashboard");
      setLoading(false);
    } catch {
      setSession(null);
      setRoleLabel("");
      setDashboardHref("/dashboard");
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
        setDashboardHref("/dashboard");
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
      setDashboardHref("/dashboard");
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
    <>
      <Link
        href={dashboardHref}
        className="topBtn topBtnGhost mobileAccountMainBtn"
        title={email ?? undefined}
      >
        {roleLabel || "Buyer"}
      </Link>

      <span
        className="topBtn topBtnGhost desktopAccountBtn"
        title={email ?? undefined}
      >
        {shortEmail(email)}
      </span>

      <Link
        href={dashboardHref}
        className="topBtn topBtnGhost desktopAccountBtn"
      >
        My Dashboard
      </Link>

      <button
        type="button"
        className="topBtn topBtnGhost desktopAccountBtn"
        onClick={handleLogout}
        title={email ?? undefined}
      >
        Logout
      </button>
    </>
  );

}