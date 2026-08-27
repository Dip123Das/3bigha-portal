"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import {
  resolveCanonicalIdentity,
} from "@/lib/identity/resolveCanonicalIdentity";

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

  const accountMenuRef =
    useRef<HTMLDetailsElement | null>(null);

  const [accountMenuOpen, setAccountMenuOpen] =
    useState(false);

  const [accountMenuPosition, setAccountMenuPosition] =
    useState({
      top: 72,
      right: 12,
    });

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

      /*
       * CRS-6B2
       *
       * Header destination and displayed constitutional identity
       * come from the same Canonical Identity projection used by
       * post-login and /dashboard.
       *
       * profiles.role remains available below only for the
       * registration-compatibility gate.
       */
      try {
        const canonicalIdentity =
          await resolveCanonicalIdentity(
            supabase,
            {
              id: userId,
              user_metadata: {},
            }
          );

        setRoleLabel(
          canonicalIdentity.primaryRole ||
          "3Bigha Member"
        );

        setDashboardHref(
          canonicalIdentity.workspaceProjection.defaultPath ||
          "/dashboard/workspace"
        );
      } catch (identityError) {
        console.warn(
          "AUTH_BUTTONS_CANONICAL_IDENTITY_FALLBACK",
          identityError
        );

        setRoleLabel(prettyRole(profile));
        setDashboardHref("/dashboard");
      }

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
    setAccountMenuOpen(false);

    if (accountMenuRef.current) {
      accountMenuRef.current.open = false;
    }

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

  function handleAccountMenuToggle(
    event: React.SyntheticEvent<HTMLDetailsElement>,
  ) {
    const details = event.currentTarget;
    const isOpen = details.open;

    setAccountMenuOpen(isOpen);

    if (!isOpen) {
      return;
    }

    const summary =
      details.querySelector("summary");

    if (!(summary instanceof HTMLElement)) {
      return;
    }

    const rect =
      summary.getBoundingClientRect();

    setAccountMenuPosition({
      top: Math.max(
        12,
        Math.round(rect.bottom + 8),
      ),
      right: Math.max(
        12,
        Math.round(
          window.innerWidth - rect.right,
        ),
      ),
    });
  }

  useEffect(() => {
    if (!accountMenuOpen) {
      return;
    }

    function closeAccountMenu(
      event: MouseEvent,
    ) {
      const target =
        event.target as Node | null;

      const clickedTrigger =
        Boolean(
          target &&
          accountMenuRef.current?.contains(
            target,
          ),
        );

      const portal =
        document.querySelector(
          "[data-account-menu-portal='true']",
        );

      const clickedPortal =
        Boolean(
          target &&
          portal?.contains(target),
        );

      if (
        clickedTrigger ||
        clickedPortal
      ) {
        return;
      }

      setAccountMenuOpen(false);

      if (accountMenuRef.current) {
        accountMenuRef.current.open =
          false;
      }
    }

    function closeOnEscape(
      event: KeyboardEvent,
    ) {
      if (event.key !== "Escape") {
        return;
      }

      setAccountMenuOpen(false);

      if (accountMenuRef.current) {
        accountMenuRef.current.open =
          false;
      }
    }

    document.addEventListener(
      "mousedown",
      closeAccountMenu,
    );

    document.addEventListener(
      "keydown",
      closeOnEscape,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        closeAccountMenu,
      );

      document.removeEventListener(
        "keydown",
        closeOnEscape,
      );
    };
  }, [accountMenuOpen]);

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
  const displayRole =
    roleLabel || "3Bigha Member";
  const displayDashboardHref =
    dashboardHref || "/dashboard";

  return (
    <>
      <details
        ref={accountMenuRef}
        className="mobileAccountMenu"
        onToggle={
          handleAccountMenuToggle
        }
      >
        <summary
          className="topBtn topBtnGhost mobileAccountMainBtn"
          title={email ?? undefined}
        >
          {displayRole}{" "}
          <span aria-hidden="true">
            ▾
          </span>
        </summary>
      </details>

      {accountMenuOpen &&
      typeof document !== "undefined"
        ? createPortal(
            <div
              className="mobileAccountPanelPortal"
              data-account-menu-portal="true"
              role="dialog"
              aria-label="Account menu"
              style={{
                top:
                  accountMenuPosition.top,
                right:
                  accountMenuPosition.right,
              }}
            >
              <div className="mobileAccountPanelRole">
                {displayRole}
              </div>

              <div className="mobileAccountPanelEmail">
                {shortEmail(email)}
              </div>

              <Link
                href={displayDashboardHref}
                onClick={() => {
                  setAccountMenuOpen(
                    false,
                  );

                  if (
                    accountMenuRef.current
                  ) {
                    accountMenuRef.current.open =
                      false;
                  }
                }}
              >
                <span>My Dashboard</span>
                <span aria-hidden="true">
                  →
                </span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
              >
                <span>Logout</span>
                <span aria-hidden="true">
                  →
                </span>
              </button>
            </div>,
            document.body,
          )
        : null}

      <span
        className="topBtn topBtnGhost desktopAccountBtn desktopHeaderOnly"
        title={email ?? undefined}
      >
        {shortEmail(email)}
      </span>

      <Link
        href={displayDashboardHref}
        className="topBtn topBtnGhost desktopAccountBtn desktopHeaderOnly"
      >
        My Dashboard
      </Link>

      <button
        type="button"
        className="topBtn topBtnGhost desktopAccountBtn desktopHeaderOnly"
        onClick={handleLogout}
        title={email ?? undefined}
      >
        Logout
      </button>
    </>
  );

}
