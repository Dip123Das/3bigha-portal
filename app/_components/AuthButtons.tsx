"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type SessionLite = {
  user: { email?: string | null; id?: string | null };
} | null;

function shortEmail(email?: string | null) {
  if (!email) return "Signed in";
  const [name, domain] = email.split("@");
  if (!domain) return email;
  const shortName = name.length > 7 ? `${name.slice(0, 7)}…` : name;
  return `${shortName}@${domain}`;
}

function prettyRole(role?: string | null, isVendor?: boolean | null) {
  const r = String(role ?? "").trim().toLowerCase();

  if (r === "master_admin") return "Master Admin";
  if (r === "blog_admin") return "Blog Admin";
  if (r === "blogger") return "Blogger";
  if (r === "vendor") return "Vendor";
  if (r === "buyer") return "Buyer";
  if (r === "builder") return "Builder";
  if (r === "hub_vendor") return "HUB Vendor";
  if (isVendor === true) return "Vendor";

  return "";
}

export default function AuthButtons() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [session, setSession] = useState<SessionLite>(null);
  const [roleLabel, setRoleLabel] = useState<string>("");
  const [loading, setLoading] = useState(true);

  async function loadRole(userId: string | null | undefined) {
    if (!userId) {
      setRoleLabel("");
      return;
    }

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role,is_vendor")
        .eq("id", userId)
        .maybeSingle();

      setRoleLabel(prettyRole((profile as any)?.role, (profile as any)?.is_vendor));
    } catch {
      setRoleLabel("");
    }
  }

  async function syncAuthState() {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const s = sessionData.session ?? null;

      if (s?.user?.id) {
        setSession({
          user: {
            email: s.user.email ?? null,
            id: s.user.id ?? null,
          },
        });
        await loadRole(s.user.id);
        setLoading(false);
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (!userError && userData.user?.id) {
        setSession({
          user: {
            email: userData.user.email ?? null,
            id: userData.user.id ?? null,
          },
        });
        await loadRole(userData.user.id);
        setLoading(false);
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
        await loadRole(s.user.id);
      } else {
        setSession(null);
        setRoleLabel("");
      }

      setLoading(false);
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
  }, [router, supabase]);

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